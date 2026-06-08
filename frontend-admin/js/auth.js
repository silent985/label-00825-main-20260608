// ===== 登录认证管理 =====
let currentUser = null;

function getToken() {
  return localStorage.getItem('blog_token') || '';
}

function setToken(token) {
  localStorage.setItem('blog_token', token);
}

function clearToken() {
  localStorage.removeItem('blog_token');
}

// 显示登录页，隐藏主界面
function showLoginPage() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appLayout').style.display = 'none';
  currentUser = null;
}

// 隐藏登录页，显示主界面
function showApp(user) {
  currentUser = user;
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appLayout').style.display = '';
  updateHeaderUser(user);
}

// 更新 header 用户信息
function updateHeaderUser(user) {
  const avatarEl = document.getElementById('headerAvatar');
  const nameEl = document.getElementById('headerUserName');
  if (!avatarEl || !nameEl) return;
  const displayName = user.nickname || user.username;
  nameEl.textContent = displayName;
  if (user.avatar) {
    avatarEl.innerHTML = '<img src="' + user.avatar + '" alt="' + displayName + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
  } else {
    avatarEl.textContent = displayName.charAt(0).toUpperCase();
  }
}

// 登录
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  if (!username || !password) {
    errorEl.textContent = '请输入用户名和密码';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = '登录中...';
  errorEl.style.display = 'none';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.code === 200) {
      setToken(data.data.token);
      showApp(data.data.user);
      navigateTo('dashboard');
      renderDashboard();
    } else {
      errorEl.textContent = data.message || '登录失败';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = '网络错误，请检查服务是否启动';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '登 录';
  }
}

// 退出登录
function handleLogout() {
  closeUserDropdown();
  showConfirm(
    '退出登录',
    '确定要退出登录吗？',
    async function () {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + getToken() }
        });
      } catch (e) { /* ignore */ }
      clearToken();
      showLoginPage();
      document.getElementById('loginUsername').value = '';
      document.getElementById('loginPassword').value = '';
    },
    'warning',
    Icons.logOut
  );
}

// 检查登录状态
async function checkAuth() {
  const token = getToken();
  if (!token) {
    showLoginPage();
    return;
  }
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.code === 200) {
      showApp(data.data);
      return;
    }
  } catch (e) { /* ignore */ }
  clearToken();
  showLoginPage();
}

// 用户下拉菜单
function toggleUserDropdown() {
  const menu = document.getElementById('userDropdownMenu');
  menu.classList.toggle('open');
}

function closeUserDropdown() {
  const menu = document.getElementById('userDropdownMenu');
  if (menu) menu.classList.remove('open');
}

// 点击外部关闭用户下拉
document.addEventListener('click', function(e) {
  if (!e.target.closest('.user-dropdown')) {
    closeUserDropdown();
  }
});
