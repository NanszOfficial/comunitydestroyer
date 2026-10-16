document.addEventListener("DOMContentLoaded", async () => {
  if (!(await checkAdmin())) return;

  const form = document.getElementById("communityPostForm");
  const list = document.getElementById("communityAdminList");
  const status = document.getElementById("communityAdminStatus");
  const publishButton = document.getElementById("publishCommunityPost");

  await loadAdminCommunityPosts();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    publishButton.disabled = true;
    status.textContent = "Menyimpan update...";

    const result = await API.admin.createCommunityPost({
      title: document.getElementById("postTitle").value.trim(),
      body: document.getElementById("postBody").value.trim(),
    });

    publishButton.disabled = false;
    if (!result.ok) {
      status.textContent = result.error || "Update gagal diterbitkan.";
      return;
    }

    form.reset();
    status.textContent = "Update berhasil diterbitkan.";
    await loadAdminCommunityPosts();
  });

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-post]");
    if (!button) return;
    if (!window.confirm("Hapus postingan ini beserta komentarnya?")) return;

    button.disabled = true;
    const result = await API.admin.deleteCommunityPost(button.dataset.deletePost);
    if (!result.ok) {
      button.disabled = false;
      status.textContent = result.error || "Postingan gagal dihapus.";
      return;
    }

    status.textContent = "Postingan dihapus.";
    await loadAdminCommunityPosts();
  });

  async function loadAdminCommunityPosts() {
    const result = await API.admin.communityPosts();
    if (!result.ok) {
      list.innerHTML = `<p class="section-desc">${escapeHTML(result.error || "Postingan belum bisa dimuat.")}</p>`;
      return;
    }

    const posts = result.data.posts || [];
    if (!posts.length) {
      list.innerHTML = '<p class="section-desc">Belum ada postingan.</p>';
      return;
    }

    list.innerHTML = posts.map((post) => `
      <article class="community-admin-post">
        <div class="community-admin-post-copy">
          <h3>${escapeHTML(post.title)}</h3>
          <p>${escapeHTML(post.body)}</p>
          <span>${escapeHTML(post.author)} · ${escapeHTML(formatTime(post.createdAt))}</span>
        </div>
        <button type="button" class="btn btn-outline btn-small" data-delete-post="${escapeHTML(post.id)}" aria-label="Hapus ${escapeHTML(post.title)}">Hapus</button>
      </article>
    `).join("");
  }
});