// ===== Toast 消息提示 =====
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: Icons.check,
    error: Icons.close,
    warning: Icons.warning,
    info: Icons.info,
  };

  toast.innerHTML = `
    ${iconMap[type] || iconMap.info}
    <span class="toast-message">${message}</span>
    <button class="toast-close-btn" onclick="this.parentElement.classList.add('removing');setTimeout(()=>this.parentElement.remove(),300)">
      ${Icons.close}
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
