const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Image = sequelize.define('Image', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '原始文件名'
    },
    stored_filename: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: '存储的文件名'
    },
    mime_type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'MIME 类型'
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '文件大小（字节）'
    },
    width: {
      type: DataTypes.INTEGER,
      comment: '图片宽度'
    },
    height: {
      type: DataTypes.INTEGER,
      comment: '图片高度'
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '文件存储路径'
    },
    thumbnail_path: {
      type: DataTypes.STRING,
      comment: '缩略图路径'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '图片描述'
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '图片标签'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: '图片元数据（EXIF等）'
    },
    upload_ip: {
      type: DataTypes.STRING,
      comment: '上传者IP地址'
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否公开'
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '查看次数'
    },
    download_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '下载次数'
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      comment: '分类ID'
    }
  }, {
    tableName: 'images',
    indexes: [
      {
        fields: ['mime_type']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['is_public']
      },
      {
        fields: ['stored_filename'],
        unique: true
      }
    ]
  });

  // 定义关联关系
  Image.associate = function(models) {
    // 与分类的关联关系
    Image.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });
  };

  // 实例方法
  Image.prototype.incrementViewCount = function() {
    return this.increment('view_count');
  };

  Image.prototype.incrementDownloadCount = function() {
    return this.increment('download_count');
  };

  Image.prototype.toPublicJSON = function() {
    const { upload_ip, ...publicData } = this.toJSON();
    return publicData;
  };

  return Image;
};
