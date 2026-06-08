let commentsState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '',
};

async function renderComments() {
  const container = document.getElementById('page-comments');
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-input-wrapper" style="max-width:320px;">
          ${Icons.search}
          <input class="form-input" id="commentSearchInput" placeholder="搜索评论内容或昵称..." value="${commentsState.keyword}" oninput="onCommentSearch(this.value)">
        </div>
        <div class="filter-tabs" id="commentStatusTabs">
          <button class="filter-tab ${commentsState.status === '' ? 'active' : ''}" onclick="filterCommentStatus('')">全部</button>
          <button class="filter-tab ${commentsState.status === 'pending' ? 'active' : ''}" onclick="filterCommentStatus('pending')">待审核</button>
          <button class="filter-tab ${commentsState.status === 'approved' ? 'active' : ''}" onclick="filterCommentStatus('approved')">已通过</button>
          <button class="filter-tab ${commentsState.status === 'rejected' ? 'active' : ''}" onclick="filterCommentStatus('rejected')">已拒绝</button>
        </div>
      </div>
    </div>
    <div id="commentsListContainer">
      <div style="text-align:center;padding:48px;color:var(--color-text-placeholder);">加载中...</div>
    </div>
    <div id="commentsPagination"></div>
  `;
  await loadComments();
}

async function loadComments() {
  try {
    const params = {
      page: commentsState.page,
      pageSize: commentsState.pageSize,
    };
    if (commentsState.keyword) params.keyword = commentsState.keyword;
    if (commentsState.status) params.status = commentsState.status;

    const res = await api.getComments(params);
    commentsState.list = res.data.list;
    commentsState.total = res.data.total;
    renderCommentsList();
    renderCommentsPagination();
  } catch (e) {
    showToast('加载评论失败: ' + e.message, 'error');
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

  container.innerHTML = `<div class="comment-admin-list">${commentsState.list.map(c => {
    const statusTag = c.status === 'pending'
      ? '<span class="tag tag-orange">待审核</span>'
      : c.status === 'approved'
        ? '<span class="tag tag-green">已通过</span>'
        : '<span class="tag tag-red">已拒绝</span>';

    return `
      <div class="comment-admin-card">
        <div class="comment-admin-header">
          <div class="comment-admin-author">
            <div class="comment-avatar-sm">${c.nickname.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:500;color:var(--color-text-primary);">${escapeHtml(c.nickname)}</div>
              <div style="font-size:12px;color:var(--color-text-placeholder);">${formatDate(c.created_at)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${statusTag}
            <span style="font-size:12px;color:var(--color-text-placeholder);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(c.post_title || '')}">文章：${escapeHtml(c.post_title || '未知')}</span>
          </div>
        </div>
        <div class="comment-admin-body">${escapeHtml(c.content)}</div>
        ${c.reply ? `<div class="comment-admin-reply"><span class="comment-reply-label">管理员回复：</span>${escapeHtml(c.reply)}</div>` : ''}
        <div class="comment-admin-actions">
          ${c.status === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="approveComment(${c.id})">${Icons.check} 通过</button>
            <button class="btn btn-warning btn-sm" onclick="rejectComment(${c.id})">拒绝</button>
          ` : ''}
          ${c.status === 'rejected' ? `
            <button class="btn btn-success btn-sm" onclick="approveComment(${c.id})">${Icons.check} 通过</button>
          ` : ''}
          ${c.status === 'approved' ? `
            <button class="btn btn-warning btn-sm" onclick="rejectComment(${c.id})">拒绝</button>
          ` : ''}
          <button class="btn btn-default btn-sm" onclick="openReplyModal(${c.id}, '${escapeHtml(c.reply || '').replace(/'/g, "\\'")}')">回复</button>
          <button class="btn btn-text btn-sm danger" onclick="confirmDeleteComment(${c.id})">${Icons.trash} 删除</button>
        </div>
      </div>
    `;
  }).join('')}</div>`;
}

function renderCommentsPagination() {
  const container = document.getElementById('commentsPagination');
  if (!container) return;
  const totalPages = Math.ceil(commentsState.total / commentsState.pageSize);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let btns = `<span class="pagination-info">共 ${commentsState.total} 条评论</span>`;
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
  const tabs = document.querySelectorAll('#commentStatusTabs .filter-tab');
  tabs.forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  loadComments();
}

async function approveComment(id) {
  try {
    await api.approveComment(id);
    showToast('评论已通过', 'success');
    await loadComments();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  }
}

async function rejectComment(id) {
  try {
    await api.rejectComment(id);
    showToast('评论已拒绝', 'success');
    await loadComments();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  }
}

function openReplyModal(id, existingReply) {
  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">回复内容</label>
      <textarea class="form-textarea" id="replyContent" rows="4" placeholder="输入回复内容...">${existingReply || ''}</textarea>
    </div>
  `;
  const footerHtml = `
    <button class="btn btn-default" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" id="replySubmitBtn" onclick="submitReply(${id})">提交回复</button>
  `;
  openModal('回复评论', bodyHtml, footerHtml);
}

async function submitReply(id) {
  const reply = document.getElementById('replyContent').value.trim();
  if (!reply) { showToast('请输入回复内容', 'warning'); return; }

  const btn = document.getElementById('replySubmitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    await api.replyComment(id, reply);
    showToast('回复成功', 'success');
    closeModal();
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
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function renderPostComments(postId) {
  const container = document.getElementById('postCommentsSection');
  if (!container) return;

  container.innerHTML = `
    <div class="comment-section">
      <h3 class="comment-section-title">${Icons.messageCircle || ''} 评论区</h3>
      <div class="comment-form-card">
        <form id="commentForm" onsubmit="submitComment(event, ${postId})">
          <div class="form-row">
            <div class="form-group">
              <input class="form-input" id="commentNickname" placeholder="昵称 *" required maxlength="50">
            </div>
            <div class="form-group">
              <input class="form-input" id="commentEmail" type="email" placeholder="邮箱（选填）" maxlength="100">
            </div>
          </div>
          <div class="form-group">
            <textarea class="form-textarea" id="commentContent" rows="3" placeholder="发表你的看法... *" required maxlength="1000" style="min-height:80px;"></textarea>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button class="btn btn-primary" type="submit" id="commentSubmitBtn">发表评论</button>
          </div>
        </form>
      </div>
      <div id="postCommentsList" style="margin-top:var(--space-md);">
        <div style="text-align:center;padding:24px;color:var(--color-text-placeholder);">加载评论中...</div>
      </div>
    </div>
  `;

  await loadPostComments(postId);
}

async function loadPostComments(postId) {
  const container = document.getElementById('postCommentsList');
  if (!container) return;

  try {
    const res = await api.getPostComments(postId);
    const comments = res.data;

    if (comments.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:24px;">
          <p>暂无评论，来说两句吧</p>
        </div>
      `;
      return;
    }

    container.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-item-header">
          <div class="comment-avatar-sm" style="background:${stringToColor(c.nickname)};">${c.nickname.charAt(0).toUpperCase()}</div>
          <div class="comment-item-info">
            <span class="comment-item-nickname">${escapeHtml(c.nickname)}</span>
            <span class="comment-item-time">${formatShortDate(c.created_at)}</span>
          </div>
        </div>
        <div class="comment-item-body">${escapeHtml(c.content)}</div>
        ${c.reply ? `
          <div class="comment-item-reply">
            <span class="comment-reply-label">博主回复：</span>${escapeHtml(c.reply)}
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--color-danger);">评论加载失败</div>';
  }
}

async function submitComment(e, postId) {
  e.preventDefault();
  const nickname = document.getElementById('commentNickname').value.trim();
  const email = document.getElementById('commentEmail').value.trim();
  const content = document.getElementById('commentContent').value.trim();

  if (!nickname || !content) {
    showToast('请填写昵称和评论内容', 'warning');
    return;
  }

  const btn = document.getElementById('commentSubmitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    await api.createComment({ post_id: postId, nickname, email, content });
    showToast('评论已提交，等待审核后显示', 'success');
    document.getElementById('commentContent').value = '';
    await loadPostComments(postId);
  } catch (e) {
    showToast('评论失败: ' + e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}
