// ===== 评论管理页面 =====
let commentsState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
  status: 'pending', // pending | approved | rejected | all
  stats: { pending: 0, approved: 0, rejected: 0, total: 0 },
};

async function renderComments() {
  const container = document.getElementById('page-comments');
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="filter-tabs" id="commentStatusTabs">
          <button class="filter-tab ${commentsState.status === 'pending' ? 'active' : ''}" onclick="filterCommentStatus('pending')">待审核 <span id="badgePending" style="margin-left:4px;color:var(--color-warning,#F59E0B);">0</span></button>
          <button class="filter-tab ${commentsState.status === 'approved' ? 'active' : ''}" onclick="filterCommentStatus('approved')">已通过 <span id="badgeApproved" style="margin-left:4px;color:var(--color-success);">0</span></button>
          <button class="filter-tab ${commentsState.status === 'rejected' ? 'active' : ''}" onclick="filterCommentStatus('rejected')">已拒绝 <span id="badgeRejected" style="margin-left:4px;color:var(--color-text-placeholder);">0</span></button>
          <button class="filter-tab ${commentsState.status === 'all' ? 'active' : ''}" onclick="filterCommentStatus('all')">全部 <span id="badgeTotal" style="margin-left:4px;color:var(--color-text-placeholder);">0</span></button>
        </div>
      </div>
    </div>
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
    commentsState.stats = res.data;
    const p = document.getElementById('badgePending');
    const a = document.getElementById('badgeApproved');
    const r = document.getElementById('badgeRejected');
    const t = document.getElementById('badgeTotal');
    if (p) p.textContent = res.data.pending;
    if (a) a.textContent = res.data.approved;
    if (r) r.textContent = res.data.rejected;
    if (t) t.textContent = res.data.total;
  } catch (e) { /* ignore */ }
}

async function loadComments() {
  try {
    const params = { page: commentsState.page, pageSize: commentsState.pageSize };
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

function commentStatusTag(status) {
  if (status === 'pending') return '<span class="tag tag-orange">待审核</span>';
  if (status === 'approved') return '<span class="tag tag-blue">已通过</span>';
  if (status === 'rejected') return '<span class="tag" style="background:#F3F4F6;color:#6B7280;">已拒绝</span>';
  return '';
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

  container.innerHTML = commentsState.list.map(c => {
    const initial = (c.author_name || '?').charAt(0).toUpperCase();
    return `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-body">
          <div style="display:flex;gap:12px;">
            <div class="user-avatar" style="width:36px;height:36px;font-size:14px;flex-shrink:0;background:${c.is_admin ? 'var(--color-primary)' : 'var(--color-success)'};color:#fff;">${initial}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                <span style="font-size:14px;font-weight:600;color:var(--color-text-primary);">${escapeHtml(c.author_name)}</span>
                ${c.is_admin ? '<span class="tag tag-blue">管理员</span>' : ''}
                ${commentStatusTag(c.status)}
                ${c.author_email ? `<span style="font-size:12px;color:var(--color-text-placeholder);">${escapeHtml(c.author_email)}</span>` : ''}
                <span style="font-size:12px;color:var(--color-text-placeholder);margin-left:auto;">${formatDate(c.created_at)}</span>
              </div>
              <div style="font-size:13px;color:var(--color-text-secondary);margin-bottom:8px;">
                ${Icons.fileText} 文章：<a href="javascript:void(0)" onclick="viewArticle(${c.post_id})" style="color:var(--color-primary);">${escapeHtml(c.post_title || '已删除文章')}</a>
                ${c.parent_id ? `<span style="margin-left:8px;color:var(--color-text-placeholder);">（回复 #${c.parent_id}）</span>` : ''}
              </div>
              <div style="font-size:14px;color:var(--color-text-primary);line-height:1.7;background:var(--color-bg,#FAFAFA);padding:10px 12px;border-radius:var(--radius-md);white-space:pre-wrap;word-break:break-word;">${escapeHtml(c.content)}</div>
              <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                ${c.status !== 'approved' ? `<button class="btn btn-success btn-sm" onclick="approveComment(${c.id})">${Icons.check} 通过</button>` : ''}
                ${c.status !== 'rejected' ? `<button class="btn btn-default btn-sm" onclick="rejectComment(${c.id})">${Icons.close} 拒绝</button>` : ''}
                <button class="btn btn-primary btn-sm" onclick="openCommentReplyForm(${c.id})">${Icons.edit} 回复</button>
                <button class="btn btn-text btn-sm danger" onclick="confirmDeleteComment(${c.id})" title="删除">${Icons.trash} 删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
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

function filterCommentStatus(status) {
  commentsState.status = status;
  commentsState.page = 1;
  loadComments();
  // 重新渲染 tabs 高亮
  document.querySelectorAll('#commentStatusTabs .filter-tab').forEach((el, idx) => {
    const map = ['pending', 'approved', 'rejected', 'all'];
    el.classList.toggle('active', map[idx] === status);
  });
}

async function approveComment(id) {
  try {
    await api.updateCommentStatus(id, 'approved');
    showToast('评论已通过', 'success');
    await loadCommentStats();
    await loadComments();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  }
}

async function rejectComment(id) {
  try {
    await api.updateCommentStatus(id, 'rejected');
    showToast('评论已拒绝', 'success');
    await loadCommentStats();
    await loadComments();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  }
}

function confirmDeleteComment(id) {
  showConfirm(
    '删除评论',
    '确定要删除该评论吗？相关回复也会被一并删除，此操作不可恢复。',
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

function openCommentReplyForm(id) {
  const target = commentsState.list.find(c => c.id === id);
  const previewText = target ? target.content : '';
  const bodyHtml = `
    <div style="background:var(--color-bg,#FAFAFA);padding:10px 12px;border-radius:var(--radius-md);margin-bottom:12px;font-size:13px;color:var(--color-text-secondary);max-height:120px;overflow:auto;white-space:pre-wrap;word-break:break-word;">
      <strong style="color:var(--color-text-primary);">原评论：</strong> ${escapeHtml(previewText)}
    </div>
    <div class="form-group">
      <label class="form-label">回复内容 <span class="required">*</span></label>
      <textarea class="form-textarea" id="commentReplyContent" rows="4" maxlength="2000" placeholder="请输入回复内容..."></textarea>
      <div style="font-size:12px;color:var(--color-text-placeholder);margin-top:6px;">回复将以「管理员」身份发布，并自动通过审核。</div>
    </div>
  `;
  const footerHtml = `
    <button class="btn btn-default" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" id="commentReplySubmitBtn" onclick="submitCommentReply(${id})">提交回复</button>
  `;
  openModal('回复评论', bodyHtml, footerHtml);
}

async function submitCommentReply(id) {
  const ta = document.getElementById('commentReplyContent');
  const btn = document.getElementById('commentReplySubmitBtn');
  if (!ta) return;
  const content = ta.value.trim();
  if (!content) { showToast('请输入回复内容', 'warning'); return; }
  const adminName = (typeof currentUser === 'object' && currentUser)
    ? (currentUser.nickname || currentUser.username || '管理员')
    : '管理员';
  btn.classList.add('loading');
  btn.disabled = true;
  try {
    await api.replyComment(id, { content, author_name: adminName });
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
