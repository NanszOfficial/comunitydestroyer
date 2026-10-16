/* ============================================
   DESTROYER COMMUNITY — API.JS
   Wrapper fetch API — biar rapi & konsisten
   ============================================ */

const API = {
  /* ============ CORE ============ */
  async request(endpoint, options = {}) {
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // kirim cookie session
      ...options,
    };

    try {
      const res = await fetch(endpoint, config);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: data.error || `HTTP ${res.status}`,
          data: null,
        };
      }

      return { ok: true, status: res.status, error: null, data };

    } catch (err) {
      console.error(`[API] ${endpoint}`, err);
      return {
        ok: false,
        status: 0,
        error: "Koneksi error. Coba lagi.",
        data: null,
      };
    }
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { method: "GET", ...options });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    });
  },

  del(endpoint, options = {}) {
    return this.request(endpoint, { method: "DELETE", ...options });
  },

  /* ============ AUTH ============ */
  auth: {
    login(username, password) {
      return API.post("/api/auth/login", { username, password });
    },

    register(data) {
      return API.post("/api/auth/register", data);
    },

    logout() {
      return API.post("/api/auth/logout");
    },

    me() {
      return API.get("/api/auth/me");
    },
  },

  /* ============ USERS ============ */
  users: {
    list() {
      return API.get("/api/users");
    },

    get(id) {
      return API.get(`/api/users/${id}`);
    },

    updateMe(data) {
      return API.put("/api/users/me", data);
    },
  },

  /* ============ VIDEOS ============ */
  videos: {
    list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return API.get(`/api/videos${q ? "?" + q : ""}`);
    },

    mine() {
      return API.get("/api/videos/mine");
    },

    byUser(userId) {
      return API.get(`/api/videos/user/${userId}`);
    },

    create(data) {
      return API.post("/api/videos", data);
    },

    update(id, data) {
      return API.put(`/api/videos/${id}`, data);
    },

    remove(id) {
      return API.del(`/api/videos/${id}`);
    },
  },

  /* ============ COMMENTS ============ */
  comments: {
    list() {
      return API.get("/api/comments");
    },

    create(data) {
      return API.post("/api/comments", data);
    },

    react(id, emoji) {
      return API.post(`/api/comments/${id}/react`, { emoji });
    },
  },

  /* ============ COMMUNITY ============ */
  community: {
    posts() {
      return API.get("/api/community/posts");
    },

    comment(postId, data) {
      return API.post(`/api/community/posts/${postId}/comments`, data);
    },
  },

  /* ============ GALLERY ============ */
  gallery: {
    list() {
      return API.get("/api/gallery");
    },

    create(data) {
      return API.post("/api/gallery", data);
    },

    remove(id) {
      return API.del(`/api/gallery/${id}`);
    },
  },

  /* ============ ADMIN ============ */
  admin: {
    dashboard() {
      return API.get("/api/admin/dashboard");
    },

    communityPosts() {
      return API.get("/api/community/posts");
    },

    createCommunityPost(data) {
      return API.post("/api/community/posts", data);
    },

    deleteCommunityPost(id) {
      return API.del(`/api/community/posts/${id}`);
    },
  },
};

/* ============ EXPORT GLOBAL ============ */
window.API = API;