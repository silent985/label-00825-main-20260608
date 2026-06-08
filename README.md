# 个人博客系统

## How to Run

### 方式一：Docker 运行（推荐）

```bash
# 构建并启动
docker compose up --build -d

# 访问前端
open http://localhost:8081
```

### 方式二：本地运行

```bash
cd frontend-admin

# 安装依赖
npm install

# 启动服务
npm start

# 访问
open http://localhost:8081
```

### 停止服务

```bash
# Docker 方式
docker compose down

# 本地方式
# Ctrl + C 终止进程
```

## Services

| 服务 | 容器名 | 对外端口 | 说明 |
|------|--------|----------|------|
| frontend-admin | blog-frontend-admin | 8081 | 前端页面 + 后端 API |

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前登录用户 |
| POST | /api/auth/logout | 退出登录 |
| GET | /api/posts | 获取文章列表（支持分页、搜索、分类筛选） |
| GET | /api/posts/:id | 获取文章详情 |
| POST | /api/posts | 创建文章 |
| PUT | /api/posts/:id | 更新文章 |
| DELETE | /api/posts/:id | 删除文章 |
| GET | /api/posts/categories | 获取分类列表 |
| GET | /api/profiles | 获取个人资料列表 |
| GET | /api/profiles/:id | 获取个人资料详情 |
| POST | /api/profiles | 创建个人资料 |
| PUT | /api/profiles/:id | 更新个人资料 |
| DELETE | /api/profiles/:id | 删除个人资料 |
| GET | /api/stats | 获取统计数据 |
| POST | /api/upload | 上传图片文件 |

## 项目结构

```
├── frontend-admin/               # 前端 + 后端一体化项目
│   ├── css/
│   │   ├── variables.css         # 设计系统变量（颜色、间距、字体等）
│   │   ├── layout.css            # 全局布局样式（侧边栏、头部、响应式）
│   │   └── components.css        # UI 组件样式（按钮、表单、卡片、弹窗等）
│   ├── images/
│   │   ├── nodejs.webp           # 默认文章封面图
│   │   ├── css.webp              # 默认文章封面图
│   │   └── sqlite.webp           # 默认文章封面图
│   ├── js/
│   │   ├── utils.js              # 工具函数、自定义下拉框、SVG 图标集
│   │   ├── api.js                # API 请求封装（fetch wrapper）
│   │   ├── toast.js              # Toast 消息提示组件
│   │   ├── modal.js              # 对话框与确认弹窗组件
│   │   ├── auth.js               # 登录认证与用户状态管理
│   │   ├── dashboard.js          # 仪表盘页面
│   │   ├── posts.js              # 文章管理页面（含 Markdown 编辑器）
│   │   ├── profiles.js           # 个人资料管理页面
│   │   ├── blog.js               # 博客浏览与文章详情页面
│   │   └── app.js                # 应用主入口（路由、初始化）
│   ├── server/
│   │   ├── app.js                # Express 服务入口（中间件、静态文件、上传）
│   │   ├── database.js           # SQLite 数据库初始化与种子数据
│   │   ├── routes-auth.js        # 认证路由（登录、登出、当前用户）
│   │   ├── routes-posts.js       # 文章 CRUD 路由
│   │   └── routes-profiles.js    # 个人资料 CRUD 路由
│   ├── index.html                # SPA 主页面（登录页 + 管理后台）
│   ├── package.json              # 项目依赖
│   ├── .dockerignore             # Docker 构建忽略规则
│   └── Dockerfile                # Docker 构建文件
├── docker-compose.yml            # Docker Compose 编排
├── .gitignore                    # Git 忽略规则
└── README.md                     # 项目说明
```

## 技术栈

- 前端：HTML + CSS + 原生 JavaScript（SPA 单页应用）
- 后端：Node.js + Express
- 数据库：SQLite（better-sqlite3）
- 文件上传：Multer
- 容器化：Docker + Docker Compose

## 默认账号

| 用户名 | 密码 | 昵称 |
|--------|------|------|
| admin | admin123 | 管理员 |

启动后系统会自动初始化以下测试数据：

- 默认用户：admin（管理员）
- 默认个人资料：张三（zhangsan@example.com）
- 默认文章：3 篇示例博客文章（含本地封面图）

## 功能特性

- 登录认证：用户登录、退出登录、Token 鉴权、页面刷新保持状态
- 仪表盘：统计概览、最新文章、快捷操作（跳转并打开对应弹窗）
- 文章管理：创建、编辑、删除、搜索、分类筛选、分页、封面图片本地上传
- 文章编辑：Markdown 编辑器（工具栏 + 实时预览）
- 个人资料：添加、修改、删除、查询
- 博客浏览：卡片式布局、文章详情阅读、返回入口页面
- 自定义组件：Element-Plus 风格下拉框、Toast 消息提示、确认对话框
- 响应式设计：适配桌面端和移动端
- 页面状态保持：刷新页面恢复到当前激活菜单
