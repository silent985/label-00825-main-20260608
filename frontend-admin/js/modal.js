// ===== Modal 对话框 =====
function openModal(title, bodyHtml, footerHtml) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">${title}</h3>
      <button class="modal-close" onclick="closeModal()">${Icons.close}</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
  `;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function closeModalOnOverlay(event) {
  if (event.target === event.currentTarget) {
    closeModal();
  }
}

// 确认对话框
let _confirmCallback = null;

function showConfirm(title, message, onConfirm, type = 'danger', customIcon) {
  const overlay = document.getElementById('confirmOverlay');
  const content = document.getElementById('confirmContent');

  _confirmCallback = onConfirm;

  const iconHtml = customIcon || (type === 'danger' ? Icons.trash : Icons.warning);

  content.innerHTML = `
    <div class="modal-body" style="padding:32px 24px 16px;">
      <div class="confirm-icon ${type}">${iconHtml}</div>
      <div class="confirm-title">${title}</div>
      <div class="confirm-text">${message}</div>
    </div>
    <div class="modal-footer" style="justify-content:center;">
      <button class="btn btn-default" onclick="closeConfirm()">取消</button>
      <button class="btn btn-${type}" id="confirmOkBtn" onclick="executeConfirm()">确认</button>
    </div>
  `;

  overlay.classList.add('active');
}

function executeConfirm() {
  closeConfirm();
  if (_confirmCallback) {
    _confirmCallback();
    _confirmCallback = null;
  }
}

function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('active');
}
