const { Sequelize } = require('sequelize');
const path = require('path');

// 数据库配置
const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT || 'sqlite',
  storage: process.env.DB_STORAGE || path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// 导入模型
const Image = require('./Image')(sequelize);
const ShareLink = require('./ShareLink')(sequelize);
const Category = require('./Category')(sequelize);

// 创建模型对象以便关联
const models = {
  Image,
  ShareLink,
  Category
};

// 定义关联关系
Image.hasMany(ShareLink, {
  foreignKey: 'image_id',
  as: 'shareLinks',
  onDelete: 'CASCADE'
});

ShareLink.belongsTo(Image, {
  foreignKey: 'image_id',
  as: 'image'
});

// 分类与图片的关联关系
Category.hasMany(Image, {
  foreignKey: 'category_id',
  as: 'images'
});

Image.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
});

// 分类自关联（父子关系）
Category.hasMany(Category, {
  as: 'children',
  foreignKey: 'parent_id'
});

Category.belongsTo(Category, {
  as: 'parent',
  foreignKey: 'parent_id'
});

module.exports = {
  sequelize,
  Image,
  ShareLink,
  Category
};
