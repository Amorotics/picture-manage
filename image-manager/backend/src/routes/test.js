const express = require('express');
const router = express.Router();

// 简单的测试路由
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API 服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
