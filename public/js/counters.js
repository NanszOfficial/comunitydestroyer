/* ============================================
   DESTROYER COMMUNITY — COUNTERS.JS
   Animasi angka statistik
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  initStats();
});

/* ============ INIT STATS ============ */
function initStats() {
  const wrap = document.getElementById("statsGrid");
  if (!wrap || typeof config === "undefined") return;

  const stats = config.stats || [];

  if (stats.length === 0) {
    wrap.innerHTML = "";
    return;
  }

  // Render HTML stat card
  wrap.innerHTML = stats.map((s, i) => `
    <div class="stat-card" style="animation-delay:${i * 100}ms">
      <div
        class="stat-value"
        data-target="${s.value}"
        data-suffix="${s.suffix || ""}"
      >0</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join("");

  // Pasang IntersectionObserver biar animasi mulai pas di-scroll
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          animateCounter(el, +el.dataset.target, el.dataset.suffix);
          obs.unobserve(el);
        }
      });
    },
    { threshold: 0.4 }
  );

  wrap.querySelectorAll(".stat-value").forEach((el) => obs.observe(el));
}

/* ============ ANIMASI COUNTER ============ */
function animateCounter(el, target, suffix = "", duration = 1800) {
  const start = 0;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);

    // Ease-out cubic → makin lama makin lambat
    const eased = 1 - Math.pow(1 - progress, 3);

    const value = Math.floor(start + (target - start) * eased);

    el.textContent = formatNumber(value) + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Pastikan angka akhir pas
      el.textContent = formatNumber(target) + suffix;
    }
  }

  requestAnimationFrame(update);
}

/* ============ FORMAT ANGKA ============ */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toLocaleString("id-ID");
}