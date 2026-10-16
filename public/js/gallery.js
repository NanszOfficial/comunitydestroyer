/* ============================================
   DESTROYER COMMUNITY — GALLERY.JS
   Render galeri + filter + lightbox
   ============================================ */

/* ============ STATE ============ */
let allGallery = [];
let filteredGallery = [];
let currentIndex = 0;
let activeFilter = "all";

/* ============ INIT ============ */
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  loadGallery();
  initFilter();
  initLightbox();
});

/* ============ LOAD GALLERY ============ */
function loadGallery() {
  if (typeof config === "undefined") return;

  allGallery = config.gallery || [];
  renderGallery();
}

/* ============ RENDER GRID ============ */
function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  filteredGallery = activeFilter === "all"
    ? allGallery
    : allGallery.filter((g) => g.game === activeFilter);

  if (filteredGallery.length === 0) {
    grid.innerHTML = `
      <div class="gallery-empty">
        <div class="gallery-empty-icon">🖼️</div>
        <p class="section-desc">Belum ada gambar di kategori ini.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredGallery.map((g, i) => `
    <div
      class="gallery-item"
      data-index="${i}"
      style="animation-delay:${i * 50}ms"
    >
      <img
        src="${g.src}"
        alt="${escapeHTML(g.caption || "Gallery")}"
        loading="lazy"
        onerror="this.parentElement.style.display='none'"
      />
      <div class="gallery-overlay">
        <span class="gallery-caption">${escapeHTML(g.caption || "")}</span>
        ${g.game ? `<span class="game-tag">${escapeHTML(g.game)}</span>` : ""}
      </div>
    </div>
  `).join("");

  // Pasang event klik
  grid.querySelectorAll(".gallery-item").forEach((el) => {
    el.addEventListener("click", () => openLightbox(+el.dataset.index));
  });
}

/* ============ FILTER ============ */
function initFilter() {
  const wrap = document.getElementById("galleryFilter");
  if (!wrap) return;

  wrap.querySelectorAll("[data-game]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll("[data-game]").forEach((b) => {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      activeFilter = btn.dataset.game;
      renderGallery();
    });
  });
}

/* ============ LIGHTBOX ============ */
function openLightbox(index) {
  const lb = document.getElementById("lightbox");
  if (!lb) return;

  currentIndex = index;
  updateLightbox();
  lb.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;

  lb.classList.remove("open");
  document.body.style.overflow = "";
}

function updateLightbox() {
  const item = filteredGallery[currentIndex];
  if (!item) return;

  const img = document.getElementById("lightboxImg");
  const caption = document.getElementById("lightboxCaption");

  if (img) {
    img.src = item.src;
    img.alt = item.caption || "";
  }
  if (caption) {
    caption.textContent = item.caption || "";
  }
}

function nextImage() {
  if (filteredGallery.length === 0) return;
  currentIndex = (currentIndex + 1) % filteredGallery.length;
  updateLightbox();
}

function prevImage() {
  if (filteredGallery.length === 0) return;
  currentIndex = (currentIndex - 1 + filteredGallery.length) % filteredGallery.length;
  updateLightbox();
}

function initLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;

  const closeBtn = document.getElementById("lightboxClose");
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (prevBtn) prevBtn.addEventListener("click", prevImage);
  if (nextBtn) nextBtn.addEventListener("click", nextImage);

  // Klik background → tutup
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "ArrowLeft") prevImage();
  });

  // Swipe (mobile)
  initSwipe(lb);
}

/* ============ SWIPE MOBILE ============ */
function initSwipe(lb) {
  let touchStartX = 0;
  let touchEndX = 0;

  lb.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lb.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < 50) return; // terlalu kecil, ignore

    if (diff > 0) {
      nextImage(); // swipe kiri → next
    } else {
      prevImage(); // swipe kanan → prev
    }
  }
}

/* ============ HELPER ============ */
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}