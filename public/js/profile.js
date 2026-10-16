/* ============================================
   DESTROYER COMMUNITY — PROFILE.JS
   Render profil user + video mereka
   ============================================ */

/* ============ STATE ============ */
let profileUser = null;

/* ============ INIT ============ */
document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("profileWrap")) return;

  const userId = getUserIdFromUrl();

  if (!userId) {
    showNotFound();
    return;
  }

  await loadProfile(userId);
});

/* ============ AMBIL ID DARI URL ============ */
function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/* ============ LOAD PROFIL ============ */
async function loadProfile(userId) {
  try {
    // Ambil data user
    const userRes = await API.users.get(userId);
    if (!userRes.ok || !userRes.data.user) {
      showNotFound();
      return;
    }
    profileUser = userRes.data.user;

    renderProfile();
    updateMeta();

  } catch (err) {
    console.error("[loadProfile]", err);
    showNotFound();
  }
}

/* ============ RENDER PROFIL ============ */
function renderProfile() {
  const wrap = document.getElementById("profileWrap");
  if (!wrap || !profileUser) return;

  const u = profileUser;
  const tag = u.gamer_tag || u.gamerTag || u.username || "User";
  const avatar = u.avatar || tag.charAt(0).toUpperCase();
  const bio = u.bio || "Gak ada bio.";
  const role = u.role === "owner" || u.role === "admin" ? "Founder" : "Member";
  const games = u.games || [];

  wrap.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">${escapeHTML(avatar)}</div>

      <div class="profile-info">
        <h1 class="profile-tag">${escapeHTML(tag)}</h1>
        <p class="profile-role">${escapeHTML(role)}</p>
        <p class="profile-bio">${escapeHTML(bio)}</p>

        ${games.length > 0 ? `
          <div class="profile-games">
            ${games.map((g) => `<span class="game-tag">${escapeHTML(g)}</span>`).join("")}
          </div>
        ` : ""}

        <div class="profile-links">
          ${u.tiktok_url ? `
            <a href="${escapeHTML(u.tiktok_url)}" target="_blank" rel="noopener" class="btn btn-outline">
              🎵 TikTok
            </a>
          ` : ""}
          ${u.instagram_url ? `
            <a href="${escapeHTML(u.instagram_url)}" target="_blank" rel="noopener" class="btn btn-outline">
              📷 Instagram
            </a>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

/* ============ UPDATE META ============ */
function updateMeta() {
  if (!profileUser) return;

  const tag = profileUser.gamer_tag || profileUser.gamerTag || profileUser.username || "User";
  const bio = profileUser.bio || "Profil Destroyer Community";

  document.title = `${tag} — Destroyer Community`;

  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement("meta");
    metaDesc.name = "description";
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = bio;
}

/* ============ NOT FOUND ============ */
function showNotFound() {
  const wrap = document.getElementById("profileWrap");
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="profile-empty">
      <div class="profile-empty-icon">👤</div>
      <h2>User Gak Ditemukan</h2>
      <p class="section-desc">User yang kamu cari gak ada, atau udah dihapus.</p>
      <a href="/" class="btn btn-primary">Balik ke Home</a>
    </div>
  `;
}

/* ============ HELPER: ESCAPE HTML ============ */
function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}