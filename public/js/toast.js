/* ============================================
   DESTROYER COMMUNITY — TOAST.JS
   Notifikasi kecil (success / error / info)
   ============================================ */

/* ============ STATE ============ */
const TOAST_QUEUE = [];
let toastActive = false;

/* ============ CORE: SHOW TOAST ============ */
function showToast(message, type = "success", duration = 3000) {
  // Validasi tipe
  const validTypes = ["success", "error", "info", "warning"];
  if (!validTypes.includes(type)) type = "success";

  // Kalau ada toast aktif, masuk queue
  if (toastActive) {
    TOAST_QUEUE.push({ message, type, duration });
    return;
  }

  // Bikin elemen toast
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");

  // Icon berdasarkan tipe
  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️",
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${escapeHTML(message)}</span>
    <button class="toast-close" aria-label="Tutup">×</button>
  `;

  document.body.appendChild(toast);
  toastActive = true;

  // Trigger animasi masuk
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Tombol close
  toast.querySelector(".toast-close").addEventListener("click", () => {
    removeToast(toast);
  });

  // Auto hilang
  const timer = setTimeout(() => {
    removeToast(toast);
  }, duration);

  // Kalau di-hover, pause timer
  toast.addEventListener("mouseenter", () => clearTimeout(timer));
  toast.addEventListener("mouseleave", () => {
    setTimeout(() => removeToast(toast), 1500);
  });
}

/* ============ REMOVE TOAST ============ */
function removeToast(toast) {
  if (!toast || !toast.parentElement) return;

  toast.classList.remove("show");
  toast.classList.add("hide");

  setTimeout(() => {
    toast.remove();
    toastActive = false;

    // Proses queue berikutnya
    if (TOAST_QUEUE.length > 0) {
      const next = TOAST_QUEUE.shift();
      showToast(next.message, next.type, next.duration);
    }
  }, 300);
}

/* ============ HELPER: ESCAPE HTML ============ */
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

/* ============ SHORTCUT ============ */
function toastSuccess(msg, duration) {
  showToast(msg, "success", duration);
}

function toastError(msg, duration) {
  showToast(msg, "error", duration);
}

function toastInfo(msg, duration) {
  showToast(msg, "info", duration);
}

function toastWarning(msg, duration) {
  showToast(msg, "warning", duration);
}

/* ============ EXPORT GLOBAL ============ */
window.showToast = showToast;
window.toastSuccess = toastSuccess;
window.toastError = toastError;
window.toastInfo = toastInfo;
window.toastWarning = toastWarning;