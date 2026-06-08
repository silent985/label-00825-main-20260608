const express = require('express');
const { getDb } = require('./database');

const router = express.Router();

function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const { tokens } = require('./routes-auth');
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  next();
}

router.get('/post/:postId', (req, res) => {
  const db = getDb();
  const { postId } = req.params;
  const rows = db.prepare(
    'SELECT * FROM comments WHERE post_id = ? AND status = ? ORDER BY created_at ASC'
  ).all(postId, 'approved');
  res.json({ code: 200, data: rows });
});

router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { status, keyword, page = 1, pageSize = 10 } = req.query;
  let where = 'WHERE 1=1';
  const params = [];

  if (status) {
    where += ' AND c.status = ?';
    params.push(status);
  }
  if (keyword) {
    where += ' AND (c.content LIKE ? OR c.nickname LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM comments c ${where}`
  ).get(...params);
  const total = countRow.total;

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const rows = db.prepare(
    `SELECT c.*, p.title as post_title FROM comments c LEFT JOIN posts p ON c.post_id = p.id ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(pageSize), offset);

  res.json({ code: 200, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.post('/', (req, res) => {
  const { post_id, nickname, email, content } = req.body;
  if (!post_id || !nickname || !content) {
    return res.status(400).json({ code: 400, message: '文章ID、昵称和内容不能为空' });
  }
  if (nickname.length > 50) {
    return res.status(400).json({ code: 400, message: '昵称不能超过50个字符' });
  }
  if (content.length > 1000) {
    return res.status(400).json({ code: 400, message: '评论内容不能超过1000个字符' });
  }
  const db = getDb();
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(post_id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }
  const result = db.prepare(
    'INSERT INTO comments (post_id, nickname, email, content) VALUES (?, ?, ?, ?)'
  ).run(post_id, nickname.trim(), (email || '').trim(), content.trim());
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
  res.json({ code: 200, message: '评论已提交，等待审核', data: comment });
});

router.put('/:id/approve', authMiddleware, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  db.prepare('UPDATE comments SET status = ? WHERE id = ?').run('approved', req.params.id);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  res.json({ code: 200, message: '评论已通过', data: comment });
});

router.put('/:id/reject', authMiddleware, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  db.prepare('UPDATE comments SET status = ? WHERE id = ?').run('rejected', req.params.id);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  res.json({ code: 200, message: '评论已拒绝', data: comment });
});

router.put('/:id/reply', authMiddleware, (req, res) => {
  const { reply } = req.body;
  if (!reply || !reply.trim()) {
    return res.status(400).json({ code: 400, message: '回复内容不能为空' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  db.prepare('UPDATE comments SET reply = ? WHERE id = ?').run(reply.trim(), req.params.id);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  res.json({ code: 200, message: '回复成功', data: comment });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '评论已删除' });
});

module.exports = router;
