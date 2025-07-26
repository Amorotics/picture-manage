const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: '分类名称'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '分类描述'
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: '#3B82F6',
      comment: '分类颜色'
    },
    icon: {
      type: DataTypes.STRING,
      comment: '分类图标'
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      comment: '父分类ID'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序顺序'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否激活'
    }
  }, {
    tableName: 'categories',
    indexes: [
      {
        fields: ['name'],
        unique: true
      },
      {
        fields: ['parent_id']
      },
      {
        fields: ['sort_order']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // 定义关联关系
  Category.associate = function(models) {
    // 自关联：父子分类关系
    Category.hasMany(models.Category, {
      as: 'children',
      foreignKey: 'parent_id'
    });
    
    Category.belongsTo(models.Category, {
      as: 'parent',
      foreignKey: 'parent_id'
    });

    // 与图片的关联关系
    Category.hasMany(models.Image, {
      foreignKey: 'category_id',
      as: 'images'
    });
  };

  // 实例方法
  Category.prototype.getImageCount = async function() {
    const count = await this.countImages();
    return count;
  };

  Category.prototype.toPublicJSON = function() {
    return this.toJSON();
  };

  return Category;
};
