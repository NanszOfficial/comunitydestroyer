/* ============================================
   DESTROYER COMMUNITY — ADMIN.JS
  Logika utama admin: cek login dan logout
   ============================================ */

/* ============ CEK LOGIN ADMIN ============ */
async function checkAdmin() {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();

    if (!res.ok || !data.user || data.user.role !== "owner") {
      // Simpan URL sekarang buat balik setelah login
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login.html?redirect=${redirect}`;
      return false;
    }

    // Simpan data user ke global
    window.currentAdmin = data.user;
    return true;

  } catch (err) {
    console.error("[checkAdmin]", err);
    window.location.href = "/login.html";
    return false;
  }
}

/* ============ LOGOUT ============ */
function initLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!confirm("Yakin mau logout?")) return;

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("[logout]", err);
    }

    window.location.href = "/login.html";
  });
}

/* ============ TOGGLE SIDEBAR MOBILE ============ */
function initAdminNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    nav.classList.toggle("nav-open");
  });
}

/* ============ TOAST (fallback kalau toast.js gak ke-load) ============ */
if (typeof window.showToast !== "function") {
  window.showToast = function (message, type = "success", duration = 3000) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };
}

/* ============ FORMAT WAKTU ============ */
function formatTime(iso) {
  const d = new Date(iso);
  const diff = Math.floor((new Date() - d) / 1000);
  if (diff < 60) return "baru aja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ============ ESCAPE HTML ============ */
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

/* ============ CONFIRM MODAL ============ */
function confirmAction(message) {
  return new Promise((resolve) => {
    // Kalau ada modal custom, pakai itu
    // Kalau gak, fallback ke confirm()
    resolve(window.confirm(message));
  });
}

/* ============ INIT GLOBAL ============ */
document.addEventListener("DOMContentLoaded", () => {
  initLogout();
  initAdminNavToggle();
});