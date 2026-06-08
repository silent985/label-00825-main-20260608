const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'blog.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
    seedData();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      website TEXT DEFAULT '',
      github TEXT DEFAULT '',
      location TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      category TEXT DEFAULT '未分类',
      tags TEXT DEFAULT '',
      status TEXT DEFAULT 'published',
      view_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedData() {
  // 默认用户
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (username, password, nickname, avatar) VALUES (?, ?, ?, ?)`)
      .run('admin', hashedPassword, '管理员', '');
  }

  const profileCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get();
  if (profileCount.count === 0) {
    db.prepare(`
      INSERT INTO profiles (name, email, bio, website, github, location)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      '张三',
      'zhangsan@example.com',
      '一名热爱技术的全栈开发者，专注于 Web 开发和开源项目。喜欢分享技术心得，记录成长历程。',
      'https://example.com',
      'https://github.com/zhangsan',
      '北京'
    );
  }

  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  if (postCount.count === 0) {
    const posts = [
      {
        title: '使用 Node.js 构建 RESTful API 的最佳实践',
        content: `## 前言\n\n在现代 Web 开发中，RESTful API 是前后端分离架构的核心。本文将分享使用 Node.js 构建高质量 API 的经验。\n\n## 项目结构\n\n一个好的项目结构是成功的一半：\n\n\`\`\`\nserver/\n├── app.js          # 入口文件\n├── database.js     # 数据库配置\n├── routes/         # 路由定义\n└── middleware/     # 中间件\n\`\`\`\n\n## 错误处理\n\n统一的错误处理机制能让 API 更加健壮。建议使用中间件统一捕获和格式化错误响应。\n\n## 数据验证\n\n永远不要信任客户端数据，在服务端进行严格的数据验证是必须的。\n\n## 总结\n\n构建优秀的 API 需要关注结构设计、错误处理、数据验证等多个方面。`,
        summary: '分享使用 Node.js 构建高质量 RESTful API 的实践经验，涵盖项目结构、错误处理和数据验证。',
        category: '后端开发',
        tags: 'Node.js,Express,API',
        cover_image: '/images/nodejs.webp'
      },
      {
        title: '现代 CSS 布局技巧：Flexbox 与 Grid 实战',
        content: `## 引言\n\nCSS 布局经历了从 float 到 Flexbox 再到 Grid 的演进。掌握现代布局技术能大幅提升开发效率。\n\n## Flexbox 核心概念\n\nFlexbox 是一维布局模型，适合处理行或列方向的布局：\n\n- \`display: flex\` 创建弹性容器\n- \`justify-content\` 控制主轴对齐\n- \`align-items\` 控制交叉轴对齐\n\n## Grid 核心概念\n\nGrid 是二维布局模型，适合复杂的页面布局：\n\n- \`display: grid\` 创建网格容器\n- \`grid-template-columns\` 定义列\n- \`grid-template-rows\` 定义行\n\n## 实战案例\n\n结合 Flexbox 和 Grid 可以轻松实现响应式卡片布局、圣杯布局等常见需求。\n\n## 总结\n\n现代 CSS 布局让复杂的页面结构变得简单直观。`,
        summary: '深入探讨 Flexbox 和 Grid 两种现代 CSS 布局方案的核心概念与实战应用。',
        category: '前端开发',
        tags: 'CSS,Flexbox,Grid,布局',
        cover_image: '/images/css.webp'
      },
      {
        title: 'SQLite 在小型项目中的应用指南',
        content: `## 为什么选择 SQLite\n\nSQLite 是一个轻量级的嵌入式数据库，无需独立的服务器进程，非常适合小型项目和原型开发。\n\n## 优势\n\n- 零配置，无需安装\n- 单文件存储，便于备份\n- 支持标准 SQL 语法\n- 性能优秀，读取速度快\n\n## 在 Node.js 中使用\n\n推荐使用 better-sqlite3 库，它提供同步 API，使用简单：\n\n\`\`\`javascript\nconst Database = require('better-sqlite3');\nconst db = new Database('blog.db');\n\`\`\`\n\n## 注意事项\n\n- 写入并发有限制\n- 不适合高并发写入场景\n- 建议开启 WAL 模式提升性能\n\n## 总结\n\nSQLite 是小型项目的理想选择，简单高效。`,
        summary: '介绍 SQLite 数据库的特点和在 Node.js 小型项目中的实际应用方法。',
        category: '数据库',
        tags: 'SQLite,数据库,Node.js',
        cover_image: '/images/sqlite.webp'
      }
    ];

    const insert = db.prepare(`
      INSERT INTO posts (title, content, summary, category, tags, cover_image)
      VALUES (@title, @content, @summary, @category, @tags, @cover_image)
    `);

    for (const post of posts) {
      insert.run(post);
    }
  }
}

module.exports = { getDb };
