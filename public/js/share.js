/* ============================================
   DESTROYER COMMUNITY — SHARE.JS
   Tombol share + copy link
   ============================================ */

/* ============ SHARE CONFIG ============ */
const SHARE_PLATFORMS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    getUrl: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(title + "\n" + url)}`,
  },
  {
    id: "twitter",
    label: "Twitter / X",
    icon: "𝕏",
    getUrl: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "📘",
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: "✈️",
    getUrl: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "discord",
    label: "Discord",
    icon: "🎮",
    getUrl: () => null, // gak ada URL share, pakai copy
  },
  {
    id: "copy",
    label: "Copy Link",
    icon: "🔗",
    getUrl: () => null, // pakai clipboard
  },
];

/* ============ INIT SHARE BUTTONS ============ */
function initShareButtons() {
  document.querySelectorAll("[data-share]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const type = btn.dataset.share;
      openShare(type, btn.dataset.title || document.title);
    });
  });
}

/* ============ OPEN SHARE ============ */
function openShare(type, title = document.title) {
  const url = window.location.href;
  const platform = SHARE_PLATFORMS.find((p) => p.id === type);

  if (!platform) return;

  // Copy link
  if (type === "copy") {
    copyToClipboard(url).then((ok) => {
      if (ok) {
        notify("Link dicopy!", "success");
      } else {
        notify("Gagal copy link.", "error");
      }
    });
    return;
  }

  // Discord → copy aja
  if (type === "discord") {
    copyToClipboard(url).then((ok) => {
      if (ok) {
        notify("Link dicopy! Paste di Discord.", "success");
      } else {
        notify("Gagal copy link.", "error");
      }
    });
    return;
  }

  // Web Share API (mobile)
  if (navigator.share && (type === "native" || type === "auto")) {
    navigator
      .share({ title, url })
      .catch(() => {});
    return;
  }

  // Buka popup
  const shareUrl = platform.getUrl(url, title);
  if (shareUrl) {
    window.open(shareUrl, "_blank", "width=600,height=500,noopener");
  }
}

/* ============ COPY TO CLIPBOARD ============ */
async function copyToClipboard(text) {
  // Cara modern
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }

  // Fallback: textarea
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ============ NOTIFIKASI ============ */
function notify(msg, type = "success") {
  if (typeof showToast === "function") {
    showToast(msg, type);
  } else {
    // Fallback: bikin toast manual
    document.querySelectorAll(".share-toast").forEach((t) => t.remove());

    const toast = document.createElement("div");
    toast.className = `share-toast share-toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

/* ============ AUTO-INJECT SHARE BUTTONS ============ */
/* Cari element dengan [data-share-auto] dan inject tombol share */
function autoInjectShare() {
  document.querySelectorAll("[data-share-auto]").forEach((container) => {
    const title = container.dataset.title || document.title;
    const platforms = (container.dataset.platforms || "whatsapp,twitter,facebook,telegram,copy")
      .split(",")
      .map((s) => s.trim());

    container.innerHTML = `
      <div class="share-wrap">
        <span class="share-label">Share:</span>
        ${platforms
          .map((id) => {
            const p = SHARE_PLATFORMS.find((x) => x.id === id);
            if (!p) return "";
            return `
              <button
                class="share-btn"
                data-share="${p.id}"
                data-title="${escapeAttr(title)}"
                aria-label="Share ke ${p.label}"
                title="${p.label}"
              >${p.icon}</button>
            `;
          })
          .join("")}
      </div>
    `;
  });
}

/* ============ HELPER: ESCAPE ATTR ============ */
function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ============ INIT ============ */
document.addEventListener("DOMContentLoaded", () => {
  autoInjectShare();
  initShareButtons();
});

/* ============ EXPORT ============ */
window.sharePage = openShare;
window.copyLink = () => copyToClipboard(window.location.href);