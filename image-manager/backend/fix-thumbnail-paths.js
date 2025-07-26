const { Sequelize } = require('sequelize');
const path = require('path');

// 数据库配置
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: console.log
});

async function fixThumbnailPaths() {
  try {
    console.log('开始修复缩略图路径...');
    
    // 查询所有有缩略图路径的图片
    const [results] = await sequelize.query(`
      SELECT id, thumbnail_path 
      FROM images 
      WHERE thumbnail_path IS NOT NULL AND thumbnail_path != ''
    `);
    
    console.log(`找到 ${results.length} 条需要修复的记录`);
    
    for (const row of results) {
      const { id, thumbnail_path } = row;
      
      if (thumbnail_path && thumbnail_path.includes('/')) {
        // 提取文件名
        const filename = path.basename(thumbnail_path);
        
        // 更新数据库
        await sequelize.query(`
          UPDATE images 
          SET thumbnail_path = ? 
          WHERE id = ?
        `, {
          replacements: [filename, id]
        });
        
        console.log(`修复: ${thumbnail_path} -> ${filename}`);
      }
    }
    
    console.log('缩略图路径修复完成！');
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 运行修复
fixThumbnailPaths();
