const express = require('express');
const { getDb } = require('./database');
const { authMiddleware } = require('./routes-auth');

const router = express.Router();

// 个人资料为管理功能，全部接口需要鉴权
router.use(authMiddleware);

// 获取所有个人资料
router.get('/', (req, res) => {
  const db = getDb();
  const profiles = db.prepare('SELECT * FROM profiles ORDER BY id DESC').all();
  res.json({ code: 200, data: profiles });
});

// 获取单个资料
router.get('/:id', (req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!profile) {
    return res.status(404).json({ code: 404, message: '资料不存在' });
  }
  res.json({ code: 200, data: profile });
});

// 创建资料
router.post('/', (req, res) => {
  const { name, email, avatar, bio, website, github, location } = req.body;
  if (!name) {
    return res.status(400).json({ code: 400, message: '姓名不能为空' });
  }
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO profiles (name, email, avatar, bio, website, github, location)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, email || '', avatar || '', bio || '', website || '', github || '', location || '');

  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(result.lastInsertRowid);
  res.json({ code: 200, message: '创建成功', data: profile });
});

// 更新资料
router.put('/:id', (req, res) => {
  const { name, email, avatar, bio, website, github, location } = req.body;
  if (!name) {
    return res.status(400).json({ code: 400, message: '姓名不能为空' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '资料不存在' });
  }

  db.prepare(`
    UPDATE profiles SET name = ?, email = ?, avatar = ?, bio = ?, website = ?, github = ?, location = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, email || '', avatar || '', bio || '', website || '', github || '', location || '', req.params.id);

  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  res.json({ code: 200, message: '更新成功', data: profile });
});

// 删除资料
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '资料不存在' });
  }
  db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '删除成功' });
});

module.exports = router;
