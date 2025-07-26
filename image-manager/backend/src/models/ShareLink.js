const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShareLink = sequelize.define('ShareLink', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: '分享令牌'
    },
    image_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '关联的图片ID（单张图片分享）'
    },
    image_ids: {
      type: DataTypes.JSON,
      comment: '关联的图片ID数组（批量分享）'
    },
    share_type: {
      type: DataTypes.ENUM('single', 'batch', 'gallery'),
      allowNull: false,
      defaultValue: 'single',
      comment: '分享类型：single-单张，batch-批量，gallery-图库'
    },
    title: {
      type: DataTypes.STRING,
      comment: '分享标题'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '分享描述'
    },
    password: {
      type: DataTypes.STRING,
      comment: '访问密码（加密存储）'
    },
    expires_at: {
      type: DataTypes.DATE,
      comment: '过期时间'
    },
    max_views: {
      type: DataTypes.INTEGER,
      comment: '最大查看次数'
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '已查看次数'
    },
    download_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '下载次数'
    },
    allow_download: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否允许下载'
    },
    creator_ip: {
      type: DataTypes.STRING,
      comment: '创建者IP地址'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否激活'
    },
    last_accessed_at: {
      type: DataTypes.DATE,
      comment: '最后访问时间'
    },
    access_log: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '访问日志'
    }
  }, {
    tableName: 'share_links',
    indexes: [
      {
        fields: ['token'],
        unique: true
      },
      {
        fields: ['image_id']
      },
      {
        fields: ['share_type']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // 实例方法
  ShareLink.prototype.isExpired = function() {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
  };

  ShareLink.prototype.isViewLimitReached = function() {
    if (!this.max_views) return false;
    return this.view_count >= this.max_views;
  };

  ShareLink.prototype.canAccess = function() {
    return this.is_active && !this.isExpired() && !this.isViewLimitReached();
  };

  ShareLink.prototype.incrementViewCount = function() {
    this.last_accessed_at = new Date();
    return this.increment('view_count');
  };

  ShareLink.prototype.incrementDownloadCount = function() {
    return this.increment('download_count');
  };

  ShareLink.prototype.logAccess = function(ip, userAgent) {
    const accessEntry = {
      timestamp: new Date(),
      ip,
      userAgent
    };
    
    const log = this.access_log || [];
    log.push(accessEntry);
    
    // 保留最近100条访问记录
    if (log.length > 100) {
      log.splice(0, log.length - 100);
    }
    
    return this.update({ access_log: log });
  };

  ShareLink.prototype.getShareUrl = function() {
    const baseUrl = process.env.SHARE_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/api/share/${this.token}`;
  };

  return ShareLink;
};
