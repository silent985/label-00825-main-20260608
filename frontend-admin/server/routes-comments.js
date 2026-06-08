const express = require('express');
const { getDb } = require('./database');
const { requireAuth } = require('./routes-auth');

const router = express.Router();

// 公开：获取某文章的已审核评论列表
router.get('/post/:postId', (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT id, post_id, parent_id, author_name, content, status, is_admin, created_at
     FROM comments
     WHERE post_id = ? AND status = 'approved'
     ORDER BY created_at ASC`
  ).all(req.params.postId);
  res.json({ code: 200, data: rows });
});

// 公开：访客发表评论（默认 pending 待审核）
router.post('/', (req, res) => {
  const { post_id, parent_id, author_name, author_email, content } = req.body;
  if (!post_id || !author_name || !content) {
    return res.status(400).json({ code: 400, message: '文章ID、昵称和评论内容不能为空' });
  }
  if (String(content).trim().length < 1) {
    return res.status(400).json({ code: 400, message: '评论内容不能为空' });
  }
  const db = getDb();
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(post_id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }
  const result = db.prepare(`
    INSERT INTO comments (post_id, parent_id, author_name, author_email, content, status, is_admin)
    VALUES (?, ?, ?, ?, ?, 'pending', 0)
  `).run(
    post_id,
    parent_id || null,
    String(author_name).trim().slice(0, 50),
    String(author_email || '').trim().slice(0, 100),
    String(content).trim().slice(0, 2000)
  );
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
  res.json({ code: 200, message: '评论已提交，等待审核', data: comment });
});

// 管理员：获取全部评论（支持按 status 筛选）
router.get('/', requireAuth, (req, res) => {
  const { status, page = 1, pageSize = 20 } = req.query;
  const db = getDb();
  let where = 'WHERE 1=1';
  const params = [];
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    where += ' AND c.status = ?';
    params.push(status);
  }
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM comments c ${where}`).get(...params);
  const total = countRow.total;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const rows = db.prepare(
    `SELECT c.*, p.title AS post_title
     FROM comments c
     LEFT JOIN posts p ON p.id = c.post_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, parseInt(pageSize), offset);
  res.json({ code: 200, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

// 管理员：评论数量统计（按状态）
router.get('/stats', requireAuth, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT status, COUNT(*) as count FROM comments GROUP BY status`).all();
  const stats = { pending: 0, approved: 0, rejected: 0, total: 0 };
  rows.forEach(r => {
    if (stats[r.status] !== undefined) stats[r.status] = r.count;
    stats.total += r.count;
  });
  res.json({ code: 200, data: stats });
});

// 管理员：审核评论（approve / reject）
router.put('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ code: 400, message: '无效的状态' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(status, req.params.id);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  res.json({ code: 200, message: '操作成功', data: comment });
});

// 管理员：回复评论（自动通过审核）
router.post('/:id/reply', requireAuth, (req, res) => {
  const { content, author_name } = req.body;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ code: 400, message: '回复内容不能为空' });
  }
  const db = getDb();
  const parent = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!parent) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  // 优先使用当前登录用户的昵称/用户名作为作者，避免被请求体伪造
  const adminAuthor = (req.currentUser && (req.currentUser.nickname || req.currentUser.username))
    || (author_name || '管理员');
  const result = db.prepare(`
    INSERT INTO comments (post_id, parent_id, author_name, author_email, content, status, is_admin)
    VALUES (?, ?, ?, '', ?, 'approved', 1)
  `).run(parent.post_id, parent.id, String(adminAuthor).slice(0, 50), String(content).trim().slice(0, 2000));
  // 同时把父评论自动审核通过（若仍处 pending）
  if (parent.status === 'pending') {
    db.prepare(`UPDATE comments SET status = 'approved' WHERE id = ?`).run(parent.id);
  }
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
  res.json({ code: 200, message: '回复成功', data: comment });
});

// 管理员：删除评论（同时删除其子评论）
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  db.prepare('DELETE FROM comments WHERE id = ? OR parent_id = ?').run(req.params.id, req.params.id);
  res.json({ code: 200, message: '删除成功' });
});

module.exports = router;
