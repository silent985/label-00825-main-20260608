const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

const router = express.Router();

// 简单 token 存储（生产环境应使用 JWT 或 session）
const tokens = new Map();

function generateToken() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }
  const token = generateToken();
  tokens.set(token, { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar });
  res.json({
    code: 200,
    data: {
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar }
    }
  });
});

// 获取当前用户
router.get('/me', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const user = tokens.get(token);
  if (!user) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  res.json({ code: 200, data: user });
});

// 退出登录
router.post('/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  tokens.delete(token);
  res.json({ code: 200, message: '已退出登录' });
});

module.exports = router;
