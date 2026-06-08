// ===== 管理后台应用入口 =====
let currentPage = 'dashboard';

const pageTitles = {
  dashboard: '仪表盘',
  posts: '文章管理',
  comments: '评论管理',
  profiles: '个人资料',
};

function navigateTo(page) {
  document.querySelectorAll('.page-view').forEach(el => el.style.display = 'none');

  const target = document.getElementById('page-' + page);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.nav-item').forEach(el => {
    const navPage = el.dataset.page;
    el.classList.toggle('active', navPage === page);
  });

  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  currentPage = page;

  document.getElementById('sidebar').classList.remove('open');

  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'posts': renderPosts(); break;
    case 'comments': renderComments(); break;
    case 'profiles': renderProfiles(); break;
  }

  window.scrollTo(0, 0);
  location.hash = page;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', async function () {
  await checkAuth();
  if (currentUser) {
    const hash = location.hash.replace('#', '');
    const page = pageTitles[hash] ? hash : 'dashboard';
    navigateTo(page);
  }
});

document.addEventListener('click', function (e) {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.querySelector('.menu-toggle');
  if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }
});
