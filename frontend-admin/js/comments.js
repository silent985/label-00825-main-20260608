// ===== 评论管理页面 =====
let commentsState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
  keyword: '',
  status: 'all',
};

const commentStatusTabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
];

async function renderComments() {
  const container = document.getElementById('page-comments');
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-input-wrapper" style="max-width:320px;">
          ${Icons.search}
          <input class="form-input" id="commentSearchInput" placeholder="搜索昵称、内容、文章..." value="${commentsState.keyword}" oninput="onCommentSearch(this.value)">
        </div>
        <div class="filter-tabs" id="commentStatusTabs">
          ${commentStatusTabs.map(t => `
            <button class="filter-tab ${commentsState.status === t.key ? 'active' : ''}" onclick="filterCommentStatus('${t.key}')">${t.label}</button>
          `).join('')}
        </div>
      </div>
    </div>
    <div id="commentStatsBar" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;"></div>
    <div id="commentsListContainer">
      <div style="text-align:center;padding:48px;color:var(--color-text-placeholder);">加载中...</div>
    </div>
    <div id="commentsPagination"></div>
  `;
  await loadCommentStats();
  await loadComments();
}

async function loadCommentStats() {
  try {
    const res = await api.getCommentStats();
    const stats = res.data;
    const bar = document.getElementById('commentStatsBar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="stat-mini-card">
        <div class="stat-mini-value">${stats.total}</div>
        <div class="stat-mini-label">总评论</div>
      </div>
      <div class="stat-mini-card pending">
        <div class="stat-mini-value">${stats.pending}</div>
        <div class="stat-mini-label">待审核</div>
      </div>
      <div class="stat-mini-card approved">
        <div class="stat-mini-value">${stats.approved}</div>
        <div class="stat-mini-label">已通过</div>
      </div>
      <div class="stat-mini-card replied">
        <div class="stat-mini-value">${stats.replied}</div>
        <div class="stat-mini-label">已回复</div>
      </div>
    `;
  } catch (e) { /* ignore */ }
}

async function loadComments() {
  try {
    const params = {
      page: commentsState.page,
      pageSize: commentsState.pageSize,
    };
    if (commentsState.keyword) params.keyword = commentsState.keyword;
    if (commentsState.status !== 'all') params.status = commentsState.status;
    const res = await api.getComments(params);
    commentsState.list = res.data.list;
    commentsState.total = res.data.total;
    renderCommentsList();
    renderCommentsPagination();
  } catch (e) {
    showToast('加载评论失败: ' + e.message, 'error');
  }
}

function getStatusTag(status) {
  switch (status) {
    case 'pending': return '<span class="tag tag-orange">待审核</span>';
    case 'approved': return '<span class="tag tag-green">已通过</span>';
    case 'rejected': return '<span class="tag tag-red">已驳回</span>';
    default: return '<span class="tag tag-gray">' + status + '</span>';
  }
}

function renderCommentsList() {
  const container = document.getElementById('commentsListContainer');
  if (!container) return;
  if (commentsState.list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${Icons.fileText}
        <p>暂无评论</p>
      </div>
    `;
    return;
  }
  container.innerHTML = `<div class="comment-admin-list">${commentsState.list.map(c => `
    <div class="comment-admin-card">
      <div class="comment-admin-header">
        <div class="comment-admin-user">
          <div class="comment-admin-avatar">${getInitials(c.nickname)}</div>
          <div>
            <div class="comment-admin-nickname">${escapeHtml(c.nickname)} ${c.email ? `<span class="comment-admin-email">${escapeHtml(c.email)}</span>` : ''}</div>
            <div class="comment-admin-meta">
              <span>${Icons.calendar} ${formatDate(c.created_at)}</span>
              <span>${Icons.fileText} ${escapeHtml(c.post_title || '已删除文章')}</span>
              ${getStatusTag(c.status)}
            </div>
          </div>
        </div>
        <div class="comment-admin-actions">
          ${c.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="approveCommentAction(${c.id})" title="通过">${Icons.check} 通过</button>` : ''}
          ${c.status !== 'rejected' ? `<button class="btn btn-warning btn-sm" onclick="rejectCommentAction(${c.id})" title="驳回">驳回</button>` : ''}
          <button class="btn btn-primary btn-sm" onclick="openReplyForm(${c.id})" title="回复">${Icons.edit} 回复</button>
          <button class="btn btn-text btn-sm danger" onclick="confirmDeleteComment(${c.id})" title="删除">${Icons.trash}</button>
        </div>
      </div>
      <div class="comment-admin-content">${escapeHtml(c.content)}</div>
      ${c.reply ? `
        <div class="comment-admin-reply">
          <div class="comment-reply-label">${Icons.user} 管理员回复 · ${formatDate(c.reply_at)}</div>
          <div class="comment-reply-content">${escapeHtml(c.reply)}</div>
        </div>
      ` : ''}
    </div>
  `).join('')}</div>`;
}

function renderCommentsPagination() {
  const container = document.getElementById('commentsPagination');
  if (!container) return;
  const totalPages = Math.ceil(commentsState.total / commentsState.pageSize);
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  let btns = `<span class="pagination-info">共 ${commentsState.total} 条</span>`;
  btns += `<button class="pagination-btn" ${commentsState.page <= 1 ? 'disabled' : ''} onclick="goCommentPage(${commentsState.page - 1})">${Icons.chevronLeft}</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - commentsState.page) > 1) {
      if (i === 4 || i === totalPages - 3) btns += `<span style="padding:0 4px;color:var(--color-text-placeholder);">...</span>`;
      continue;
    }
    btns += `<button class="pagination-btn ${i === commentsState.page ? 'active' : ''}" onclick="goCommentPage(${i})">${i}</button>`;
  }
  btns += `<button class="pagination-btn" ${commentsState.page >= totalPages ? 'disabled' : ''} onclick="goCommentPage(${commentsState.page + 1})">${Icons.chevronRight}</button>`;
  container.innerHTML = `<div class="pagination">${btns}</div>`;
}

function goCommentPage(page) {
  commentsState.page = page;
  loadComments();
}

const onCommentSearch = debounce(function (val) {
  commentsState.keyword = val;
  commentsState.page = 1;
  loadComments();
}, 400);

function filterCommentStatus(status) {
  commentsState.status = status;
  commentsState.page = 1;
  renderComments();
}

async function approveCommentAction(id) {
  try {
    await api.approveComment(id);
    showToast('已通过审核', 'success');
    await loadCommentStats();
    await loadComments();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  }
}

async function rejectCommentAction(id) {
  try {
    await api.rejectComment(id);
    showToast('已驳回', 'success');
    await loadCommentStats();
    await loadComments();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  }
}

function openReplyForm(id) {
  const comment = commentsState.list.find(c => c.id === id);
  if (!comment) return;
  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">评论内容</label>
      <div style="padding:12px;background:var(--color-bg-page);border-radius:var(--radius-md);font-size:14px;color:var(--color-text-secondary);">${escapeHtml(comment.content)}</div>
    </div>
    <div class="form-group">
      <label class="form-label">回复内容 <span class="required">*</span></label>
      <textarea class="form-textarea" id="replyFormContent" rows="4" placeholder="请输入回复内容...">${comment.reply ? escapeHtml(comment.reply) : ''}</textarea>
    </div>
  `;
  const footerHtml = `
    <button class="btn btn-default" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" id="replyFormSubmitBtn" onclick="submitReply(${id})">发送回复</button>
  `;
  openModal('回复评论', bodyHtml, footerHtml);
}

async function submitReply(id) {
  const reply = document.getElementById('replyFormContent').value.trim();
  if (!reply) { showToast('请输入回复内容', 'warning'); return; }
  const btn = document.getElementById('replyFormSubmitBtn');
  btn.classList.add('loading');
  btn.disabled = true;
  try {
    await api.replyComment(id, { reply });
    showToast('回复成功', 'success');
    closeModal();
    await loadCommentStats();
    await loadComments();
  } catch (e) {
    showToast('回复失败: ' + e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function confirmDeleteComment(id) {
  showConfirm(
    '删除评论',
    '确定要删除这条评论吗？此操作不可恢复。',
    async function () {
      try {
        await api.deleteComment(id);
        showToast('评论已删除', 'success');
        await loadCommentStats();
        await loadComments();
      } catch (e) {
        showToast('删除失败: ' + e.message, 'error');
      }
    },
    'danger'
  );
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
