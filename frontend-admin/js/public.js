// ===== 前台访客页面（无需登录） =====
const API_BASE = '/api';

async function publicRequest(url) {
  try {
    const response = await fetch(API_BASE + url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '请求失败');
    return data;
  } catch (error) {
    throw new Error('网络连接失败');
  }
}

async function publicPost(url, body) {
  try {
    const response = await fetch(API_BASE + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '请求失败');
    return data;
  } catch (error) {
    throw new Error(error.message || '网络连接失败');
  }
}

let pubState = {
  posts: [],
  total: 0,
  page: 1,
  pageSize: 9,
  keyword: '',
  categories: [],
  currentCategory: '全部',
  currentPost: null,
  comments: [],
};

document.addEventListener('DOMContentLoaded', function () {
  showPublicHome();
});

function showPublicHome() {
  pubState.page = 1;
  pubState.keyword = '';
  pubState.currentCategory = '全部';
  renderPublicHome();
  loadPublicCategories();
  loadPublicPosts();
  window.scrollTo(0, 0);
}

function renderPublicHome() {
  const main = document.getElementById('publicMain');
  main.innerHTML = `
    <div class="public-hero">
      <h1>欢迎来到我的博客</h1>
      <p>分享技术心得，记录成长历程</p>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
      <div class="search-input-wrapper" style="max-width:360px;flex:1;min-width:240px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--color-text-placeholder);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="form-input" id="pubSearchInput" placeholder="搜索文章..." value="${pubState.keyword}" oninput="onPubSearch(this.value)" style="padding-left:34px;">
      </div>
      <div class="filter-tabs" id="pubCategoryTabs" style="flex-wrap:wrap;">
        <button class="filter-tab active">全部</button>
      </div>
    </div>
    <div id="pubPostsGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;align-items:stretch;">
      <div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--color-text-placeholder);">加载中...</div>
    </div>
    <div id="pubPagination" style="margin-top:24px;"></div>
  `;
}

async function loadPublicCategories() {
  try {
    const res = await publicRequest('/posts/categories');
    pubState.categories = res.data || [];
    const tabsEl = document.getElementById('pubCategoryTabs');
    if (tabsEl) {
      tabsEl.innerHTML = `
        <button class="filter-tab ${pubState.currentCategory === '全部' ? 'active' : ''}" onclick="filterPubCategory('全部')">全部</button>
        ${pubState.categories.map(c => `<button class="filter-tab ${pubState.currentCategory === c ? 'active' : ''}" onclick="filterPubCategory('${c}')">${c}</button>`).join('')}
      `;
    }
  } catch (e) { /* ignore */ }
}

async function loadPublicPosts() {
  try {
    const params = new URLSearchParams({
      page: pubState.page,
      pageSize: pubState.pageSize,
      status: 'published'
    });
    if (pubState.keyword) params.append('keyword', pubState.keyword);
    if (pubState.currentCategory !== '全部') params.append('category', pubState.currentCategory);
    const res = await publicRequest('/posts?' + params.toString());
    pubState.posts = res.data.list;
    pubState.total = res.data.total;
    renderPublicGrid();
    renderPublicPagination();
  } catch (e) {
    const grid = document.getElementById('pubPostsGrid');
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p>加载失败</p></div>`;
  }
}

function renderPublicGrid() {
  const container = document.getElementById('pubPostsGrid');
  if (!container) return;
  if (pubState.posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <p>暂无已发布的文章</p>
      </div>
    `;
    return;
  }
  container.innerHTML = pubState.posts.map(post => `
    <div class="card blog-card" style="cursor:pointer;overflow:hidden;display:flex;flex-direction:column;" onclick="viewPublicArticle(${post.id})">
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
        </div>
        <h3 style="font-size:16px;font-weight:600;color:var(--color-text-primary);margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${post.title}</h3>
        <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px;">${post.summary || truncate(post.content.replace(/[#*`>\-]/g, ''), 100)}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--color-text-placeholder);margin-top:auto;padding-top:12px;border-top:1px solid var(--color-border-light);">
          <span>${formatShortDate(post.created_at)}</span>
          <span style="display:flex;align-items:center;gap:4px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${post.view_count}
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderPublicPagination() {
  const container = document.getElementById('pubPagination');
  if (!container) return;
  const totalPages = Math.ceil(pubState.total / pubState.pageSize);
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  let btns = `<span class="pagination-info" style="margin-right:8px;color:var(--color-text-placeholder);font-size:13px;">共 ${pubState.total} 篇文章</span>`;
  btns += `<button class="pagination-btn" ${pubState.page <= 1 ? 'disabled' : ''} onclick="goPubPage(${pubState.page - 1})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="15 18 9 12 15 6"/></svg></button>`;
  for (let i = 1; i <= totalPages; i++) {
    btns += `<button class="pagination-btn ${i === pubState.page ? 'active' : ''}" onclick="goPubPage(${i})">${i}</button>`;
  }
  btns += `<button class="pagination-btn" ${pubState.page >= totalPages ? 'disabled' : ''} onclick="goPubPage(${pubState.page + 1})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="9 18 15 12 9 6"/></svg></button>`;
  container.innerHTML = `<div class="pagination" style="justify-content:center;">${btns}</div>`;
}

function goPubPage(page) {
  pubState.page = page;
  loadPublicPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const onPubSearch = debounce(function (val) {
  pubState.keyword = val;
  pubState.page = 1;
  loadPublicPosts();
}, 400);

function filterPubCategory(cat) {
  pubState.currentCategory = cat;
  pubState.page = 1;
  loadPublicPosts();
  loadPublicCategories();
}

async function viewPublicArticle(id) {
  const main = document.getElementById('publicMain');
  main.innerHTML = '<div style="text-align:center;padding:80px;color:var(--color-text-placeholder);">加载中...</div>';
  window.scrollTo(0, 0);
  try {
    const [postRes, commentsRes, countRes] = await Promise.all([
      publicRequest('/posts/' + id),
      publicRequest('/comments/post/' + id).catch(() => ({ data: [] })),
      publicRequest('/comments/post/' + id + '/count').catch(() => ({ data: { count: 0 } }))
    ]);
    pubState.currentPost = postRes.data;
    pubState.comments = commentsRes.data || [];
    renderPublicArticle();
  } catch (e) {
    main.innerHTML = `
      <div class="empty-state">
        <p>文章加载失败</p>
        <button class="btn btn-primary" onclick="showPublicHome()" style="margin-top:16px;">返回首页</button>
      </div>
    `;
  }
}

function renderPublicArticle() {
  const post = pubState.currentPost;
  const main = document.getElementById('publicMain');
  main.innerHTML = `
    <button class="back-btn" onclick="showPublicHome()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      返回文章列表
    </button>
    <div class="card">
      ${post.cover_image ? `<div class="article-cover"><img src="${post.cover_image}" alt="${post.title}"></div>` : ''}
      <div class="card-body">
        <div class="article-header">
          <h1 class="article-title">${post.title}</h1>
          <div class="article-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              ${post.category}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(post.created_at)}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ${post.view_count} 次阅读
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${pubState.comments.length} 条评论
            </span>
            ${post.tags ? `<span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              ${post.tags}
            </span>` : ''}
          </div>
        </div>
        <div class="preview-content">${markdownToHtml(post.content)}</div>
      </div>
    </div>

    <div class="card" style="margin-top:24px;">
      <div class="card-body">
        <h3 style="font-size:18px;font-weight:600;color:var(--color-text-primary);margin-bottom:20px;display:flex;align-items:center;gap:8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          评论 (${pubState.comments.length})
        </h3>

        <div class="comment-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">昵称 <span class="required">*</span></label>
              <input class="form-input" id="pubCommentNickname" placeholder="请输入您的昵称" maxlength="50">
            </div>
            <div class="form-group">
              <label class="form-label">邮箱（选填）</label>
              <input class="form-input" id="pubCommentEmail" type="email" placeholder="不会公开显示" maxlength="100">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">评论内容 <span class="required">*</span></label>
            <textarea class="form-textarea" id="pubCommentContent" rows="3" placeholder="写下您的看法..." maxlength="1000"></textarea>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button class="btn btn-primary" id="pubSubmitCommentBtn" onclick="submitPubComment()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              发表评论
            </button>
          </div>
          <div id="pubCommentNotice" style="margin-top:12px;font-size:13px;color:var(--color-text-placeholder);display:none;text-align:center;"></div>
        </div>

        <div style="margin-top:24px;">
          ${renderPubComments()}
        </div>
      </div>
    </div>
  `;
}

function renderPubComments() {
  if (pubState.comments.length === 0) {
    return `
      <div style="text-align:center;padding:40px 0;color:var(--color-text-placeholder);">
        <p style="font-size:14px;margin-top:8px;">暂无评论，快来发表第一条评论吧！</p>
      </div>
    `;
  }
  return pubState.comments.map(c => `
    <div class="comment-item">
      <div class="comment-header">
        <div class="comment-avatar">${getInitials(c.nickname)}</div>
        <div class="comment-info">
          <div class="comment-nickname">${escapePubHtml(c.nickname)}</div>
          <div class="comment-time">${formatDate(c.created_at)}</div>
        </div>
      </div>
      <div class="comment-content">${escapePubHtml(c.content)}</div>
      ${c.reply ? `
        <div class="comment-reply">
          <div class="comment-reply-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            管理员回复 · ${formatDate(c.reply_at)}
          </div>
          <div class="comment-reply-content">${escapePubHtml(c.reply)}</div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function submitPubComment() {
  const nickname = document.getElementById('pubCommentNickname').value.trim();
  const email = document.getElementById('pubCommentEmail').value.trim();
  const content = document.getElementById('pubCommentContent').value.trim();
  const noticeEl = document.getElementById('pubCommentNotice');
  if (!nickname) { if (noticeEl) { noticeEl.style.display='block'; noticeEl.style.color='var(--color-danger)'; noticeEl.textContent='请输入昵称'; } return; }
  if (!content) { if (noticeEl) { noticeEl.style.display='block'; noticeEl.style.color='var(--color-danger)'; noticeEl.textContent='请输入评论内容'; } return; }

  const btn = document.getElementById('pubSubmitCommentBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    await publicPost('/comments', { post_id: pubState.currentPost.id, nickname, email, content });
    document.getElementById('pubCommentNickname').value = '';
    document.getElementById('pubCommentEmail').value = '';
    document.getElementById('pubCommentContent').value = '';
    if (noticeEl) {
      noticeEl.style.display = 'block';
      noticeEl.style.color = 'var(--color-success)';
      noticeEl.textContent = '评论提交成功，等待审核通过后显示';
    }
    showToast('评论提交成功，等待审核', 'success');
  } catch (e) {
    if (noticeEl) {
      noticeEl.style.display = 'block';
      noticeEl.style.color = 'var(--color-danger)';
      noticeEl.textContent = '提交失败: ' + e.message;
    }
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function escapePubHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Toast 提示（前台轻量版）
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:100;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const colors = { success: '#16A34A', error: '#DC2626', warning: '#D97706', info: '#2563EB' };
  const toast = document.createElement('div');
  toast.style.cssText = `padding:12px 20px;background:#fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-left:4px solid ${colors[type] || colors.info};font-size:14px;animation:slideIn 0.3s ease forwards;min-width:240px;`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

const style = document.createElement('style');
style.textContent = `
@keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
@keyframes slideOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(40px); } }
`;
document.head.appendChild(style);
