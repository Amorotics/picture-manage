const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');
const imageRoutes = require('./routes/imageRoutes');
const shareRoutes = require('./routes/shareRoutes');
const categoryRoutes = require('./routes/categories');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// 日志中间件
app.use(morgan('combined'));

// 解析 JSON 和 URL 编码数据
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务 (必须在设置JSON Content-Type之前)
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// 设置字符编码 (只对API路由，不影响静态文件)
app.use('/api', (req, res, next) => {
  // 只对非静态文件路由设置JSON Content-Type
  if (!req.path.startsWith('/uploads')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

// API 路由
app.use('/api/images', imageRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/categories', categoryRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// 错误处理中间件
app.use(errorHandler);

// 数据库连接和服务器启动
async function startServer() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 同步数据库模型
    await sequelize.sync({ force: false });
    console.log('✅ 数据库模型同步完成');

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📁 上传目录: ${path.resolve(process.env.UPLOAD_DIR || './uploads')}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('🔄 收到 SIGTERM 信号，正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 收到 SIGINT 信号，正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;
