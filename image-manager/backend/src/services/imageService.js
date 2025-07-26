const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { Op, sequelize } = require('sequelize');
const { Image } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

class ImageService {
  // 处理图片上传
  async processUpload(file, options = {}) {
    try {
      const { description, tags, isPublic = true } = options;
      
      // 获取图片信息
      const imageInfo = await sharp(file.path).metadata();
      
      // 生成缩略图
      const thumbnailPath = await this.generateThumbnail(file.path);
      
      // 获取文件大小
      const stats = await fs.stat(file.path);
      
      // 创建数据库记录
      const image = await Image.create({
        filename: file.originalname,
        stored_filename: file.filename,
        mime_type: file.mimetype,
        size: stats.size,
        width: imageInfo.width,
        height: imageInfo.height,
        path: file.path,
        thumbnail_path: thumbnailPath,
        description,
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
        metadata: {
          format: imageInfo.format,
          density: imageInfo.density,
          hasAlpha: imageInfo.hasAlpha,
          orientation: imageInfo.orientation,
          exif: imageInfo.exif
        },
        is_public: isPublic
      });
      
      return image;
    } catch (error) {
      // 如果处理失败，清理上传的文件
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.error('清理文件失败:', cleanupError);
      }
      throw error;
    }
  }

  // 批量处理图片上传
  async processBatchUpload(files, options = {}) {
    const results = [];
    const errors = [];
    
    for (const file of files) {
      try {
        const image = await this.processUpload(file, options);
        results.push(image);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }
    
    return { results, errors };
  }

  // 生成缩略图
  async generateThumbnail(imagePath, size = 300) {
    try {
      const ext = path.extname(imagePath);
      const thumbnailPath = imagePath.replace(ext, `_thumb.jpg`); // 统一使用 .jpg 扩展名

      await sharp(imagePath)
        .resize(size, size, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // 只返回文件名，不返回完整路径
      return path.basename(thumbnailPath);
    } catch (error) {
      console.error('生成缩略图失败:', error);
      return null;
    }
  }

  // 获取图片列表
  async getImages(options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search,
      tags,
      mimeType
    } = options;
    
    const offset = (page - 1) * limit;
    const where = { is_public: true };
    
    // 搜索条件
    if (search) {
      where[Op.or] = [
        { filename: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (tags && tags.length > 0) {
      where.tags = { [Op.contains]: tags };
    }
    
    if (mimeType) {
      where.mime_type = mimeType;
    }
    
    const { rows: images, count: total } = await Image.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return {
      images: images.map(img => img.toPublicJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // 获取单张图片
  async getImageById(id) {
    const image = await Image.findByPk(id);
    if (!image) {
      throw new NotFoundError('图片不存在');
    }
    
    // 增加查看次数
    await image.incrementViewCount();
    
    return image.toPublicJSON();
  }

  // 删除图片
  async deleteImage(id) {
    const image = await Image.findByPk(id);
    if (!image) {
      throw new NotFoundError('图片不存在');
    }
    
    // 删除文件
    try {
      await fs.unlink(image.path);
      if (image.thumbnail_path) {
        await fs.unlink(image.thumbnail_path);
      }
    } catch (error) {
      console.error('删除文件失败:', error);
    }
    
    // 删除数据库记录
    await image.destroy();
    
    return { message: '图片删除成功' };
  }

  // 更新图片信息
  async updateImage(id, updates) {
    const image = await Image.findByPk(id);
    if (!image) {
      throw new NotFoundError('图片不存在');
    }
    
    const allowedUpdates = ['description', 'tags', 'is_public'];
    const filteredUpdates = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }
    
    await image.update(filteredUpdates);
    return image.toPublicJSON();
  }

  // 获取图片统计信息
  async getStats() {
    const totalImages = await Image.count();
    const totalSize = await Image.sum('size');
    const imagesByType = await Image.findAll({
      attributes: [
        'mime_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('size')), 'total_size']
      ],
      group: ['mime_type']
    });
    
    return {
      total_images: totalImages,
      total_size: totalSize,
      images_by_type: imagesByType
    };
  }
}

module.exports = new ImageService();
