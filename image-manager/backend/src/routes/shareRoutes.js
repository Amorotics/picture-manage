const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const { ShareLink, Image } = require('../models');

const router = express.Router();

// 创建分享链接
router.post('/', async (req, res, next) => {
  try {
    const {
      imageId,
      imageIds,
      shareType = 'single',
      title,
      description,
      password,
      expiresIn, // 过期时间（小时）
      maxViews,
      allowDownload = true
    } = req.body;

    // 验证分享类型和图片ID
    if (shareType === 'single' && !imageId) {
      return res.status(400).json({
        success: false,
        message: '单张图片分享需要提供图片ID'
      });
    }

    if ((shareType === 'batch' || shareType === 'gallery') && (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: '批量分享需要提供图片ID列表'
      });
    }

    // 验证图片是否存在且可访问
    let images = [];
    if (shareType === 'single') {
      const image = await Image.findOne({
        where: { id: imageId, is_public: true }
      });
      if (!image) {
        return res.status(404).json({
          success: false,
          message: '图片不存在或不可访问'
        });
      }
      images = [image];
    } else {
      images = await Image.findAll({
        where: {
          id: { [Op.in]: imageIds },
          is_public: true
        }
      });
      if (images.length === 0) {
        return res.status(404).json({
          success: false,
          message: '没有找到可分享的图片'
        });
      }
    }

    // 计算过期时间
    let expiresAt = null;
    if (expiresIn && expiresIn > 0) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);
    }

    // 加密密码
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 生成唯一令牌
    const token = uuidv4().replace(/-/g, '');

    // 创建分享链接
    const shareLink = await ShareLink.create({
      token,
      image_id: shareType === 'single' ? imageId : null,
      image_ids: shareType !== 'single' ? imageIds : null,
      share_type: shareType,
      title: title || (shareType === 'single' ? images[0].filename : `${images.length}张图片`),
      description,
      password: hashedPassword,
      expires_at: expiresAt,
      max_views: maxViews,
      allow_download: allowDownload,
      creator_ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: {
        id: shareLink.id,
        token: shareLink.token,
        shareUrl: shareLink.getShareUrl(),
        shareType: shareLink.share_type,
        title: shareLink.title,
        description: shareLink.description,
        hasPassword: !!password,
        expiresAt: shareLink.expires_at,
        maxViews: shareLink.max_views,
        allowDownload: shareLink.allow_download,
        imageCount: images.length
      },
      message: '分享链接创建成功'
    });
  } catch (error) {
    next(error);
  }
});

// 访问分享链接
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const shareLink = await ShareLink.findOne({
      where: { token }
    });

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: '分享链接不存在'
      });
    }

    // 检查链接是否可访问
    if (!shareLink.canAccess()) {
      let message = '分享链接不可访问';
      if (shareLink.isExpired()) {
        message = '分享链接已过期';
      } else if (shareLink.isViewLimitReached()) {
        message = '分享链接访问次数已达上限';
      } else if (!shareLink.is_active) {
        message = '分享链接已被禁用';
      }
      
      return res.status(403).json({
        success: false,
        message
      });
    }

    // 验证密码
    if (shareLink.password) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: '需要密码访问',
          requirePassword: true
        });
      }

      const isPasswordValid = await bcrypt.compare(password, shareLink.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    // 获取关联的图片
    let images = [];
    if (shareLink.share_type === 'single' && shareLink.image_id) {
      const image = await Image.findOne({
        where: { id: shareLink.image_id, is_public: true }
      });
      if (image) {
        images = [image];
      }
    } else if (shareLink.image_ids && shareLink.image_ids.length > 0) {
      images = await Image.findAll({
        where: {
          id: { [Op.in]: shareLink.image_ids },
          is_public: true
        },
        order: [['created_at', 'DESC']]
      });
    }

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: '分享的图片不存在或已被删除'
      });
    }

    // 记录访问
    await shareLink.incrementViewCount();
    await shareLink.logAccess(req.ip, req.get('User-Agent'));

    // 增加图片查看次数
    for (const image of images) {
      await image.incrementViewCount();
    }

    res.json({
      success: true,
      data: {
        shareInfo: {
          id: shareLink.id,
          title: shareLink.title,
          description: shareLink.description,
          shareType: shareLink.share_type,
          allowDownload: shareLink.allow_download,
          viewCount: shareLink.view_count,
          downloadCount: shareLink.download_count,
          createdAt: shareLink.created_at
        },
        images: images.map(img => img.toPublicJSON())
      }
    });
  } catch (error) {
    next(error);
  }
});

// 下载分享的图片
router.get('/:token/download', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, imageId } = req.query;

    const shareLink = await ShareLink.findOne({
      where: { token }
    });

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: '分享链接不存在'
      });
    }

    if (!shareLink.canAccess()) {
      return res.status(403).json({
        success: false,
        message: '分享链接不可访问'
      });
    }

    if (!shareLink.allow_download) {
      return res.status(403).json({
        success: false,
        message: '该分享不允许下载'
      });
    }

    // 验证密码
    if (shareLink.password) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: '需要密码访问'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, shareLink.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    // 获取要下载的图片
    let images = [];
    if (shareLink.share_type === 'single' && shareLink.image_id) {
      const image = await Image.findOne({
        where: { id: shareLink.image_id, is_public: true }
      });
      if (image) {
        images = [image];
      }
    } else if (imageId) {
      // 下载特定图片
      const image = await Image.findOne({
        where: {
          id: imageId,
          id: { [Op.in]: shareLink.image_ids || [] },
          is_public: true
        }
      });
      if (image) {
        images = [image];
      }
    } else {
      // 下载所有图片
      images = await Image.findAll({
        where: {
          id: { [Op.in]: shareLink.image_ids || [] },
          is_public: true
        }
      });
    }

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到可下载的图片'
      });
    }

    // 记录下载
    await shareLink.incrementDownloadCount();

    if (images.length === 1) {
      // 单张图片直接下载
      const image = images[0];
      await image.incrementDownloadCount();
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(image.filename)}"`);
      res.setHeader('Content-Type', image.mime_type);
      res.sendFile(path.resolve(image.path));
    } else {
      // 多张图片打包下载
      const archiver = require('archiver');
      const path = require('path');
      const zipFilename = `${shareLink.title || 'images'}-${Date.now()}.zip`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);
      res.setHeader('Content-Type', 'application/zip');

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      for (const image of images) {
        try {
          await fs.access(image.path);
          archive.file(image.path, { name: image.filename });
          await image.incrementDownloadCount();
        } catch (error) {
          console.error(`添加文件到ZIP失败: ${image.filename}`, error);
        }
      }

      await archive.finalize();
    }
  } catch (error) {
    next(error);
  }
});

// 获取分享链接列表（管理功能）
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: shareLinks } = await ShareLink.findAndCountAll({
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['password', 'access_log'] }
    });

    res.json({
      success: true,
      data: {
        shareLinks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 删除分享链接
router.delete('/:id', async (req, res, next) => {
  try {
    const shareLink = await ShareLink.findByPk(req.params.id);
    
    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: '分享链接不存在'
      });
    }

    await shareLink.destroy();

    res.json({
      success: true,
      message: '分享链接删除成功'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
