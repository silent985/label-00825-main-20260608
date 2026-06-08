const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

const router = express.Router();

// 简单 token 存储（生产环境应使用 JWT 或 session）
const tokens = new Map();

function generateToken() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 从请求头中校验 token，返回登录用户对象，失败返回 null
function verifyToken(req) {
  const auth = req.headers && req.headers.authorization;
  if (!auth || typeof auth !== 'string') return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  return tokens.get(token) || null;
}

// 中间件：要求登录态
function requireAuth(req, res, next) {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
  req.currentUser = user;
  next();
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
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  res.json({ code: 200, data: user });
});

// 退出登录
router.post('/logout', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  tokens.delete(token);
  res.json({ code: 200, message: '已退出登录' });
});

module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.requireAuth = requireAuth;
