# 现代化图片管理 Web 应用

一个使用 Node.js 后端和 Vue.js 前端构建的现代化图片管理应用。

## 功能特性

### 核心功能
- **图片上传**：支持多张图片上传，拖放功能和进度指示器
- **图片预览**：响应式图库，缩略图网格视图和全尺寸模态预览
- **图片下载**：单张图片下载和批量下载为 ZIP 文件
- **链接分享**：为单张图片或整个图库生成可分享的链接，可设置有效期

### 技术栈
- **前端**：Vue.js 3 + Composition API
- **后端**：Node.js + Express.js
- **UI 框架**：Inspira UI 组件库
- **数据库**：SQLite + Sequelize ORM
- **文件存储**：本地文件系统
- **图片处理**：Sharp

### 设计特点
- 使用 Inspira UI 组件库确保设计一致性
- 流畅的动画和过渡效果
- 响应式设计，支持移动端和桌面端
- 现代 UI/UX 原则

## 项目结构

```
image-manager/
├── backend/                 # Node.js + Express 后端
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由
│   │   ├── services/        # 业务逻辑
│   │   ├── utils/           # 工具函数
│   │   └── app.js           # 应用入口
│   ├── uploads/             # 文件上传目录
│   ├── package.json
│   └── .env
├── frontend/                # Vue.js 3 前端
│   ├── src/
│   │   ├── components/      # Vue 组件
│   │   ├── views/           # 页面视图
│   │   ├── composables/     # Composition API 逻辑
│   │   ├── services/        # API 服务
│   │   ├── utils/           # 工具函数
│   │   ├── assets/          # 静态资源
│   │   └── main.js          # 应用入口
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 快速开始

### 一键启动（推荐）

```bash
# 安装所有依赖
npm run install:all

# 同时启动前后端
npm run dev
```

这将同时启动：
- 后端服务器: http://localhost:3000
- 前端开发服务器: http://localhost:5173

### 分别启动

如果你想分别启动前后端：

```bash
# 启动后端
npm run dev:backend

# 启动前端
npm run dev:frontend
```

### 可用脚本

在项目根目录下：

- `npm run dev` - 同时启动前后端开发服务器
- `npm run dev:backend` - 仅启动后端开发服务器
- `npm run dev:frontend` - 仅启动前端开发服务器
- `npm run build` - 构建前后端
- `npm run start` - 启动生产服务器
- `npm run install:all` - 安装所有依赖

## 开发指南

### 后端 API 端点
- `POST /api/upload` - 上传图片
- `GET /api/images` - 获取图片列表
- `GET /api/images/:id` - 获取单张图片详情
- `GET /api/images/:id/download` - 下载单张图片
- `POST /api/images/download-batch` - 批量下载图片
- `POST /api/share` - 创建分享链接
- `GET /api/share/:token` - 访问分享链接

### 前端组件
- `ImageUpload.vue` - 图片上传组件
- `ImageGallery.vue` - 图库展示组件
- `ImagePreview.vue` - 图片预览模态框
- `ShareDialog.vue` - 分享对话框

## 安全特性
- 文件类型验证（JPEG、PNG、WebP、TIFF等）
- 文件大小限制
- 安全的文件存储和访问控制
- 分享链接有效期控制

## 许可证
MIT License
