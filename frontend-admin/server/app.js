const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 8081;

// 确保上传目录存在
const publicBase = fs.existsSync(path.join(__dirname, '..', 'public', 'index.html'))
  ? path.join(__dirname, '..', 'public')
  : path.join(__dirname, '..');
const uploadDir = path.join(publicBase, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片文件'));
    }
  }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件 - 兼容本地开发和 Docker 环境
const publicDir = path.join(__dirname, '..', 'public');
const rootDir = path.join(__dirname, '..');
if (fs.existsSync(path.join(publicDir, 'index.html'))) {
  app.use(express.static(publicDir));
} else {
  app.use(express.static(rootDir));
}

// API 路由
app.use('/api/auth', require('./routes-auth'));
app.use('/api/posts', require('./routes-posts'));
app.use('/api/profiles', require('./routes-profiles'));
app.use('/api/comments', require('./routes-comments'));

// 图片上传接口
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, message: '请选择文件' });
  }
  const url = '/uploads/' + req.file.filename;
  res.json({ code: 200, data: { url } });
});

// 统计接口
app.get('/api/stats', (req, res) => {
  const db = getDb();
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  const profileCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get().count;
  const totalViews = db.prepare('SELECT COALESCE(SUM(view_count), 0) as total FROM posts').get().total;
  const categories = db.prepare('SELECT DISTINCT category FROM posts').all().length;
  const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get().count;
  const pendingCommentCount = db.prepare("SELECT COUNT(*) as count FROM comments WHERE status = 'pending'").get().count;
  res.json({
    code: 200,
    data: { postCount, profileCount, totalViews, categories, commentCount, pendingCommentCount }
  });
});

// SPA 回退
app.get('*', (req, res) => {
  const publicIndex = path.join(__dirname, '..', 'public', 'index.html');
  const rootIndex = path.join(__dirname, '..', 'index.html');
  if (fs.existsSync(publicIndex)) {
    res.sendFile(publicIndex);
  } else {
    res.sendFile(rootIndex);
  }
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

app.listen(PORT, '0.0.0.0', () => {
  // 初始化数据库
  getDb();
  console.log(`✓ 个人博客系统已启动: http://localhost:${PORT}`);
});
