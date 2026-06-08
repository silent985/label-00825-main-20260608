const express = require('express');
const { getDb } = require('./database');

const router = express.Router();

// 前台：获取文章评论列表（仅已审核）
router.get('/post/:postId', (req, res) => {
  const { postId } = req.params;
  const { page = 1, pageSize = 20 } = req.query;
  const db = getDb();

  const countRow = db.prepare(
    'SELECT COUNT(*) as total FROM comments WHERE post_id = ? AND status = ? AND parent_id = 0'
  ).get(postId, 'approved');
  const total = countRow.total;

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const rows = db.prepare(
    `SELECT * FROM comments 
     WHERE post_id = ? AND status = ? AND parent_id = 0 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  ).all(postId, 'approved', parseInt(pageSize), offset);

  res.json({
    code: 200,
    data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) }
  });
});

// 前台：提交评论
router.post('/', (req, res) => {
  const { post_id, nickname, email, website, content, parent_id } = req.body;

  if (!post_id || !nickname || !content) {
    return res.status(400).json({ code: 400, message: '昵称和评论内容不能为空' });
  }

  const db = getDb();

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(post_id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }

  const result = db.prepare(`
    INSERT INTO comments (post_id, parent_id, nickname, email, website, content)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    post_id,
    parent_id || 0,
    nickname,
    email || '',
    website || '',
    content
  );

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
  res.json({ code: 200, message: '评论提交成功，等待审核', data: comment });
});

// 后台：获取评论列表（带筛选）
router.get('/', (req, res) => {
  const { status, keyword, post_id, page = 1, pageSize = 10 } = req.query;
  const db = getDb();
  let where = 'WHERE 1=1';
  const params = [];

  if (status && status !== '全部') {
    where += ' AND status = ?';
    params.push(status);
  }
  if (post_id) {
    where += ' AND post_id = ?';
    params.push(post_id);
  }
  if (keyword) {
    where += ' AND (nickname LIKE ? OR content LIKE ? OR email LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM comments ${where}`).get(...params);
  const total = countRow.total;

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const rows = db.prepare(
    `SELECT c.*, p.title as post_title 
     FROM comments c 
     LEFT JOIN posts p ON c.post_id = p.id 
     ${where} 
     ORDER BY c.created_at DESC 
     LIMIT ? OFFSET ?`
  ).all(...params, parseInt(pageSize), offset);

  res.json({
    code: 200,
    data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) }
  });
});

// 后台：获取单条评论
router.get('/:id', (req, res) => {
  const db = getDb();
  const comment = db.prepare(
    `SELECT c.*, p.title as post_title 
     FROM comments c 
     LEFT JOIN posts p ON c.post_id = p.id 
     WHERE c.id = ?`
  ).get(req.params.id);

  if (!comment) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  res.json({ code: 200, data: comment });
});

// 后台：审核评论
router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ code: 400, message: '无效的状态值' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }

  db.prepare(
    'UPDATE comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(status, req.params.id);

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  res.json({ code: 200, message: '状态更新成功', data: comment });
});

// 后台：回复评论
router.put('/:id/reply', (req, res) => {
  const { reply_content } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }

  db.prepare(`
    UPDATE comments 
    SET reply_content = ?, reply_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(reply_content || '', req.params.id);

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  res.json({ code: 200, message: '回复成功', data: comment });
});

// 后台：删除评论
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '删除成功' });
});

module.exports = router;
