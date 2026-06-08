const express = require('express');
const { getDb } = require('./database');
const { authMiddleware } = require('./routes-auth');

const router = express.Router();

// ========== 公开接口 ==========

// 获取文章列表（未登录时强制只返回已发布文章）
router.get('/', (req, res) => {
  const { category, keyword, status, page = 1, pageSize = 10 } = req.query;
  const db = getDb();
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const isAdmin = !!token && require('./routes-auth').tokens.get(token);

  let where = 'WHERE 1=1';
  const params = [];

  // 非管理员只能看到已发布文章
  if (!isAdmin) {
    where += " AND status = 'published'";
  } else if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  if (category && category !== '全部') {
    where += ' AND category = ?';
    params.push(category);
  }
  if (keyword) {
    where += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM posts ${where}`).get(...params);
  const total = countRow.total;

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const rows = db.prepare(
    `SELECT * FROM posts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(pageSize), offset);

  res.json({ code: 200, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

// 获取分类列表
router.get('/categories', (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT DISTINCT category FROM posts WHERE category IS NOT NULL AND status = 'published'").all();
  const categories = rows.map(r => r.category);
  res.json({ code: 200, data: categories });
});

// 获取单篇文章（未登录只能看已发布，管理员可看全部）
router.get('/:id', (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const isAdmin = !!token && require('./routes-auth').tokens.get(token);
  if (!isAdmin && post.status !== 'published') {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }
  // 增加浏览量（仅已发布文章统计）
  if (post.status === 'published') {
    db.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);
    post.view_count += 1;
  }
  res.json({ code: 200, data: post });
});

// ========== 管理接口（需要登录） ==========
router.use(authMiddleware);

// 创建文章
router.post('/', (req, res) => {
  const { title, content, summary, cover_image, category, tags, status } = req.body;
  if (!title || !content) {
    return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
  }
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO posts (title, content, summary, cover_image, category, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, content, summary || '', cover_image || '', category || '未分类', tags || '', status || 'published');

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
  res.json({ code: 200, message: '创建成功', data: post });
});

// 更新文章
router.put('/:id', (req, res) => {
  const { title, content, summary, cover_image, category, tags, status } = req.body;
  if (!title || !content) {
    return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }

  db.prepare(`
    UPDATE posts SET title = ?, content = ?, summary = ?, cover_image = ?, category = ?, tags = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, content, summary || '', cover_image || '', category || '未分类', tags || '', status || 'published', req.params.id);

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  res.json({ code: 200, message: '更新成功', data: post });
});

// 删除文章
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '删除成功' });
});

module.exports = router;
