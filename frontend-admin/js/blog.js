// ===== 博客浏览页面 =====
let blogState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 9,
  keyword: '',
};

async function renderBlog() {
  const container = document.getElementById('page-blog');
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-input-wrapper" style="max-width:360px;">
          ${Icons.search}
          <input class="form-input" id="blogSearchInput" placeholder="搜索文章..." value="${blogState.keyword}" oninput="onBlogSearch(this.value)">
        </div>
      </div>
    </div>
    <div id="blogGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;align-items:stretch;">
      <div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--color-text-placeholder);">加载中...</div>
    </div>
    <div id="blogPagination"></div>
  `;
  await loadBlogPosts();
}

async function loadBlogPosts() {
  try {
    const params = { page: blogState.page, pageSize: blogState.pageSize, status: 'published' };
    if (blogState.keyword) params.keyword = blogState.keyword;
    const res = await api.getPosts(params);
    blogState.list = res.data.list;
    blogState.total = res.data.total;
    renderBlogGrid();
    renderBlogPagination();
  } catch (e) {
    showToast('加载博客失败', 'error');
  }
}

function renderBlogGrid() {
  const container = document.getElementById('blogGrid');
  if (!container) return;

  if (blogState.list.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        ${Icons.fileText}
        <p>暂无已发布的文章</p>
      </div>
    `;
    return;
  }

  container.innerHTML = blogState.list.map(post => `
    <div class="card blog-card" style="cursor:pointer;overflow:hidden;display:flex;flex-direction:column;" onclick="viewArticle(${post.id})">
      ${post.cover_image ? `
        <div style="height:180px;overflow:hidden;flex-shrink:0;">
          <img src="${post.cover_image}" alt="${post.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">
        </div>
      ` : `
        <div style="height:180px;background:linear-gradient(135deg,var(--color-primary-bg),#E0E7FF);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:48px;font-weight:700;color:var(--color-primary);opacity:0.3;">${post.title.charAt(0)}</span>
        </div>
      `}
      <div style="padding:16px;display:flex;flex-direction:column;flex:1;">
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
          <span class="tag tag-blue">${post.category}</span>
          ${post.status === 'draft' ? '<span class="tag tag-orange">草稿</span>' : ''}
        </div>
        <h3 style="font-size:16px;font-weight:600;color:var(--color-text-primary);margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${post.title}</h3>
        <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px;">${post.summary || truncate(post.content.replace(/[#*`>\-]/g, ''), 100)}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--color-text-placeholder);margin-top:auto;padding-top:12px;border-top:1px solid var(--color-border-light);">
          <span>${formatShortDate(post.created_at)}</span>
          <span style="display:flex;align-items:center;gap:4px;">${Icons.eye} ${post.view_count}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderBlogPagination() {
  const container = document.getElementById('blogPagination');
  if (!container) return;
  const totalPages = Math.ceil(blogState.total / blogState.pageSize);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let btns = `<span class="pagination-info">共 ${blogState.total} 篇文章</span>`;
  btns += `<button class="pagination-btn" ${blogState.page <= 1 ? 'disabled' : ''} onclick="goBlogPage(${blogState.page - 1})">${Icons.chevronLeft}</button>`;
  for (let i = 1; i <= totalPages; i++) {
    btns += `<button class="pagination-btn ${i === blogState.page ? 'active' : ''}" onclick="goBlogPage(${i})">${i}</button>`;
  }
  btns += `<button class="pagination-btn" ${blogState.page >= totalPages ? 'disabled' : ''} onclick="goBlogPage(${blogState.page + 1})">${Icons.chevronRight}</button>`;
  container.innerHTML = `<div class="pagination">${btns}</div>`;
}

function goBlogPage(page) {
  blogState.page = page;
  loadBlogPosts();
}

const onBlogSearch = debounce(function (val) {
  blogState.keyword = val;
  blogState.page = 1;
  loadBlogPosts();
}, 400);

// 文章详情
async function viewArticle(id) {
  navigateTo('article');
  const container = document.getElementById('page-article');
  container.innerHTML = '<div style="text-align:center;padding:48px;color:var(--color-text-placeholder);">加载中...</div>';

  try {
    const res = await api.getPost(id);
    const post = res.data;

    container.innerHTML = `
      <div style="max-width:800px;margin:0 auto;">
        <button class="btn btn-default btn-sm" onclick="navigateTo(window._prevPage||'blog')" style="margin-bottom:16px;">
          ${Icons.arrowLeft} 返回
        </button>
        <div class="card">
          ${post.cover_image ? `<div class="article-cover"><img src="${post.cover_image}" alt="${post.title}"></div>` : ''}
          <div class="card-body">
            <div class="article-header">
              <h1 class="article-title">${post.title}</h1>
              <div class="article-meta">
                <span>${Icons.folder} ${post.category}</span>
                <span>${Icons.calendar} ${formatDate(post.created_at)}</span>
                <span>${Icons.eye} ${post.view_count} 次阅读</span>
                ${post.tags ? `<span>${Icons.tag} ${post.tags}</span>` : ''}
              </div>
            </div>
            <div class="preview-content">${markdownToHtml(post.content)}</div>
          </div>
        </div>

        <div class="card" style="margin-top:16px;">
          <div class="card-header">
            <span class="card-title">评论 <span id="commentCount" style="color:var(--color-text-placeholder);font-weight:400;font-size:13px;margin-left:6px;">(0)</span></span>
          </div>
          <div class="card-body">
            <div id="commentForm" style="margin-bottom:24px;padding:16px;background:var(--color-primary-bg);border-radius:var(--radius-md);border:1px solid #DBEAFE;">
              <div class="form-row">
                <div class="form-group" style="margin-bottom:12px;">
                  <label class="form-label">昵称 <span class="required">*</span></label>
                  <input class="form-input" id="commentAuthorName" maxlength="50" placeholder="请输入昵称">
                </div>
                <div class="form-group" style="margin-bottom:12px;">
                  <label class="form-label">邮箱（可选）</label>
                  <input class="form-input" id="commentAuthorEmail" maxlength="100" placeholder="example@mail.com">
                </div>
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">评论内容 <span class="required">*</span></label>
                <textarea class="form-textarea" id="commentContent" rows="3" maxlength="2000" placeholder="说点什么吧..."></textarea>
              </div>
              <div style="display:flex;justify-content:flex-end;">
                <button class="btn btn-primary" id="commentSubmitBtn" onclick="submitComment(${post.id})">
                  ${Icons.plus} 发表评论
                </button>
              </div>
              <div style="font-size:12px;color:var(--color-text-placeholder);margin-top:8px;">提示：评论提交后需经管理员审核才会显示。</div>
            </div>
            <div id="commentList">
              <div style="text-align:center;padding:24px;color:var(--color-text-placeholder);">加载评论中...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    loadArticleComments(post.id);
  } catch (e) {
    container.innerHTML = `
      <div class="empty-state">
        ${Icons.warning}
        <p>文章加载失败</p>
        <button class="btn btn-primary" onclick="navigateTo('blog')">返回博客</button>
      </div>
    `;
  }
}

// 加载文章评论
async function loadArticleComments(postId) {
  const listEl = document.getElementById('commentList');
  const countEl = document.getElementById('commentCount');
  if (!listEl) return;
  try {
    const res = await api.getPostComments(postId);
    const list = res.data || [];
    if (countEl) countEl.textContent = `(${list.length})`;
    if (list.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:32px;">
          ${Icons.fileText}
          <p>暂无评论，快来抢沙发吧～</p>
        </div>
      `;
      return;
    }
    // 构建嵌套结构（一层回复）
    const roots = list.filter(c => !c.parent_id);
    const childrenMap = {};
    list.forEach(c => {
      if (c.parent_id) {
        (childrenMap[c.parent_id] = childrenMap[c.parent_id] || []).push(c);
      }
    });

    listEl.innerHTML = roots.map(c => renderCommentItem(c, childrenMap[c.id] || [])).join('');
  } catch (e) {
    listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--color-danger);">评论加载失败</div>';
  }
}

function renderCommentItem(c, replies) {
  const adminBadge = c.is_admin
    ? '<span class="tag tag-blue" style="margin-left:6px;">管理员</span>'
    : '';
  const initial = (c.author_name || '?').charAt(0).toUpperCase();
  const repliesHtml = replies.length === 0 ? '' : `
    <div style="margin-top:12px;padding-left:16px;border-left:2px solid var(--color-border-light);display:flex;flex-direction:column;gap:12px;">
      ${replies.map(r => `
        <div style="display:flex;gap:10px;">
          <div class="user-avatar" style="width:28px;height:28px;font-size:12px;flex-shrink:0;background:${r.is_admin ? 'var(--color-primary)' : 'var(--color-success)'};color:#fff;">${(r.author_name || '?').charAt(0).toUpperCase()}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);">
              ${escapeHtml(r.author_name)}
              ${r.is_admin ? '<span class="tag tag-blue" style="margin-left:6px;">管理员</span>' : ''}
              <span style="font-weight:400;color:var(--color-text-placeholder);font-size:12px;margin-left:8px;">${formatDate(r.created_at)}</span>
            </div>
            <div style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;margin-top:4px;white-space:pre-wrap;word-break:break-word;">${escapeHtml(r.content)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  return `
    <div style="display:flex;gap:12px;padding:16px 0;border-bottom:1px solid var(--color-border-light);">
      <div class="user-avatar" style="width:36px;height:36px;font-size:14px;flex-shrink:0;background:${c.is_admin ? 'var(--color-primary)' : 'var(--color-success)'};color:#fff;">${initial}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;font-size:14px;font-weight:600;color:var(--color-text-primary);">
          ${escapeHtml(c.author_name)}${adminBadge}
          <span style="font-weight:400;color:var(--color-text-placeholder);font-size:12px;margin-left:8px;">${formatDate(c.created_at)}</span>
        </div>
        <div style="font-size:14px;color:var(--color-text-secondary);line-height:1.7;margin-top:6px;white-space:pre-wrap;word-break:break-word;">${escapeHtml(c.content)}</div>
        ${repliesHtml}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function submitComment(postId) {
  const nameEl = document.getElementById('commentAuthorName');
  const emailEl = document.getElementById('commentAuthorEmail');
  const contentEl = document.getElementById('commentContent');
  const btn = document.getElementById('commentSubmitBtn');
  if (!nameEl || !contentEl) return;

  const author_name = nameEl.value.trim();
  const author_email = emailEl ? emailEl.value.trim() : '';
  const content = contentEl.value.trim();

  if (!author_name) { showToast('请输入昵称', 'warning'); return; }
  if (!content) { showToast('请输入评论内容', 'warning'); return; }

  btn.classList.add('loading');
  btn.disabled = true;
  try {
    await api.createComment({ post_id: postId, author_name, author_email, content });
    showToast('评论已提交，等待审核', 'success');
    contentEl.value = '';
  } catch (e) {
    showToast('评论失败: ' + e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}
