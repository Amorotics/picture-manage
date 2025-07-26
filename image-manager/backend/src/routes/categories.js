const express = require('express');
const { Category, Image } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// 获取所有分类（树形结构）
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { is_active: true },
      include: [
        {
          model: Category,
          as: 'children',
          where: { is_active: true },
          required: false
        }
      ],
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });

    // 构建树形结构
    const rootCategories = categories.filter(cat => !cat.parent_id);
    
    // 为每个分类添加图片数量
    for (const category of categories) {
      const imageCount = await category.countImages();
      category.dataValues.imageCount = imageCount;
    }

    res.json({
      success: true,
      data: rootCategories
    });
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类失败',
      error: error.message
    });
  }
});

// 获取单个分类详情
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'parent'
        },
        {
          model: Category,
          as: 'children',
          where: { is_active: true },
          required: false
        }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 添加图片数量
    const imageCount = await category.countImages();
    category.dataValues.imageCount = imageCount;

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('获取分类详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类详情失败',
      error: error.message
    });
  }
});

// 创建新分类
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon, parent_id, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称不能为空'
      });
    }

    // 检查分类名称是否已存在
    const existingCategory = await Category.findOne({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: '分类名称已存在'
      });
    }

    const category = await Category.create({
      name,
      description,
      color: color || '#3B82F6',
      icon,
      parent_id,
      sort_order: sort_order || 0
    });

    res.status(201).json({
      success: true,
      data: category,
      message: '分类创建成功'
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({
      success: false,
      message: '创建分类失败',
      error: error.message
    });
  }
});

// 更新分类
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, icon, parent_id, sort_order, is_active } = req.body;
    
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查分类名称是否已存在（排除当前分类）
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        where: { 
          name,
          id: { [Op.ne]: req.params.id }
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: '分类名称已存在'
        });
      }
    }

    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      color: color || category.color,
      icon: icon !== undefined ? icon : category.icon,
      parent_id: parent_id !== undefined ? parent_id : category.parent_id,
      sort_order: sort_order !== undefined ? sort_order : category.sort_order,
      is_active: is_active !== undefined ? is_active : category.is_active
    });

    res.json({
      success: true,
      data: category,
      message: '分类更新成功'
    });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({
      success: false,
      message: '更新分类失败',
      error: error.message
    });
  }
});

// 删除分类
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查是否有子分类
    const childrenCount = await Category.count({
      where: { parent_id: req.params.id }
    });

    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message: '该分类下还有子分类，无法删除'
      });
    }

    // 检查是否有图片使用该分类
    const imageCount = await Image.count({
      where: { category_id: req.params.id }
    });

    if (imageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该分类下还有 ${imageCount} 张图片，无法删除`
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({
      success: false,
      message: '删除分类失败',
      error: error.message
    });
  }
});

// 获取分类下的图片
router.get('/:id/images', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    const { count, rows: images } = await Image.findAndCountAll({
      where: { 
        category_id: req.params.id,
        is_public: true
      },
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        images,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取分类图片失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类图片失败',
      error: error.message
    });
  }
});

module.exports = router;
