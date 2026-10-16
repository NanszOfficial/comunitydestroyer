/* ============================================
   DESTROYER COMMUNITY — FEEDBACK.JS
   Komentar tanpa akun + 1 IP = 1 nama + reaction
   ============================================ */

/* ============ STATE ============ */
let myName = null;
let comments = [];

/* ============ ELEMEN ============ */
const form        = document.getElementById("feedbackForm");
const nameField   = document.getElementById("nameField");
const nameInput   = document.getElementById("nameInput");
const nameLocked  = document.getElementById("nameLocked");
const msgInput    = document.getElementById("msgInput");
const submitBtn   = document.getElementById("submitBtn");
const charCount   = document.getElementById("charCount");
const commentsList = document.getElementById("commentsList");
const commentCount = document.getElementById("commentCount");
const loadingText = document.getElementById("loadingText");

/* ============ INIT ============ */
document.addEventListener("DOMContentLoaded", () => {
  if (!form) return;

  updateCharCount();
  initCharCounter();
  initSubmit();
  loadComments();
});

/* ============ CHAR COUNTER ============ */
function initCharCounter() {
  if (!msgInput) return;
  msgInput.addEventListener("input", updateCharCount);
}

function updateCharCount() {
  if (!charCount || !msgInput) return;
  charCount.textContent = `${msgInput.value.length} / 300`;
}

/* ============ LOAD KOMENTAR ============ */
async function loadComments() {
  try {
    const res = await API.comments.list();

    if (!res.ok) throw new Error(res.error);

    comments = res.data.comments || [];
    myName = res.data.myName;

    updateNameUI();
    renderComments(comments);

  } catch (err) {
    console.error("[loadComments]", err);
    if (commentsList) {
      commentsList.innerHTML = `
        <p class="section-desc">Gagal load komentar. Coba refresh halaman.</p>
      `;
    }
  }
}

/* ============ UPDATE UI NAMA ============ */
function updateNameUI() {
  if (!nameField || !nameLocked) return;

  if (myName) {
    nameField.style.display = "none";
    nameLocked.style.display = "flex";
    nameLocked.textContent = `Komentar sebagai: ${myName}`;
  } else {
    nameField.style.display = "block";
    nameLocked.style.display = "none";
  }
}

/* ============ RENDER KOMENTAR ============ */
function renderComments(list) {
  if (!commentsList) return;

  if (!list || list.length === 0) {
    commentsList.innerHTML = `
      <p class="section-desc">Belum ada masukan. Jadi yang pertama!</p>
    `;
    if (commentCount) commentCount.textContent = "";
    return;
  }

  if (commentCount) {
    commentCount.textContent = `${list.length} komentar`;
  }

  commentsList.innerHTML = list.map((c, i) => `
    <div class="comment" style="animation-delay:${i * 40}ms">
      <div class="comment-head">
        <span class="name">${escapeHTML(c.name)}</span>
        <span class="time">${formatTime(c.created_at)}</span>
      </div>
      <div class="msg">${escapeHTML(c.message)}</div>
      <div class="reactions" data-comment-id="${c.id}">
        ${renderReactions(c)}
      </div>
    </div>
  `).join("");

  // Pasang event reaction
  commentsList.querySelectorAll(".reaction").forEach((btn) => {
    btn.addEventListener("click", () => handleReaction(btn));
  });
}

/* ============ RENDER REACTION ============ */
function renderReactions(c) {
  const emojis = ["🔥", "👍", "😂", "❤️"];
  const counts = c.reactions || {};
  const myReactions = c.myReactions || [];

  return emojis.map((emoji) => {
    const count = counts[emoji] || 0;
    const active = myReactions.includes(emoji) ? "active" : "";
    return `
      <button
        class="reaction ${active}"
        data-comment-id="${c.id}"
        data-emoji="${emoji}"
        ${myReactions.includes(emoji) ? "disabled" : ""}
      >
        ${emoji}${count > 0 ? ` <span>${count}</span>` : ""}
      </button>
    `;
  }).join("");
}

/* ============ HANDLE REACTION ============ */
async function handleReaction(btn) {
  const commentId = btn.dataset.commentId;
  const emoji = btn.dataset.emoji;

  if (!commentId || !emoji) return;

  // Optimistic UI: disable + tambah 1
  btn.disabled = true;
  btn.classList.add("active");

  try {
    const res = await API.comments.react(commentId, emoji);

    if (!res.ok) {
      // Gagal → revert
      btn.disabled = false;
      btn.classList.remove("active");
      if (typeof showToast === "function") {
        showToast(res.error || "Gagal react.", "error");
      }
      return;
    }

    // Sukses → reload komentar biar count akurat
    await loadComments();

  } catch (err) {
    console.error("[handleReaction]", err);
    btn.disabled = false;
    btn.classList.remove("active");
  }
}

/* ============ SUBMIT KOMENTAR ============ */
function initSubmit() {
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = msgInput.value.trim();

    // Validasi
    if (message.length < 2) {
      return alertToast("Pesan terlalu pendek, minimal 2 karakter.", "error");
    }

    if (!myName && nameInput.value.trim().length < 2) {
      return alertToast("Isi nama dulu (minimal 2 karakter).", "error");
    }

    // Disable tombol
    submitBtn.disabled = true;
    submitBtn.textContent = "Kirim...";

    try {
      const res = await API.comments.create({
        name: myName ? null : nameInput.value.trim(),
        message,
      });

      if (!res.ok) {
        alertToast(res.error || "Gagal kirim.", "error");
        return;
      }

      // Sukses → reset
      msgInput.value = "";
      updateCharCount();

      // Update nama kalau baru pertama kali
      if (!myName && res.data.name) {
        myName = res.data.name;
        updateNameUI();
      }

      // Reload komentar
      await loadComments();

      // Notif sukses
      if (typeof showToast === "function") {
        showToast("Masukan terkirim!", "success");
      }

    } catch (err) {
      console.error("[submit]", err);
      alertToast("Koneksi error. Coba lagi.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Kirim";
    }
  });
}

/* ============ HELPER: ALERT / TOAST ============ */
function alertToast(msg, type = "error") {
  if (typeof showToast === "function") {
    showToast(msg, type);
  } else {
    alert(msg);
  }
}

/* ============ HELPER: FORMAT WAKTU ============ */
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