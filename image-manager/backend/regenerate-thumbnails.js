const { Sequelize } = require('sequelize');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// 数据库配置
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: console.log
});

async function generateThumbnail(imagePath, size = 300) {
  try {
    const ext = path.extname(imagePath);
    const thumbnailPath = imagePath.replace(ext, `_thumb.jpg`); // 统一使用 .jpg 扩展名

    await sharp(imagePath)
      .resize(size, size, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // 只返回文件名，不返回完整路径
    return path.basename(thumbnailPath);
  } catch (error) {
    console.error('生成缩略图失败:', error);
    return null;
  }
}

async function regenerateThumbnails() {
  try {
    console.log('开始重新生成缩略图...');
    
    // 查询所有图片
    const [results] = await sequelize.query(`
      SELECT id, stored_filename, path 
      FROM images
    `);
    
    console.log(`找到 ${results.length} 张图片需要生成缩略图`);
    
    for (const row of results) {
      const { id, stored_filename, path: imagePath } = row;
      
      try {
        // 检查原图文件是否存在
        await fs.access(imagePath);
        
        // 生成缩略图
        const thumbnailFilename = await generateThumbnail(imagePath);
        
        if (thumbnailFilename) {
          // 更新数据库
          await sequelize.query(`
            UPDATE images 
            SET thumbnail_path = ? 
            WHERE id = ?
          `, {
            replacements: [thumbnailFilename, id]
          });
          
          console.log(`生成缩略图: ${stored_filename} -> ${thumbnailFilename}`);
        } else {
          console.error(`生成缩略图失败: ${stored_filename}`);
        }
      } catch (error) {
        console.error(`处理图片失败 ${stored_filename}:`, error.message);
      }
    }
    
    console.log('缩略图重新生成完成！');
  } catch (error) {
    console.error('重新生成失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 运行重新生成
regenerateThumbnails();
