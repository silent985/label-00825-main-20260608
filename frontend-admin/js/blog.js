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

let articleComments = [];
let currentPostId = null;

// 文章详情
async function viewArticle(id) {
  navigateTo('article');
  currentPostId = id;
  const container = document.getElementById('page-article');
  container.innerHTML = '<div style="text-align:center;padding:48px;color:var(--color-text-placeholder);">加载中...</div>';

  try {
    const [postRes, commentsRes] = await Promise.all([
      api.getPost(id),
      api.getCommentsByPost(id).catch(() => ({ data: [] }))
    ]);
    const post = postRes.data;
    articleComments = commentsRes.data || [];

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
                <span>${Icons.user} ${articleComments.length} 条评论</span>
                ${post.tags ? `<span>${Icons.tag} ${post.tags}</span>` : ''}
              </div>
            </div>
            <div class="preview-content">${markdownToHtml(post.content)}</div>
          </div>
        </div>

        <div class="card" style="margin-top:24px;">
          <div class="card-body">
            <h3 style="font-size:18px;font-weight:600;color:var(--color-text-primary);margin-bottom:20px;display:flex;align-items:center;gap:8px;">
              ${Icons.user} 评论 (${articleComments.length})
            </h3>

            <div class="comment-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">昵称 <span class="required">*</span></label>
                  <input class="form-input" id="commentNickname" placeholder="请输入您的昵称" maxlength="50">
                </div>
                <div class="form-group">
                  <label class="form-label">邮箱（选填）</label>
                  <input class="form-input" id="commentEmail" type="email" placeholder="不会公开显示" maxlength="100">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">评论内容 <span class="required">*</span></label>
                <textarea class="form-textarea" id="commentContent" rows="3" placeholder="写下您的看法..." maxlength="1000"></textarea>
              </div>
              <div style="display:flex;justify-content:flex-end;">
                <button class="btn btn-primary" id="submitCommentBtn" onclick="submitArticleComment()">
                  ${Icons.edit} 发表评论
                </button>
              </div>
            </div>

            <div id="commentList" style="margin-top:24px;">
              ${renderArticleComments()}
            </div>
          </div>
        </div>
      </div>
    `;
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

function renderArticleComments() {
  if (articleComments.length === 0) {
    return `
      <div style="text-align:center;padding:40px 0;color:var(--color-text-placeholder);">
        ${Icons.fileText}
        <p style="margin-top:8px;font-size:14px;">暂无评论，快来发表第一条评论吧！</p>
      </div>
    `;
  }
  return articleComments.map(c => `
    <div class="comment-item">
      <div class="comment-header">
        <div class="comment-avatar">${getInitials(c.nickname)}</div>
        <div class="comment-info">
          <div class="comment-nickname">${escapeArticleHtml(c.nickname)}</div>
          <div class="comment-time">${formatDate(c.created_at)}</div>
        </div>
      </div>
      <div class="comment-content">${escapeArticleHtml(c.content)}</div>
      ${c.reply ? `
        <div class="comment-reply">
          <div class="comment-reply-header">
            ${Icons.user} 管理员回复 · ${formatDate(c.reply_at)}
          </div>
          <div class="comment-reply-content">${escapeArticleHtml(c.reply)}</div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function submitArticleComment() {
  const nickname = document.getElementById('commentNickname').value.trim();
  const email = document.getElementById('commentEmail').value.trim();
  const content = document.getElementById('commentContent').value.trim();
  if (!nickname) { showToast('请输入昵称', 'warning'); return; }
  if (!content) { showToast('请输入评论内容', 'warning'); return; }

  const btn = document.getElementById('submitCommentBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    await api.submitComment({ post_id: currentPostId, nickname, email, content });
    showToast('评论提交成功，等待审核', 'success');
    document.getElementById('commentNickname').value = '';
    document.getElementById('commentEmail').value = '';
    document.getElementById('commentContent').value = '';
  } catch (e) {
    showToast('提交失败: ' + e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function escapeArticleHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
