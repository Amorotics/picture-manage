const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { ValidationError } = require('./errorHandler');

// 确保上传目录存在
const ensureUploadDir = async (dir) => {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
};

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,image/tiff,image/gif').split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`不支持的文件类型: ${file.mimetype}。支持的类型: ${allowedTypes.join(', ')}`), false);
  }
};

// 存储配置
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const dateDir = new Date().toISOString().slice(0, 7); // YYYY-MM 格式
    const fullPath = path.join(uploadDir, dateDir);
    
    try {
      await ensureUploadDir(fullPath);
      cb(null, fullPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// Multer 配置
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 默认 10MB
    files: 20 // 最多 20 个文件
  }
});

// 单文件上传中间件
const uploadSingle = upload.single('image');

// 多文件上传中间件
const uploadMultiple = upload.array('images', 20);

// 上传中间件包装器，添加错误处理
const uploadMiddleware = (uploadFn) => {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return next(new ValidationError('文件大小超出限制'));
            case 'LIMIT_FILE_COUNT':
              return next(new ValidationError('文件数量超出限制'));
            case 'LIMIT_UNEXPECTED_FILE':
              return next(new ValidationError('意外的文件字段'));
            default:
              return next(new ValidationError(`上传错误: ${err.message}`));
          }
        }
        return next(err);
      }
      next();
    });
  };
};

// 验证上传的文件
const validateUploadedFiles = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  
  if (files.length === 0) {
    return next(new ValidationError('请选择要上传的文件'));
  }

  // 验证文件是否真的是图片
  for (const file of files) {
    if (!file.mimetype.startsWith('image/')) {
      return next(new ValidationError(`文件 ${file.originalname} 不是有效的图片文件`));
    }
  }

  next();
};

// 清理临时文件
const cleanupFiles = async (files) => {
  if (!files || files.length === 0) return;
  
  for (const file of files) {
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error(`清理文件失败: ${file.path}`, error);
    }
  }
};

module.exports = {
  uploadSingle: uploadMiddleware(uploadSingle),
  uploadMultiple: uploadMiddleware(uploadMultiple),
  validateUploadedFiles,
  cleanupFiles,
  ensureUploadDir
};
