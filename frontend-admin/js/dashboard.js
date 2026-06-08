// ===== 仪表盘页面 =====
async function renderDashboard() {
  const container = document.getElementById('page-dashboard');
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" onclick="navigateTo('posts')">
        <div class="stat-icon blue">${Icons.fileText}</div>
        <div class="stat-info">
          <div class="stat-value" id="statPosts">-</div>
          <div class="stat-label">文章总数</div>
        </div>
      </div>
      <div class="stat-card" onclick="navigateTo('comments')">
        <div class="stat-icon" style="background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:#fff;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-value" id="statComments">-</div>
          <div class="stat-label">评论总数 <span id="pendingBadge" style="display:none;color:var(--color-warning);font-size:12px;font-weight:500;"></span></div>
        </div>
      </div>
      <div class="stat-card" onclick="navigateTo('profiles')">
        <div class="stat-icon green">${Icons.user}</div>
        <div class="stat-info">
          <div class="stat-value" id="statProfiles">-</div>
          <div class="stat-label">个人资料</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">${Icons.eye}</div>
        <div class="stat-info">
          <div class="stat-value" id="statViews">-</div>
          <div class="stat-label">总浏览量</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">${Icons.folder}</div>
        <div class="stat-info">
          <div class="stat-value" id="statCategories">-</div>
          <div class="stat-label">文章分类</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">最新文章</span>
          <button class="btn btn-text btn-sm" onclick="navigateTo('posts')">查看全部 ${Icons.chevronRight}</button>
        </div>
        <div class="card-body" id="dashRecentPosts" style="padding:0;">
          <div style="padding:24px;text-align:center;color:var(--color-text-placeholder);">加载中...</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">快捷操作</span>
        </div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:12px;">
            <button class="btn btn-primary btn-lg" style="justify-content:flex-start;" onclick="navigateTo('posts');setTimeout(()=>openPostForm(),300);">
              ${Icons.plus} 写新文章
            </button>
            <button class="btn btn-success btn-lg" style="justify-content:flex-start;" onclick="navigateTo('profiles');setTimeout(()=>openProfileForm(),300);">
              ${Icons.user} 添加个人资料
            </button>
            <button class="btn btn-default btn-lg" style="justify-content:flex-start;" onclick="navigateTo('blog')">
              ${Icons.eye} 浏览博客
            </button>
          </div>
          <div style="margin-top:24px;padding:16px;background:var(--color-primary-bg);border-radius:var(--radius-md);border:1px solid #DBEAFE;">
            <div style="font-weight:600;color:var(--color-primary);margin-bottom:8px;font-size:14px;">系统信息</div>
            <div style="font-size:13px;color:var(--color-text-secondary);line-height:1.8;">
              <div>存储引擎：SQLite</div>
              <div>前端技术：HTML + CSS + JavaScript</div>
              <div>后端技术：Node.js + Express</div>
              <div>运行端口：8081</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 加载统计数据
  try {
    const res = await api.getStats();
    document.getElementById('statPosts').textContent = res.data.postCount;
    document.getElementById('statComments').textContent = res.data.commentCount || 0;
    document.getElementById('statProfiles').textContent = res.data.profileCount;
    document.getElementById('statViews').textContent = res.data.totalViews;
    document.getElementById('statCategories').textContent = res.data.categories;
    if (res.data.pendingComments > 0) {
      const badge = document.getElementById('pendingBadge');
      badge.style.display = 'inline';
      badge.textContent = `(${res.data.pendingComments} 待审)`;
    }
  } catch (e) {
    showToast('加载统计数据失败', 'error');
  }

  // 加载最新文章
  try {
    const res = await api.getPosts({ page: 1, pageSize: 5 });
    const list = res.data.list;
    if (list.length === 0) {
      document.getElementById('dashRecentPosts').innerHTML = `
        <div class="empty-state" style="padding:24px;">
          ${Icons.fileText}
          <p>暂无文章，快去写一篇吧</p>
        </div>
      `;
    } else {
      document.getElementById('dashRecentPosts').innerHTML = list.map(post => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--color-border-light);cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#FAFAFA'" onmouseout="this.style.background=''" onclick="viewArticle(${post.id})">
          <div style="min-width:0;flex:1;">
            <div style="font-weight:500;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${post.title}</div>
            <div style="font-size:12px;color:var(--color-text-placeholder);margin-top:2px;">${formatShortDate(post.created_at)} · ${post.category}</div>
          </div>
          <span class="tag tag-blue" style="flex-shrink:0;margin-left:12px;">${post.view_count} 阅读</span>
        </div>
      `).join('');
    }
  } catch (e) {
    document.getElementById('dashRecentPosts').innerHTML = '<div style="padding:24px;text-align:center;color:var(--color-danger);">加载失败</div>';
  }
}
