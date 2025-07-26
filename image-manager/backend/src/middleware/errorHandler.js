const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize 验证错误
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message
    }));
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }

  // Sequelize 唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: '资源已存在'
    });
  }

  // Sequelize 外键约束错误
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Foreign Key Constraint',
      message: '关联资源不存在'
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: '无效的访问令牌'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: '访问令牌已过期'
    });
  }

  // Multer 错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File Too Large',
      message: '文件大小超出限制'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({
      error: 'Too Many Files',
      message: '文件数量超出限制'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected File',
      message: '意外的文件字段'
    });
  }

  // 自定义应用错误
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      error: err.name || 'Application Error',
      message: err.message
    });
  }

  // 文件系统错误
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      error: 'File Not Found',
      message: '文件不存在'
    });
  }

  if (err.code === 'EACCES') {
    return res.status(403).json({
      error: 'Permission Denied',
      message: '文件访问权限不足'
    });
  }

  if (err.code === 'ENOSPC') {
    return res.status(507).json({
      error: 'Insufficient Storage',
      message: '存储空间不足'
    });
  }

  // 语法错误
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: '请求体包含无效的JSON格式'
    });
  }

  // 默认服务器错误
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 错误
class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(message, 404);
  }
}

// 验证错误
class ValidationError extends AppError {
  constructor(message = '数据验证失败') {
    super(message, 400);
  }
}

// 权限错误
class UnauthorizedError extends AppError {
  constructor(message = '未授权访问') {
    super(message, 401);
  }
}

// 禁止访问错误
class ForbiddenError extends AppError {
  constructor(message = '禁止访问') {
    super(message, 403);
  }
}

// 冲突错误
class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409);
  }
}

module.exports = {
  errorHandler,
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
};
