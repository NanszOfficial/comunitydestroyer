const COMMUNITY_NAME = "destroyerCommunityName";

document.addEventListener("DOMContentLoaded", () => {
  initCommunityFeed();
});

async function initCommunityFeed() {
  const feed = document.getElementById("communityFeed");
  if (!feed) return;

  let myName = localStorage.getItem(COMMUNITY_NAME) || "";
  feed.innerHTML = '<p class="section-desc">Memuat update komunitas...</p>';
  await refreshCommunityFeed();

  feed.addEventListener("submit", async (event) => {
    const form = event.target.closest(".comment-form");
    if (!form) return;
    event.preventDefault();

    const nameInput = form.querySelector(".comment-name");
    const messageInput = form.querySelector("textarea");
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();
    if (name.length < 2 || !message) {
      window.alert("Isi nama dan komentar dulu.");
      return;
    }

    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    const result = await API.community.comment(form.dataset.postId, { name, message });
    button.disabled = false;

    if (!result.ok) {
      window.alert(result.error || "Komentar belum berhasil dikirim.");
      return;
    }

    myName = name;
    localStorage.setItem(COMMUNITY_NAME, myName);
    await refreshCommunityFeed();
  });

  async function refreshCommunityFeed() {
    try {
      const result = await API.community.posts();
      if (!result.ok) {
        showCommunityUnavailable();
        return;
      }
      renderCommunityFeed(result.data.posts || [], myName);
    } catch (error) {
      console.error("[communityFeed]", error);
      showCommunityUnavailable();
    }
  }

  function showCommunityUnavailable() {
      const count = document.getElementById("communityPostCount");
      if (count) count.textContent = "Offline";
      feed.innerHTML = '<p class="section-desc">Update komunitas belum bisa dimuat. Coba lagi nanti.</p>';
  }
}

function renderCommunityFeed(posts, myName) {
  const feed = document.getElementById("communityFeed");
  const count = document.getElementById("communityPostCount");
  if (count) count.textContent = `${posts.length} topik`;

  if (!posts.length) {
    feed.innerHTML = '<div class="forum-empty"><strong>Belum ada diskusi.</strong><span>Topik baru akan muncul di sini.</span></div>';
    return;
  }

  feed.innerHTML = posts.map((post) => {
    const comments = post.comments || [];
    const author = String(post.author || "D");
    return `
    <article class="community-post reveal">
      <div class="post-aside">
        <span class="post-avatar" aria-hidden="true">${escapeCommunityHTML(author.charAt(0).toUpperCase())}</span>
        <strong>${comments.length}</strong>
        <span>balasan</span>
      </div>
      <div class="post-content">
        <div class="post-head">
          <span class="post-author">${escapeCommunityHTML(author)}</span>
          <time class="post-date">${formatCommunityDate(post.createdAt)}</time>
        </div>
        <h3>${escapeCommunityHTML(post.title)}</h3>
        <p class="post-body">${escapeCommunityHTML(post.body)}</p>
        <div class="comment-list">
          ${comments.length ? comments.map((comment) => `
            <div class="comment-box">
              <div class="comment-meta">
                <strong>${escapeCommunityHTML(comment.author)}</strong>
                <time>${formatCommunityDate(comment.createdAt)}</time>
              </div>
              <p>${escapeCommunityHTML(comment.message)}</p>
            </div>
          `).join("") : '<p class="empty-comments">Belum ada balasan.</p>'}
        </div>
        <form class="comment-form" data-post-id="${escapeCommunityHTML(post.id)}">
          <div class="comment-form-row">
            <input type="text" class="comment-name" maxlength="30" minlength="2" value="${escapeCommunityHTML(myName)}" placeholder="Nama kamu" aria-label="Nama kamu" required />
            <textarea rows="2" maxlength="220" minlength="2" placeholder="Tulis balasan..." aria-label="Tulis balasan" required></textarea>
          </div>
          <button type="submit" class="btn btn-outline btn-small">Balas</button>
        </form>
      </div>
    </article>
  `;
  }).join("");
}

function formatCommunityDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeCommunityHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}