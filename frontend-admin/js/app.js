// ===== 应用主入口 =====
let currentPage = 'dashboard';
window._prevPage = 'dashboard';

const pageTitles = {
  dashboard: '仪表盘',
  posts: '文章管理',
  profiles: '个人资料',
  blog: '博客浏览',
  article: '文章详情',
};

function navigateTo(page) {
  if (page !== 'article') window._prevPage = page;

  // 隐藏所有页面
  document.querySelectorAll('.page-view').forEach(el => el.style.display = 'none');

  // 显示目标页面
  const target = document.getElementById('page-' + page);
  if (target) target.style.display = 'block';

  // 更新导航高亮
  document.querySelectorAll('.nav-item').forEach(el => {
    const navPage = el.dataset.page;
    if (page === 'article') {
      el.classList.toggle('active', navPage === 'blog');
    } else {
      el.classList.toggle('active', navPage === page);
    }
  });

  // 更新标题
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  currentPage = page;

  // 关闭移动端侧边栏
  document.getElementById('sidebar').classList.remove('open');

  // 渲染页面
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'posts': renderPosts(); break;
    case 'profiles': renderProfiles(); break;
    case 'blog': renderBlog(); break;
  }

  // 滚动到顶部
  window.scrollTo(0, 0);

  // 记录当前页面到 hash
  if (page !== 'article') {
    location.hash = page;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// 初始化
document.addEventListener('DOMContentLoaded', async function () {
  updateClock();
  setInterval(updateClock, 60000);
  await checkAuth();
  if (currentUser) {
    const hash = location.hash.replace('#', '');
    const page = pageTitles[hash] ? hash : 'dashboard';
    navigateTo(page);
  }
});

// 点击遮罩关闭侧边栏（移动端）
document.addEventListener('click', function (e) {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.querySelector('.menu-toggle');
  if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});

// ESC 关闭弹窗
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }
});
