/* ============================================
   DESTROYER COMMUNITY — MAIN.JS
   Navbar, scroll reveal, back-to-top, dll
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initThemeToggle();
  initBackToTop();
  initReveal();
  initYear();
  initFooterLinks();
  initNavLinks();
});

/* ============ LIGHT / DARK THEME ============ */
function initThemeToggle() {
  const root = document.documentElement;
  const navLinks = document.querySelector(".nav-links");
  const savedTheme = localStorage.getItem("destroyerTheme");
  let theme = savedTheme === "dark" ? "dark" : "light";

  function applyTheme(nextTheme) {
    theme = nextTheme;
    root.dataset.theme = theme;
    localStorage.setItem("destroyerTheme", theme);

    if (!toggle) return;
    const nextLabel = theme === "dark" ? "Light theme" : "Dark theme";
    toggle.textContent = nextLabel;
    toggle.setAttribute("aria-label", `Switch to ${nextLabel.toLowerCase()}`);
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
  }

  root.dataset.theme = theme;
  if (!navLinks) return;

  const item = document.createElement("li");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "theme-toggle";
  item.appendChild(toggle);
  navLinks.appendChild(item);

  toggle.addEventListener("click", () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  });

  applyTheme(theme);
}

/* ============ NAVBAR MOBILE TOGGLE ============ */
function initNavbar() {
  const nav = document.querySelector("nav");
  const toggle = document.querySelector(".nav-toggle");
  if (!nav || !toggle) return;

  toggle.addEventListener("click", () => {
    nav.classList.toggle("nav-open");
  });

  // Tutup menu kalau klik link
  nav.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("nav-open");
    });
  });

  // Tutup menu kalau klik di luar
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && nav.classList.contains("nav-open")) {
      nav.classList.remove("nav-open");
    }
  });
}

/* ============ BACK TO TOP ============ */
function initBackToTop() {
  // Cek apakah tombol udah ada
  let btn = document.querySelector(".back-to-top");

  if (!btn) {
    btn = document.createElement("button");
    btn.className = "back-to-top";
    btn.innerHTML = "↑";
    btn.setAttribute("aria-label", "Back to top");
    document.body.appendChild(btn);
  }

  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ============ SCROLL REVEAL ============ */
function initReveal() {
  // Kalau browser gak support IntersectionObserver, tampil semua
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("revealed");
    });
    return;
  }

  // Auto-assign class "reveal" ke elemen tertentu
  const autoReveal = document.querySelectorAll(
    ".section, .card, .member-card, .video-card, .schedule-card, .admin-stat-card, .admin-action-card"
  );

  autoReveal.forEach((el) => {
    if (!el.classList.contains("reveal")) {
      el.classList.add("reveal");
    }
  });

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }
  );

  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
}

/* ============ YEAR DI FOOTER ============ */
function initYear() {
  const year = new Date().getFullYear();
  document.querySelectorAll(".year").forEach((el) => {
    el.textContent = year;
  });
}

/* ============ FOOTER LINKS DARI CONFIG ============ */
function initFooterLinks() {
  if (typeof config === "undefined") return;

  const links = config.links || {};
  const map = {
    footerDiscord: links.discord,
    footerTiktok: links.tiktok,
    footerInstagram: links.instagram,
    joinDiscord: links.discord,
    joinWhatsapp: links.whatsapp,
    joinInstagram: links.instagram,
    joinTiktok: links.tiktok,
  };

  Object.entries(map).forEach(([id, url]) => {
    const el = document.getElementById(id);
    if (el && url) {
      el.href = url;
    }
  });
}

/* ============ NAV LINKS — ACTIVE STATE ============ */
function initNavLinks() {
  const path = window.location.pathname;

  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = link.getAttribute("href");

    // Skip link yang bukan halaman
    if (!href || href.startsWith("http") || href === "#" || href.startsWith("/#")) {
      return;
    }

    // Cek apakah path cocok
    const isHome = (path === "/" || path === "/index.html") && href === "/";
    const isMatch = href !== "/" && path.includes(href.replace(/\.html$/, ""));

    if (isHome || isMatch) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/* ============ SMOOTH SCROLL (anchor link) ============ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (targetId === "#" || targetId.length < 2) return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const offset = 80; // tinggi navbar
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: "smooth" });
    });
  });
}
initSmoothScroll();

/* ============ LAZY LOAD IMAGES ============ */
function initLazyImages() {
  if (!("IntersectionObserver" in window)) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
          }
          obs.unobserve(img);
        }
      });
    },
    { rootMargin: "200px" }
  );

  document.querySelectorAll("img[data-src]").forEach((img) => obs.observe(img));
}
initLazyImages();