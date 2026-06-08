# ===== 构建阶段 =====
FROM node:18-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

# ===== 运行阶段 =====
FROM node:18-bookworm-slim

WORKDIR /app

# better-sqlite3 编译所需的原生依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY server/ ./server/
COPY index.html ./public/
COPY css/ ./public/css/
COPY js/ ./public/js/
COPY images/ ./public/images/

# 重新编译 better-sqlite3 以匹配目标平台（ARM64 / AMD64）
RUN npm rebuild better-sqlite3

# 创建数据目录
RUN mkdir -p /app/data

EXPOSE 8081

ENV PORT=8081
ENV NODE_ENV=production

CMD ["node", "server/app.js"]
