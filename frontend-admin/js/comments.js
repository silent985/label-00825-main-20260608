// ===== 评论管理页面 =====
let adminCommentsState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '全部',
};

async function renderAdminComments() {
  const container = document.getElementById('page-comments');
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-input-wrapper">
          ${Icons.search}
          <input class="form-input" id="adminCommentSearchInput" placeholder="搜索昵称、内容、邮箱..." value="${adminCommentsState.keyword}" oninput="onAdminCommentSearch(this.value)">
        </div>
        <div class="filter-tabs" id="adminCommentStatusTabs">
          <button class="filter-tab ${adminCommentsState.status === '全部' ? 'active' : ''}" onclick="filterAdminCommentStatus('全部')">全部</button>
          <button class="filter-tab ${adminCommentsState.status === 'pending' ? 'active' : ''}" onclick="filterAdminCommentStatus('pending')">待审核</button>
          <button class="filter-tab ${adminCommentsState.status === 'approved' ? 'active' : ''}" onclick="filterAdminCommentStatus('approved')">已通过</button>
          <button class="filter-tab ${adminCommentsState.status === 'rejected' ? 'active' : ''}" onclick="filterAdminCommentStatus('rejected')">已拒绝</button>
        </div>
      </div>
    </div>
    <div id="adminCommentsListContainer">
      <div style="text-align:center;padding:48px;color:var(--color-text-placeholder);">加载中...</div>
    </div>
    <div id="adminCommentsPagination"></div>
  `;

  await loadAdminComments();
}

async function loadAdminComments() {
  try {
    const params = {
      page: adminCommentsState.page,
      pageSize: adminCommentsState.pageSize,
    };
    if (adminCommentsState.keyword) params.keyword = adminCommentsState.keyword;
    if (adminCommentsState.status !== '全部') params.status = adminCommentsState.status;

    const res = await api.getComments(params);
    adminCommentsState.list = res.data.list;
    adminCommentsState.total = res.data.total;
    renderAdminCommentsList();
    renderAdminCommentsPagination();
  } catch (e) {
    showToast('加载评论失败: ' + e.message, 'error');
  }
}

function renderAdminCommentsList() {
  const container = document.getElementById('adminCommentsListContainer');
  if (!container) return;

  if (adminCommentsState.list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${Icons.messageSquare}
        <p>暂无评论</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="comment-admin-list">${adminCommentsState.list.map(comment => `
    <div class="comment-admin-item">
      <div class="comment-admin-header">
        <div class="comment-admin-info">
          <div class="comment-avatar">${getInitials(comment.nickname)}</div>
          <div style="min-width:0;">
            <div class="comment-admin-author">
              ${adminEscapeHtml(comment.nickname)}
              <span class="comment-status-tag ${getAdminCommentStatusClass(comment.status)}">${getAdminCommentStatusLabel(comment.status)}</span>
            </div>
            <div class="comment-admin-meta">
              <span>${Icons.calendar} ${formatDate(comment.created_at)}</span>
              ${comment.email ? `<span>${Icons.mail} ${adminEscapeHtml(comment.email)}</span>` : ''}
              ${comment.website ? `<span>${Icons.globe} ${adminEscapeHtml(comment.website)}</span>` : ''}
              <span style="color:var(--color-primary);cursor:pointer;" onclick="viewArticle(${comment.post_id})">${Icons.fileText} ${adminEscapeHtml(comment.post_title || '未知文章')}</span>
            </div>
          </div>
        </div>
        <div class="comment-admin-actions">
          ${comment.status === 'pending' ? `
            <button class="btn btn-text btn-sm" onclick="approveAdminComment(${comment.id})" title="通过">
              ${Icons.checkCircle} 通过
            </button>
            <button class="btn btn-text btn-sm danger" onclick="rejectAdminComment(${comment.id})" title="拒绝">
              ${Icons.xCircle} 拒绝
            </button>
          ` : ''}
          <button class="btn btn-text btn-sm" onclick="openAdminReplyForm(${comment.id})" title="回复">
            ${Icons.reply} 回复
          </button>
          <button class="btn btn-text btn-sm danger" onclick="confirmDeleteAdminComment(${comment.id})" title="删除">
            ${Icons.trash}
          </button>
        </div>
      </div>
      <div class="comment-admin-content">
        <div class="comment-content-label">评论内容：</div>
        <div class="comment-admin-text">${adminEscapeHtml(comment.content)}</div>
      </div>
      ${comment.reply_content ? `
        <div class="comment-admin-reply">
          <div class="comment-reply-label">
            ${Icons.reply} 博主回复
            <span class="comment-reply-time">${formatDate(comment.reply_at)}</span>
            <button class="btn btn-text btn-sm" style="margin-left:auto;" onclick="openAdminReplyForm(${comment.id})">编辑回复</button>
          </div>
          <div class="comment-reply-text">${adminEscapeHtml(comment.reply_content)}</div>
        </div>
      ` : ''}
    </div>
  `).join('')}</div>`;
}

function getAdminCommentStatusClass(status) {
  switch (status) {
    case 'pending': return 'tag-orange';
    case 'approved': return 'tag-green';
    case 'rejected': return 'tag-red';
    default: return 'tag-gray';
  }
}

function getAdminCommentStatusLabel(status) {
  switch (status) {
    case 'pending': return '待审核';
    case 'approved': return '已通过';
    case 'rejected': return '已拒绝';
    default: return status;
  }
}

function renderAdminCommentsPagination() {
  const container = document.getElementById('adminCommentsPagination');
  if (!container) return;
  const totalPages = Math.ceil(adminCommentsState.total / adminCommentsState.pageSize);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let btns = '';
  btns += `<span class="pagination-info">共 ${adminCommentsState.total} 条</span>`;
  btns += `<button class="pagination-btn" ${adminCommentsState.page <= 1 ? 'disabled' : ''} onclick="goAdminCommentPage(${adminCommentsState.page - 1})">${Icons.chevronLeft}</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - adminCommentsState.page) > 1) {
      if (i === 4 || i === totalPages - 3) btns += `<span style="padding:0 4px;color:var(--color-text-placeholder);">...</span>`;
      continue;
    }
    btns += `<button class="pagination-btn ${i === adminCommentsState.page ? 'active' : ''}" onclick="goAdminCommentPage(${i})">${i}</button>`;
  }
  btns += `<button class="pagination-btn" ${adminCommentsState.page >= totalPages ? 'disabled' : ''} onclick="goAdminCommentPage(${adminCommentsState.page + 1})">${Icons.chevronRight}</button>`;
  container.innerHTML = `<div class="pagination">${btns}</div>`;
}

function goAdminCommentPage(page) {
  adminCommentsState.page = page;
  loadAdminComments();
}

const onAdminCommentSearch = debounce(function (val) {
  adminCommentsState.keyword = val;
  adminCommentsState.page = 1;
  loadAdminComments();
}, 400);

function filterAdminCommentStatus(status) {
  adminCommentsState.status = status;
  adminCommentsState.page = 1;
  loadAdminComments();
  const tabs = document.querySelectorAll('#adminCommentStatusTabs .filter-tab');
  tabs.forEach(tab => {
    const isActive = tab.textContent === (status === '全部' ? '全部' : getAdminCommentStatusLabel(status));
    tab.classList.toggle('active', isActive);
  });
}

async function approveAdminComment(id) {
  try {
    await api.updateCommentStatus(id, 'approved');
    showToast('评论已通过', 'success');
    loadAdminComments();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  }
}

async function rejectAdminComment(id) {
  try {
    await api.updateCommentStatus(id, 'rejected');
    showToast('评论已拒绝', 'success');
    loadAdminComments();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  }
}

function openAdminReplyForm(id) {
  const comment = adminCommentsState.list.find(c => c.id === id);
  if (!comment) return;

  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">评论内容</label>
      <div style="padding:12px;background:var(--color-bg-page);border-radius:var(--radius-md);color:var(--color-text-secondary);">
        ${adminEscapeHtml(comment.content)}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">回复内容</label>
      <textarea class="form-textarea" id="adminReplyFormContent" rows="5" placeholder="请输入回复内容...">${comment.reply_content || ''}</textarea>
    </div>
  `;

  const footerHtml = `
    <button class="btn btn-default" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" id="adminReplyFormSubmitBtn" onclick="submitAdminReply(${id})">提交回复</button>
  `;

  openModal('回复评论', bodyHtml, footerHtml);
}

async function submitAdminReply(id) {
  const reply_content = document.getElementById('adminReplyFormContent').value.trim();

  const btn = document.getElementById('adminReplyFormSubmitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    await api.replyComment(id, reply_content);
    showToast('回复成功', 'success');
    closeModal();
    loadAdminComments();
  } catch (e) {
    showToast('回复失败: ' + e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function confirmDeleteAdminComment(id) {
  showConfirm(
    '删除评论',
    '确定要删除这条评论吗？此操作不可恢复。',
    async function () {
      try {
        await api.deleteComment(id);
        showToast('评论已删除', 'success');
        loadAdminComments();
      } catch (e) {
        showToast('删除失败: ' + e.message, 'error');
      }
    },
    'danger'
  );
}

function adminEscapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
