#!/bin/bash

echo "🚀 启动图片管理系统..."
echo ""

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装根目录依赖..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "✅ 依赖安装完成"
echo ""
echo "🔥 启动开发服务器..."
echo "   - 后端: http://localhost:3000"
echo "   - 前端: http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 启动开发服务器
npm run dev
