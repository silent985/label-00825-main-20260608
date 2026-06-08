// ===== 文章管理页面 =====
let postsState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 6,
  keyword: '',
  category: '全部',
};

async function renderPosts() {
  const container = document.getElementById('page-posts');
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-input-wrapper">
          ${Icons.search}
          <input class="form-input" id="postSearchInput" placeholder="搜索文章标题、内容、标签..." value="${postsState.keyword}" oninput="onPostSearch(this.value)">
        </div>
        <div class="filter-tabs" id="postCategoryTabs">
          <button class="filter-tab active" onclick="filterPostCategory('全部')">全部</button>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" onclick="openPostForm()">
          ${Icons.plus} 写文章
        </button>
      </div>
    </div>
    <div id="postsListContainer">
      <div style="text-align:center;padding:48px;color:var(--color-text-placeholder);">加载中...</div>
    </div>
    <div id="postsPagination"></div>
  `;

  await loadCategories();
  await loadPosts();
}

async function loadCategories() {
  try {
    const res = await api.getCategories();
    const cats = res.data || [];
    const tabsEl = document.getElementById('postCategoryTabs');
    if (tabsEl) {
      tabsEl.innerHTML = `
        <button class="filter-tab ${postsState.category === '全部' ? 'active' : ''}" onclick="filterPostCategory('全部')">全部</button>
        ${cats.map(c => `<button class="filter-tab ${postsState.category === c ? 'active' : ''}" onclick="filterPostCategory('${c}')">${c}</button>`).join('')}
      `;
    }
  } catch (e) { /* ignore */ }
}

async function loadPosts() {
  try {
    const params = {
      page: postsState.page,
      pageSize: postsState.pageSize,
    };
    if (postsState.keyword) params.keyword = postsState.keyword;
    if (postsState.category !== '全部') params.category = postsState.category;

    const res = await api.getPosts(params);
    postsState.list = res.data.list;
    postsState.total = res.data.total;
    renderPostsList();
    renderPostsPagination();
  } catch (e) {
    showToast('加载文章失败: ' + e.message, 'error');
  }
}

function renderPostsList() {
  const container = document.getElementById('postsListContainer');
  if (!container) return;

  if (postsState.list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${Icons.fileText}
        <p>暂无文章</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="post-list">${postsState.list.map(post => `
    <div class="post-card" onclick="viewArticle(${post.id})">
      ${post.cover_image ? `<div class="post-card-cover"><img src="${post.cover_image}" alt="${post.title}" loading="lazy"></div>` : `<div class="post-card-cover" style="background:linear-gradient(135deg,var(--color-primary-bg),#E0E7FF);display:flex;align-items:center;justify-content:center;"><span style="font-size:36px;font-weight:700;color:var(--color-primary);opacity:0.3;">${post.title.charAt(0)}</span></div>`}
      <div class="post-card-body">
        <div class="post-card-title">${post.title}</div>
        <div class="post-card-summary">${post.summary || truncate(post.content.replace(/[#*`>\-]/g, ''), 120)}</div>
        <div class="post-card-meta">
          <span>${Icons.folder} ${post.category}</span>
          <span>${Icons.calendar} ${formatShortDate(post.created_at)}</span>
          <span>${Icons.eye} ${post.view_count}</span>
          ${post.tags ? `<span>${Icons.tag} ${post.tags}</span>` : ''}
        </div>
        <div class="post-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-text btn-sm" onclick="openPostForm(${post.id})" title="编辑">${Icons.edit}</button>
          <button class="btn btn-text btn-sm danger" onclick="confirmDeletePost(${post.id},'${post.title.replace(/'/g, "\\'")}')" title="删除">${Icons.trash}</button>
        </div>
      </div>
    </div>
  `).join('')}</div>`;
}

function renderPostsPagination() {
  const container = document.getElementById('postsPagination');
  if (!container) return;
  const totalPages = Math.ceil(postsState.total / postsState.pageSize);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let btns = '';
  btns += `<span class="pagination-info">共 ${postsState.total} 条</span>`;
  btns += `<button class="pagination-btn" ${postsState.page <= 1 ? 'disabled' : ''} onclick="goPostPage(${postsState.page - 1})">${Icons.chevronLeft}</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - postsState.page) > 1) {
      if (i === 4 || i === totalPages - 3) btns += `<span style="padding:0 4px;color:var(--color-text-placeholder);">...</span>`;
      continue;
    }
    btns += `<button class="pagination-btn ${i === postsState.page ? 'active' : ''}" onclick="goPostPage(${i})">${i}</button>`;
  }
  btns += `<button class="pagination-btn" ${postsState.page >= totalPages ? 'disabled' : ''} onclick="goPostPage(${postsState.page + 1})">${Icons.chevronRight}</button>`;
  container.innerHTML = `<div class="pagination">${btns}</div>`;
}

function goPostPage(page) {
  postsState.page = page;
  loadPosts();
}

const onPostSearch = debounce(function (val) {
  postsState.keyword = val;
  postsState.page = 1;
  loadPosts();
}, 400);

function filterPostCategory(cat) {
  postsState.category = cat;
  postsState.page = 1;
  loadPosts();
  loadCategories();
}

// 文章表单
async function openPostForm(id) {
  let post = { title: '', content: '', summary: '', cover_image: '', category: '', tags: '', status: 'published' };
  const isEdit = !!id;

  if (isEdit) {
    try {
      const res = await api.getPost(id);
      post = res.data;
    } catch (e) {
      showToast('加载文章失败', 'error');
      return;
    }
  }

  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">标题 <span class="required">*</span></label>
      <input class="form-input" id="postFormTitle" value="${post.title.replace(/"/g, '&quot;')}" placeholder="请输入文章标题">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">分类</label>
        <input class="form-input" id="postFormCategory" value="${(post.category || '').replace(/"/g, '&quot;')}" placeholder="如：前端开发">
      </div>
      <div class="form-group">
        <label class="form-label">标签</label>
        <input class="form-input" id="postFormTags" value="${(post.tags || '').replace(/"/g, '&quot;')}" placeholder="多个标签用逗号分隔">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">封面图片</label>
      <input type="file" id="postFormCoverFile" accept="image/*" style="display:none;" onchange="uploadPostCover(this)">
      <input type="hidden" id="postFormCover" value="${(post.cover_image || '').replace(/"/g, '&quot;')}">
      <div id="postCoverPreview" style="${post.cover_image ? '' : 'display:none;'}margin-bottom:8px;">
        ${post.cover_image ? `<div style="position:relative;display:inline-block;"><img src="${post.cover_image}" style="max-height:120px;border-radius:var(--radius-md);border:1px solid var(--color-border);"><button type="button" class="btn btn-text btn-sm danger" onclick="removePostCover()" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.5);color:#fff;border-radius:50%;width:24px;height:24px;padding:0;">${Icons.close}</button></div>` : ''}
      </div>
      <button type="button" class="btn btn-default" onclick="document.getElementById('postFormCoverFile').click()">
        ${Icons.plus} 上传封面图片
      </button>
    </div>
    <div class="form-group">
      <label class="form-label">摘要</label>
      <textarea class="form-textarea" id="postFormSummary" rows="2" placeholder="文章摘要（可选）">${post.summary || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">内容 <span class="required">*</span></label>
      <div class="md-editor">
        <div class="md-toolbar">
          <button type="button" class="md-toolbar-btn" onclick="mdInsert('heading')" title="标题">H</button>
          <button type="button" class="md-toolbar-btn" onclick="mdInsert('bold')" title="加粗"><strong>B</strong></button>
          <button type="button" class="md-toolbar-btn" onclick="mdInsert('italic')" title="斜体"><em>I</em></button>
          <button type="button" class="md-toolbar-btn" onclick="mdInsert('code')" title="行内代码">&lt;/&gt;</button>
          <button type="button" class="md-toolbar-btn" onclick="mdInsert('codeblock')" title="代码块">{ }</button>
          <button type="button" class="md-toolbar-btn" onclick="mdInsert('link')" title="链接">🔗</button>
          <button type="button" class="md-toolbar-btn" onclick="mdInsert('image')" title="图片">🖼</button>
          <button type="button" class="md-toolbar-btn" onclick="mdInsert('ul')" title="无序列表">• —</button>
          <button type="button" class="md-toolbar-btn" onclick="mdInsert('quote')" title="引用">"</button>
          <span style="flex:1;"></span>
          <button type="button" class="md-toolbar-btn md-tab-btn active" onclick="mdSwitchTab('edit')" id="mdTabEdit">编辑</button>
          <button type="button" class="md-toolbar-btn md-tab-btn" onclick="mdSwitchTab('preview')" id="mdTabPreview">预览</button>
        </div>
        <textarea class="form-textarea md-textarea" id="postFormContent" rows="14" placeholder="支持 Markdown 格式">${post.content || ''}</textarea>
        <div id="postPreviewArea" class="preview-content md-preview" style="display:none;"></div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">状态</label>
      <div class="custom-select" id="postFormStatusSelect">
        <div class="custom-select-trigger" onclick="toggleCustomSelect('postFormStatusSelect')">
          <span id="postFormStatusLabel">${post.status === 'draft' ? '草稿' : '已发布'}</span>
          <svg class="custom-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="custom-select-dropdown">
          <div class="custom-select-option ${post.status === 'published' ? 'selected' : ''}" data-value="published" onclick="selectCustomOption('postFormStatusSelect','published','已发布')">已发布</div>
          <div class="custom-select-option ${post.status === 'draft' ? 'selected' : ''}" data-value="draft" onclick="selectCustomOption('postFormStatusSelect','draft','草稿')">草稿</div>
        </div>
      </div>
      <input type="hidden" id="postFormStatus" value="${post.status}">
    </div>
  `;

  const footerHtml = `
    <button class="btn btn-default" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" id="postFormSubmitBtn" onclick="submitPostForm(${id || 'null'})">${isEdit ? '保存修改' : '发布文章'}</button>
  `;

  openModal(isEdit ? '编辑文章' : '写新文章', bodyHtml, footerHtml);
}

function previewPostContent() {
  const content = document.getElementById('postFormContent').value;
  const previewArea = document.getElementById('postPreviewArea');
  document.getElementById('postFormContent').style.display = 'none';
  previewArea.style.display = 'block';
  previewArea.innerHTML = markdownToHtml(content) || '<p style="color:var(--color-text-placeholder);">暂无内容</p>';
}

async function submitPostForm(id) {
  const title = document.getElementById('postFormTitle').value.trim();
  const content = document.getElementById('postFormContent').value.trim();
  const summary = document.getElementById('postFormSummary').value.trim();
  const cover_image = document.getElementById('postFormCover').value.trim();
  const category = document.getElementById('postFormCategory').value.trim();
  const tags = document.getElementById('postFormTags').value.trim();
  const status = document.getElementById('postFormStatus').value;

  if (!title) { showToast('请输入文章标题', 'warning'); return; }
  if (!content) { showToast('请输入文章内容', 'warning'); return; }

  const btn = document.getElementById('postFormSubmitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const data = { title, content, summary, cover_image, category: category || '未分类', tags, status };
    if (id) {
      await api.updatePost(id, data);
      showToast('文章更新成功', 'success');
    } else {
      await api.createPost(data);
      showToast('文章发布成功', 'success');
    }
    closeModal();
    await loadPosts();
    await loadCategories();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function confirmDeletePost(id, title) {
  showConfirm(
    '删除文章',
    `确定要删除文章「${title}」吗？此操作不可恢复。`,
    async function () {
      try {
        await api.deletePost(id);
        showToast('文章已删除', 'success');
        await loadPosts();
        await loadCategories();
      } catch (e) {
        showToast('删除失败: ' + e.message, 'error');
      }
    },
    'danger'
  );
}

// 上传封面图片
async function uploadPostCover(input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.code === 200) {
      document.getElementById('postFormCover').value = data.data.url;
      const preview = document.getElementById('postCoverPreview');
      preview.style.display = 'block';
      preview.innerHTML = `<div style="position:relative;display:inline-block;"><img src="${data.data.url}" style="max-height:120px;border-radius:var(--radius-md);border:1px solid var(--color-border);"><button type="button" class="btn btn-text btn-sm danger" onclick="removePostCover()" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.5);color:#fff;border-radius:50%;width:24px;height:24px;padding:0;">${Icons.close}</button></div>`;
      showToast('图片上传成功', 'success');
    } else {
      showToast(data.message || '上传失败', 'error');
    }
  } catch (e) {
    showToast('上传失败: ' + e.message, 'error');
  }
  input.value = '';
}

function removePostCover() {
  document.getElementById('postFormCover').value = '';
  const preview = document.getElementById('postCoverPreview');
  preview.style.display = 'none';
  preview.innerHTML = '';
}

// Markdown 编辑器工具栏
function mdInsert(type) {
  const ta = document.getElementById('postFormContent');
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.substring(start, end);
  let insert = '';
  let cursorOffset = 0;

  switch (type) {
    case 'heading':
      insert = '## ' + (selected || '标题');
      cursorOffset = selected ? insert.length : 3;
      break;
    case 'bold':
      insert = '**' + (selected || '粗体文本') + '**';
      cursorOffset = selected ? insert.length : 2;
      break;
    case 'italic':
      insert = '*' + (selected || '斜体文本') + '*';
      cursorOffset = selected ? insert.length : 1;
      break;
    case 'code':
      insert = '`' + (selected || '代码') + '`';
      cursorOffset = selected ? insert.length : 1;
      break;
    case 'codeblock':
      insert = '```\n' + (selected || '代码块') + '\n```';
      cursorOffset = selected ? insert.length : 4;
      break;
    case 'link':
      insert = '[' + (selected || '链接文本') + '](url)';
      cursorOffset = selected ? insert.length : 1;
      break;
    case 'image':
      insert = '![' + (selected || '图片描述') + '](url)';
      cursorOffset = selected ? insert.length : 2;
      break;
    case 'ul':
      insert = '- ' + (selected || '列表项');
      cursorOffset = selected ? insert.length : 2;
      break;
    case 'quote':
      insert = '> ' + (selected || '引用文本');
      cursorOffset = selected ? insert.length : 2;
      break;
  }

  ta.value = ta.value.substring(0, start) + insert + ta.value.substring(end);
  ta.focus();
  const newPos = start + (selected ? insert.length : cursorOffset);
  ta.setSelectionRange(newPos, selected ? newPos : start + insert.length);
}

function mdSwitchTab(tab) {
  const editBtn = document.getElementById('mdTabEdit');
  const previewBtn = document.getElementById('mdTabPreview');
  const textarea = document.getElementById('postFormContent');
  const preview = document.getElementById('postPreviewArea');
  if (!editBtn || !previewBtn || !textarea || !preview) return;

  if (tab === 'edit') {
    editBtn.classList.add('active');
    previewBtn.classList.remove('active');
    textarea.style.display = 'block';
    preview.style.display = 'none';
  } else {
    editBtn.classList.remove('active');
    previewBtn.classList.add('active');
    textarea.style.display = 'none';
    preview.style.display = 'block';
    preview.innerHTML = markdownToHtml(textarea.value) || '<p style="color:var(--color-text-placeholder);">暂无内容</p>';
  }
}
