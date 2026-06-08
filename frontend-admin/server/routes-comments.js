const express = require('express');
const { getDb } = require('./database');
const { authMiddleware } = require('./routes-auth');

const router = express.Router();

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || '';
}

// ========== 公开接口（访客无需登录） ==========

// 获取某篇文章的已审核评论
router.get('/post/:postId', (req, res) => {
  const db = getDb();
  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) {
    return res.status(400).json({ code: 400, message: '无效的文章 ID' });
  }
  const post = db.prepare('SELECT id, status FROM posts WHERE id = ?').get(postId);
  if (!post || post.status !== 'published') {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }
  const comments = db.prepare(`
    SELECT id, post_id, nickname, content, reply, reply_at, created_at
    FROM comments
    WHERE post_id = ? AND status = 'approved'
    ORDER BY created_at DESC
  `).all(postId);
  res.json({ code: 200, data: comments });
});

// 获取某篇文章的已审核评论数
router.get('/post/:postId/count', (req, res) => {
  const db = getDb();
  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) {
    return res.status(400).json({ code: 400, message: '无效的文章 ID' });
  }
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND status = 'approved'
  `).get(postId).count;
  res.json({ code: 200, data: { count } });
});

// 访客提交评论（默认待审核）
router.post('/', (req, res) => {
  const { post_id, nickname, email, content } = req.body;
  if (!post_id || !nickname || !content) {
    return res.status(400).json({ code: 400, message: '昵称和评论内容不能为空' });
  }
  const db = getDb();
  const post = db.prepare('SELECT id, status FROM posts WHERE id = ?').get(parseInt(post_id));
  if (!post || post.status !== 'published') {
    return res.status(404).json({ code: 404, message: '文章不存在' });
  }
  const trimmedNickname = String(nickname).trim().slice(0, 50);
  const trimmedEmail = email ? String(email).trim().slice(0, 100) : '';
  const trimmedContent = String(content).trim().slice(0, 1000);
  if (!trimmedNickname || !trimmedContent) {
    return res.status(400).json({ code: 400, message: '昵称和评论内容不能为空' });
  }
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const result = db.prepare(`
    INSERT INTO comments (post_id, nickname, email, content, ip, user_agent, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(parseInt(post_id), trimmedNickname, trimmedEmail, trimmedContent, ip, userAgent);
  const comment = db.prepare('SELECT id, post_id, nickname, content, created_at FROM comments WHERE id = ?').get(result.lastInsertRowid);
  res.json({ code: 200, message: '评论提交成功，等待审核', data: comment });
});

// ========== 管理接口（需要登录） ==========
router.use(authMiddleware);

// 获取评论列表（支持状态/关键词筛选、分页）
router.get('/', (req, res) => {
  const { status, keyword, page = 1, pageSize = 10 } = req.query;
  const db = getDb();
  let where = 'WHERE 1=1';
  const params = [];
  if (status && status !== 'all') {
    where += ' AND c.status = ?';
    params.push(status);
  }
  if (keyword) {
    where += ' AND (c.nickname LIKE ? OR c.content LIKE ? OR p.title LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM comments c LEFT JOIN posts p ON c.post_id = p.id ${where}
  `).get(...params);
  const total = countRow.total;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const rows = db.prepare(`
    SELECT c.*, p.title as post_title
    FROM comments c LEFT JOIN posts p ON c.post_id = p.id
    ${where}
    ORDER BY c.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);
  res.json({ code: 200, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

// 评论统计
router.get('/stats', (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM comments').get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM comments WHERE status = 'pending'").get().count;
  const approved = db.prepare("SELECT COUNT(*) as count FROM comments WHERE status = 'approved'").get().count;
  const replied = db.prepare('SELECT COUNT(*) as count FROM comments WHERE reply IS NOT NULL AND reply != ""').get().count;
  res.json({ code: 200, data: { total, pending, approved, replied } });
});

// 通过审核
router.put('/:id/approve', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  db.prepare("UPDATE comments SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.json({ code: 200, message: '已通过审核' });
});

// 驳回评论
router.put('/:id/reject', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  db.prepare("UPDATE comments SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.json({ code: 200, message: '已驳回评论' });
});

// 回复评论（自动设为已通过）
router.put('/:id/reply', (req, res) => {
  const { reply } = req.body;
  if (!reply || !String(reply).trim()) {
    return res.status(400).json({ code: 400, message: '回复内容不能为空' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  const replyContent = String(reply).trim().slice(0, 1000);
  db.prepare(`
    UPDATE comments SET reply = ?, reply_at = CURRENT_TIMESTAMP, status = 'approved', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(replyContent, req.params.id);
  res.json({ code: 200, message: '回复成功' });
});

// 删除评论
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
