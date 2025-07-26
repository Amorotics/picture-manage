const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const { Image, Category } = require('../models');
const imageService = require('../services/imageService');

const router = express.Router();

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // 确保正确处理中文文件名
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(originalName)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型。仅支持 JPEG、PNG、WebP、TIFF 和 GIF 格式。'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // 最多10个文件
  }
});

// 获取所有图片列表
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search,
      mimeType,
      categoryId,
      tags
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { is_public: true };

    // 搜索功能
    if (search) {
      where[Op.or] = [
        { filename: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // 按文件类型过滤
    if (mimeType) {
      where.mime_type = mimeType;
    }

    // 按分类过滤
    if (categoryId) {
      where.category_id = categoryId;
    }

    // 按标签过滤
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      where.tags = {
        [Op.overlap]: tagArray
      };
    }

    const { count, rows: images } = await Image.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['upload_ip'] }
    });

    res.json({
      success: true,
      data: {
        images: images.map(img => img.toPublicJSON()),
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

// 上传图片
router.post('/upload', upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片文件'
      });
    }

    const { description, tags, categoryId } = req.body;
    const uploadedImages = [];
    const errors = [];

    // 处理标签
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch (e) {
        parsedTags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : [];
      }
    }

    for (const file of req.files) {
      try {
        // 获取图片元数据
        const metadata = await sharp(file.path).metadata();

        // 生成缩略图
        const thumbnailFilename = await imageService.generateThumbnail(file.path);

        // 创建数据库记录
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const image = await Image.create({
          filename: originalName,
          stored_filename: file.filename,
          mime_type: file.mimetype,
          size: file.size,
          width: metadata.width,
          height: metadata.height,
          path: file.path,
          thumbnail_path: thumbnailFilename,
          description: description || null,
          tags: parsedTags,
          category_id: categoryId || null,
          metadata: {
            format: metadata.format,
            density: metadata.density,
            hasAlpha: metadata.hasAlpha,
            orientation: metadata.orientation
          },
          upload_ip: req.ip
        });

        // 包含分类信息
        const imageWithCategory = await Image.findByPk(image.id, {
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'color']
            }
          ]
        });

        uploadedImages.push(imageWithCategory.toPublicJSON());
      } catch (error) {
        console.error(`处理文件 ${file.originalname} 时出错:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });

        // 清理失败的文件
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('清理文件失败:', unlinkError);
        }
      }
    }

    res.status(uploadedImages.length > 0 ? 201 : 400).json({
      success: uploadedImages.length > 0,
      data: {
        uploaded: uploadedImages,
        errors
      },
      message: `成功上传 ${uploadedImages.length} 张图片${errors.length > 0 ? `，${errors.length} 张失败` : ''}`
    });
  } catch (error) {
    next(error);
  }
});

// 获取单张图片详情
router.get('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'description']
        }
      ]
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    if (!image.is_public) {
      return res.status(403).json({
        success: false,
        message: '图片不可访问'
      });
    }

    // 增加查看次数
    await image.incrementViewCount();

    res.json({
      success: true,
      data: image.toPublicJSON()
    });
  } catch (error) {
    next(error);
  }
});

// 下载单张图片
router.get('/:id/download', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    if (!image.is_public) {
      return res.status(403).json({
        success: false,
        message: '图片不可访问'
      });
    }

    // 检查文件是否存在
    try {
      await fs.access(image.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: '图片文件不存在'
      });
    }

    // 增加下载次数
    await image.incrementDownloadCount();

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(image.filename)}"`);
    res.setHeader('Content-Type', image.mime_type);

    // 发送文件
    res.sendFile(path.resolve(image.path));
  } catch (error) {
    next(error);
  }
});

// 批量下载图片（ZIP）
router.post('/download-batch', async (req, res, next) => {
  try {
    const { imageIds } = req.body;
    
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要下载的图片ID列表'
      });
    }

    if (imageIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: '一次最多只能下载50张图片'
      });
    }

    const images = await Image.findAll({
      where: {
        id: imageIds,
        is_public: true
      }
    });

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到可下载的图片'
      });
    }

    // 设置响应头
    const zipFilename = `images-${Date.now()}.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Type', 'application/zip');

    // 创建 ZIP 压缩流
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.pipe(res);

    // 添加图片到 ZIP
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
  } catch (error) {
    next(error);
  }
});

// 删除图片
router.delete('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    // 先删除相关的分享链接
    const { ShareLink } = require('../models');
    await ShareLink.destroy({
      where: { image_id: req.params.id }
    });

    // 删除文件
    try {
      await fs.unlink(image.path);
      if (image.thumbnail_path) {
        // 处理缩略图路径 - 可能是完整路径或只是文件名
        let thumbnailPath = image.thumbnail_path;
        if (!thumbnailPath.includes('/')) {
          // 如果只是文件名，构建完整路径
          thumbnailPath = path.join(path.dirname(image.path), thumbnailPath);
        }
        await fs.unlink(thumbnailPath);
      }
    } catch (error) {
      console.error('删除文件失败:', error);
    }

    // 删除数据库记录
    await image.destroy();

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    next(error);
  }
});

// 更新图片信息
router.put('/:id', async (req, res, next) => {
  try {
    const { description, tags, is_public, categoryId } = req.body;
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (categoryId !== undefined) updateData.category_id = categoryId;

    await image.update(updateData);

    // 重新获取包含分类信息的图片
    const updatedImage = await Image.findByPk(image.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedImage.toPublicJSON(),
      message: '图片信息更新成功'
    });
  } catch (error) {
    next(error);
  }
});

// 高级搜索
router.get('/search/advanced', async (req, res, next) => {
  try {
    const {
      q, // 关键词
      tags, // 标签
      categoryId, // 分类ID
      mimeType, // 文件类型
      dateFrom, // 开始日期
      dateTo, // 结束日期
      sizeMin, // 最小文件大小
      sizeMax, // 最大文件大小
      widthMin, // 最小宽度
      widthMax, // 最大宽度
      heightMin, // 最小高度
      heightMax, // 最大高度
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { is_public: true };

    // 关键词搜索
    if (q) {
      where[Op.or] = [
        { filename: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } }
      ];
    }

    // 标签搜索
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      where.tags = {
        [Op.overlap]: tagArray
      };
    }

    // 分类搜索
    if (categoryId) {
      where.category_id = categoryId;
    }

    // 文件类型搜索
    if (mimeType) {
      where.mime_type = mimeType;
    }

    // 日期范围搜索
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
    }

    // 文件大小范围搜索
    if (sizeMin || sizeMax) {
      where.size = {};
      if (sizeMin) where.size[Op.gte] = parseInt(sizeMin);
      if (sizeMax) where.size[Op.lte] = parseInt(sizeMax);
    }

    // 图片尺寸范围搜索
    if (widthMin || widthMax) {
      where.width = {};
      if (widthMin) where.width[Op.gte] = parseInt(widthMin);
      if (widthMax) where.width[Op.lte] = parseInt(widthMax);
    }

    if (heightMin || heightMax) {
      where.height = {};
      if (heightMin) where.height[Op.gte] = parseInt(heightMin);
      if (heightMax) where.height[Op.lte] = parseInt(heightMax);
    }

    const { count, rows: images } = await Image.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['upload_ip'] }
    });

    res.json({
      success: true,
      data: {
        images: images.map(img => img.toPublicJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        },
        searchParams: req.query
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取所有标签
router.get('/tags/all', async (req, res, next) => {
  try {
    const images = await Image.findAll({
      where: {
        is_public: true,
        tags: { [Op.ne]: null }
      },
      attributes: ['tags']
    });

    const allTags = new Set();
    images.forEach(image => {
      if (image.tags && Array.isArray(image.tags)) {
        image.tags.forEach(tag => allTags.add(tag));
      }
    });

    const tagCounts = {};
    for (const tag of allTags) {
      const count = await Image.count({
        where: {
          is_public: true,
          tags: { [Op.contains]: [tag] }
        }
      });
      tagCounts[tag] = count;
    }

    const sortedTags = Array.from(allTags)
      .map(tag => ({ name: tag, count: tagCounts[tag] }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: sortedTags
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
