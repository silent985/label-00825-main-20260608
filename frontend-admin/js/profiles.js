// ===== 个人资料管理页面 =====
let profilesList = [];

async function renderProfiles() {
  const container = document.getElementById('page-profiles');
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <h3 style="font-size:16px;font-weight:600;color:var(--color-text-primary);">个人资料列表</h3>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" onclick="openProfileForm()">
          ${Icons.plus} 添加资料
        </button>
      </div>
    </div>
    <div id="profilesListContainer">
      <div style="text-align:center;padding:48px;color:var(--color-text-placeholder);">加载中...</div>
    </div>
  `;
  await loadProfiles();
}

async function loadProfiles() {
  try {
    const res = await api.getProfiles();
    profilesList = res.data || [];
    renderProfilesList();
  } catch (e) {
    showToast('加载资料失败: ' + e.message, 'error');
  }
}

function renderProfilesList() {
  const container = document.getElementById('profilesListContainer');
  if (!container) return;

  if (profilesList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${Icons.user}
        <p>暂无个人资料</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div style="display:flex;flex-direction:column;gap:16px;">
    ${profilesList.map(p => `
      <div class="profile-card">
        <div class="profile-avatar">
          ${p.avatar ? `<img src="${p.avatar}" alt="${p.name}">` : getInitials(p.name)}
        </div>
        <div class="profile-info">
          <div class="profile-name">${p.name}</div>
          <div class="profile-bio">${p.bio || '暂无简介'}</div>
          <div class="profile-details">
            ${p.email ? `<span>${Icons.mail} ${p.email}</span>` : ''}
            ${p.location ? `<span>${Icons.mapPin} ${p.location}</span>` : ''}
            ${p.website ? `<span>${Icons.globe} ${p.website}</span>` : ''}
            ${p.github ? `<span>${Icons.github} ${p.github}</span>` : ''}
          </div>
          <div class="profile-bottom">
            <span class="profile-time">创建于 ${formatDate(p.created_at)} · 更新于 ${formatDate(p.updated_at)}</span>
            <div class="profile-actions">
              <button class="btn btn-text btn-sm" onclick="openProfileForm(${p.id})" title="编辑">${Icons.edit}</button>
              <button class="btn btn-text btn-sm danger" onclick="confirmDeleteProfile(${p.id},'${p.name.replace(/'/g, "\\'")}')" title="删除">${Icons.trash}</button>
            </div>
          </div>
        </div>
      </div>
    `).join('')}
  </div>`;
}

async function openProfileForm(id) {
  let profile = { name: '', email: '', avatar: '', bio: '', website: '', github: '', location: '' };
  const isEdit = !!id;

  if (isEdit) {
    try {
      const res = await api.getProfile(id);
      profile = res.data;
    } catch (e) {
      showToast('加载资料失败', 'error');
      return;
    }
  }

  const avatarSrc = profile.avatar || '';
  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">姓名 <span class="required">*</span></label>
      <input class="form-input" id="profileFormName" value="${(profile.name || '').replace(/"/g, '&quot;')}" placeholder="请输入姓名">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">邮箱 <span class="required">*</span></label>
        <input class="form-input" id="profileFormEmail" type="email" value="${(profile.email || '').replace(/"/g, '&quot;')}" placeholder="example@mail.com">
      </div>
      <div class="form-group">
        <label class="form-label">所在地</label>
        <input class="form-input" id="profileFormLocation" value="${(profile.location || '').replace(/"/g, '&quot;')}" placeholder="如：北京">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">头像</label>
      <div class="avatar-upload-area" id="avatarUploadArea" onclick="document.getElementById('avatarFileInput').click()">
        ${avatarSrc ? `<img id="avatarPreview" src="${avatarSrc.replace(/"/g, '&quot;')}" alt="头像预览">` : `<div id="avatarPlaceholder" class="avatar-upload-placeholder">${Icons.user}<span>点击上传头像</span></div>`}
      </div>
      <input type="file" id="avatarFileInput" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none" onchange="handleAvatarUpload(this)">
      <input type="hidden" id="profileFormAvatar" value="${avatarSrc.replace(/"/g, '&quot;')}">
    </div>
    <div class="form-group">
      <label class="form-label">个人简介</label>
      <textarea class="form-textarea" id="profileFormBio" rows="3" placeholder="介绍一下自己...">${profile.bio || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">个人网站</label>
        <input class="form-input" id="profileFormWebsite" value="${(profile.website || '').replace(/"/g, '&quot;')}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label class="form-label">GitHub</label>
        <input class="form-input" id="profileFormGithub" value="${(profile.github || '').replace(/"/g, '&quot;')}" placeholder="https://github.com/...">
      </div>
    </div>
  `;

  const footerHtml = `
    <button class="btn btn-default" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" id="profileFormSubmitBtn" onclick="submitProfileForm(${id || 'null'})">${isEdit ? '保存修改' : '添加资料'}</button>
  `;

  openModal(isEdit ? '编辑资料' : '添加个人资料', bodyHtml, footerHtml);
}

// 头像本地上传
async function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('图片大小不能超过 5MB', 'warning');
    input.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.code === 200) {
      document.getElementById('profileFormAvatar').value = data.data.url;
      const area = document.getElementById('avatarUploadArea');
      area.innerHTML = `<img id="avatarPreview" src="${data.data.url}" alt="头像预览">`;
      showToast('头像上传成功', 'success');
    } else {
      showToast(data.message || '上传失败', 'error');
    }
  } catch (e) {
    showToast('上传失败: ' + e.message, 'error');
  }
  input.value = '';
}

async function submitProfileForm(id) {
  const name = document.getElementById('profileFormName').value.trim();
  const email = document.getElementById('profileFormEmail').value.trim();
  const avatar = document.getElementById('profileFormAvatar').value.trim();
  const bio = document.getElementById('profileFormBio').value.trim();
  const website = document.getElementById('profileFormWebsite').value.trim();
  const github = document.getElementById('profileFormGithub').value.trim();
  const location = document.getElementById('profileFormLocation').value.trim();

  if (!name) { showToast('请输入姓名', 'warning'); return; }
  if (!email) { showToast('请输入邮箱', 'warning'); return; }
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailReg.test(email)) { showToast('邮箱格式不正确', 'warning'); return; }
  if (website && !/^https?:\/\/.+/.test(website)) { showToast('个人网站请以 http:// 或 https:// 开头', 'warning'); return; }
  if (github && !/^https?:\/\/.+/.test(github)) { showToast('GitHub 地址请以 http:// 或 https:// 开头', 'warning'); return; }

  const btn = document.getElementById('profileFormSubmitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const data = { name, email, avatar, bio, website, github, location };
    if (id) {
      await api.updateProfile(id, data);
      showToast('资料更新成功', 'success');
    } else {
      await api.createProfile(data);
      showToast('资料添加成功', 'success');
    }
    closeModal();
    await loadProfiles();
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function confirmDeleteProfile(id, name) {
  showConfirm(
    '删除资料',
    `确定要删除「${name}」的个人资料吗？此操作不可恢复。`,
    async function () {
      try {
        await api.deleteProfile(id);
        showToast('资料已删除', 'success');
        await loadProfiles();
      } catch (e) {
        showToast('删除失败: ' + e.message, 'error');
      }
    },
    'danger'
  );
}
