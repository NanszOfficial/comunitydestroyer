/* ============================================
   DESTROYER COMMUNITY — AUTH.JS
  Login owner + Register user (1 IP = 1 akun)
   ============================================ */

/* ============================================
  LOGIN OWNER
   ============================================ */
function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const errorEl = document.getElementById("authError");
  const btn = document.getElementById("loginBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError(errorEl);

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    if (!username || !password) {
      return showError(errorEl, "Isi username & password dulu.");
    }

    btn.disabled = true;
    btn.textContent = "Login...";

    try {
      const res = await API.auth.login(username, password);

      if (!res.ok) {
        showError(errorEl, res.error || "Login gagal.");
        return;
      }

      // Hanya owner yang boleh membuka panel.
      if (res.data.role !== "owner") {
        showError(errorEl, "Akun ini bukan owner.");
        return;
      }

      // Redirect ke dashboard atau halaman yang dituju
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      window.location.href = redirect || "/admin/dashboard.html";

    } catch (err) {
      console.error("[login]", err);
      showError(errorEl, "Koneksi error. Coba lagi.");
    } finally {
      btn.disabled = false;
      btn.textContent = "🔐 Login Owner";
    }
  });
}

/* ============================================
   REGISTER USER BIASA
   1 IP = 1 akun. Setelah daftar, auto-login selamanya.
   ============================================ */
function initRegister() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const errorEl = document.getElementById("authError");
  const btn = document.getElementById("registerBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError(errorEl);

    const username = document.getElementById("username").value.trim();
    const gamerTag = document.getElementById("gamerTag").value.trim();
    const bio = document.getElementById("bio")?.value.trim() || "";
    const games = [...document.querySelectorAll(".game-check:checked")]
      .map((c) => c.value);

    // Validasi
    if (username.length < 3) {
      return showError(errorEl, "Username minimal 3 karakter.");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return showError(errorEl, "Username cuma boleh huruf, angka, underscore.");
    }
    if (gamerTag.length < 2) {
      return showError(errorEl, "Gamer tag minimal 2 karakter.");
    }
    if (games.length === 0) {
      return showError(errorEl, "Pilih minimal 1 game.");
    }

    btn.disabled = true;
    btn.textContent = "Mendaftar...";

    try {
      const res = await API.auth.register({
        username,
        gamerTag,
        bio,
        games,
      });

      if (!res.ok) {
        showError(errorEl, res.error || "Gagal daftar.");
        return;
      }

      // Sukses → redirect ke home
      window.location.href = "/";

    } catch (err) {
      console.error("[register]", err);
      showError(errorEl, "Koneksi error. Coba lagi.");
    } finally {
      btn.disabled = false;
      btn.textContent = "🚀 Daftar Sekarang";
    }
  });
}

/* ============================================
   TOGGLE PASSWORD
   ============================================ */
function initTogglePass() {
  const toggle = document.getElementById("togglePass");
  const input = document.getElementById("password");
  if (!toggle || !input) return;

  toggle.addEventListener("click", () => {
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    toggle.textContent = isPass ? "🙈" : "👁";
  });
}

/* ============================================
   CEK SESSION USER
   Dipanggil di semua halaman publik
   ============================================ */
async function checkUserSession() {
  try {
    const res = await API.auth.me();
    if (res.ok) {
      window.currentUser = res.data.user;
      return res.data;
    }
    return { user: null, isAdmin: false };
  } catch {
    return { user: null, isAdmin: false };
  }
}

/* ============================================
   AUTO-REDIRECT KE REGISTER
   Kalau user belum terdaftar & buka halaman yang butuh login
   ============================================ */
async function requireUser() {
  const session = await checkUserSession();

  if (!session.user) {
    const redirect = encodeURIComponent(window.location.pathname);
    window.location.href = `/register.html?redirect=${redirect}`;
    return false;
  }

  return true;
}

/* ============================================
   HELPER: ERROR
   ============================================ */
function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

function hideError(el) {
  if (!el) return;
  el.style.display = "none";
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initRegister();
  initTogglePass();
});