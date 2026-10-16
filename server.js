/* ============================================
   DESTROYER COMMUNITY — SERVER.JS
  Express + Supabase + Owner Auth + IP System
   ============================================ */

require("dotenv").config();

const express      = require("express");
const path         = require("path");
const crypto       = require("crypto");
const jwt          = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();

/* ============ MIDDLEWARE ============ */
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Static assets → /public/...
app.use("/public", express.static(path.join(__dirname, "public")));

// HTML files → langsung tanpa /public/
app.use(express.static(path.join(__dirname, "public")));

/* ============ SUPABASE ============ */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ============================================
   UTIL
   ============================================ */

function hashIP(ip) {
  return crypto
    .createHash("sha256")
    .update(ip + process.env.IP_SALT)
    .digest("hex");
}

function getIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress ||
    req.connection.remoteAddress ||
    "unknown"
  );
}

function signToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, process.env.SESSION_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.SESSION_SECRET);
  } catch {
    return null;
  }
}

function setSessionCookie(res, token, remember = false) {
  const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  });
}

function clearSessionCookie(res) {
  res.clearCookie("session");
}

/* ============ MIDDLEWARE: AUTH ============ */
function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: "Belum login." });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Session expired." });

  req.user = payload;
  next();
}

function requireOwner(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "owner") {
      return res.status(403).json({ error: "Khusus owner." });
    }
    next();
  });
}

/* ============================================
   AUTH ROUTES
   ============================================ */

/* ============ POST /api/auth/register ============ */
// Register user biasa — 1 IP = 1 akun
app.post("/api/auth/register", async (req, res) => {
  try {
    const ipHash = hashIP(getIP(req));
    let { username, gamerTag, bio, games } = req.body;

    // Validasi
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: "Username minimal 3 karakter." });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: "Username cuma boleh huruf, angka, underscore." });
    }
    if (!gamerTag || gamerTag.trim().length < 2) {
      return res.status(400).json({ error: "Gamer tag minimal 2 karakter." });
    }
    if (!Array.isArray(games) || games.length === 0) {
      return res.status(400).json({ error: "Pilih minimal 1 game." });
    }

    username = username.trim().toLowerCase();
    gamerTag = gamerTag.trim().slice(0, 20);

    // Cek IP udah terdaftar
    const { data: ipUser } = await supabase
      .from("users")
      .select("id, gamer_tag")
      .eq("ip_hash", ipHash)
      .maybeSingle();

    if (ipUser) {
      return res.status(400).json({
        error: `IP ini udah terdaftar sebagai "${ipUser.gamer_tag}". 1 IP = 1 akun.`,
      });
    }

    // Cek username udah dipakai
    const { data: nameUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (nameUser) {
      return res.status(400).json({ error: "Username udah dipakai." });
    }

    // Insert user
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        username,
        gamer_tag: gamerTag,
        bio: (bio || "").trim().slice(0, 150),
        games,
        role: "user",
        ip_hash: ipHash,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-login: bikin token user biasa
    const token = signToken({ id: user.id, username: user.username, role: user.role }, "365d");
    setSessionCookie(res, token, true);

    res.json({ success: true, user: publicUser(user) });

  } catch (err) {
    console.error("[POST /api/auth/register]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ POST /api/auth/login ============ */
// Owner credentials live in environment variables, not in the database.
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const ownerUsername = process.env.ADMIN_USERNAME;
    const ownerPassword = process.env.ADMIN_PASSWORD;
    if (!ownerUsername || !ownerPassword) {
      return res.status(503).json({ error: "Username dan password owner belum dikonfigurasi." });
    }

    if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
      return res.status(400).json({ error: "Isi username dan password." });
    }

    const submittedPasswordHash = crypto.createHash("sha256").update(password).digest();
    const ownerPasswordHash = crypto.createHash("sha256").update(ownerPassword).digest();
    if (username.trim() !== ownerUsername || !crypto.timingSafeEqual(submittedPasswordHash, ownerPasswordHash)) {
      return res.status(401).json({ error: "Username atau password salah." });
    }

    const token = signToken({ username: ownerUsername, role: "owner", authProvider: "local" });
    setSessionCookie(res, token);
    res.json({ success: true, role: "owner", user: ownerUser(ownerUsername) });

  } catch (err) {
    console.error("[POST /api/auth/login]", err.message);
    res.status(500).json({ error: "Login gagal." });
  }
});

/* ============ POST /api/auth/logout ============ */
app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

/* ============ GET /api/auth/me ============ */
// Cek siapa yang login (via cookie, atau via IP buat user biasa)
app.get("/api/auth/me", async (req, res) => {
  try {
    const token = req.cookies?.session;

    // 1. Cek cookie dulu
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        if (payload.authProvider === "local" && payload.role === "owner") {
          return res.json({ user: ownerUser(payload.username), isAdmin: true });
        }

        const { data: user } = payload.id
          ? await supabase.from("users").select("*").eq("id", payload.id).maybeSingle()
          : { data: null };

        if (user) {
          return res.json({
            user: publicUser(user),
            isAdmin: user.role === "admin",
          });
        }
      }
    }

    // 2. Fallback: cek IP (user biasa)
    const ipHash = hashIP(getIP(req));
    const { data: ipUser } = await supabase
      .from("users")
      .select("*")
      .eq("ip_hash", ipHash)
      .maybeSingle();

    if (ipUser) {
      return res.json({
        user: publicUser(ipUser),
        isAdmin: ipUser.role === "admin",
      });
    }

    res.json({ user: null, isAdmin: false });

  } catch (err) {
    console.error("[GET /api/auth/me]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============================================
   USER ROUTES
   ============================================ */

/* ============ GET /api/users ============ */
app.get("/api/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json({ users: (data || []).map(publicUser) });

  } catch (err) {
    console.error("[GET /api/users]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ GET /api/users/:id ============ */
app.get("/api/users/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "User gak ditemukan." });

    res.json({ user: publicUser(data) });

  } catch (err) {
    console.error("[GET /api/users/:id]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ PUT /api/users/me ============ */
app.put("/api/users/me", requireAuth, async (req, res) => {
  try {
    const {
      gamerTag, displayName, bio, games,
      youtubeUrl, tiktokUrl, instagramUrl, subscriber,
    } = req.body;

    if (!gamerTag || gamerTag.trim().length < 2) {
      return res.status(400).json({ error: "Gamer tag minimal 2 karakter." });
    }

    const { error } = await supabase
      .from("users")
      .update({
        gamer_tag: gamerTag.trim().slice(0, 20),
        display_name: (displayName || "").trim().slice(0, 30),
        bio: (bio || "").trim().slice(0, 150),
        games: Array.isArray(games) ? games : [],
        youtube_url: youtubeUrl || null,
        tiktok_url: tiktokUrl || null,
        instagram_url: instagramUrl || null,
        subscriber: subscriber || null,
      })
      .eq("id", req.user.id);

    if (error) throw error;
    res.json({ success: true });

  } catch (err) {
    console.error("[PUT /api/users/me]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============================================
   VIDEO ROUTES
   ============================================ */

/* ============ GET /api/videos ============ */
app.get("/api/videos", async (req, res) => {
  try {
    let q = supabase
      .from("videos")
      .select("*, users(gamer_tag, username, avatar)")
      .order("published_at", { ascending: false });

    if (req.query.game) q = q.eq("game", req.query.game);

    const { data, error } = await q;
    if (error) throw error;

    res.json({ videos: data || [] });

  } catch (err) {
    console.error("[GET /api/videos]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ GET /api/videos/mine ============ */
app.get("/api/videos/mine", requireOwner, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", req.user.id)
      .order("published_at", { ascending: false });

    if (error) throw error;
    res.json({ videos: data || [] });

  } catch (err) {
    console.error("[GET /api/videos/mine]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ GET /api/videos/user/:id ============ */
app.get("/api/videos/user/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", req.params.id)
      .order("published_at", { ascending: false });

    if (error) throw error;
    res.json({ videos: data || [] });

  } catch (err) {
    console.error("[GET /api/videos/user/:id]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ POST /api/videos ============ */
app.post("/api/videos", requireOwner, async (req, res) => {
  try {
    const { title, youtubeId, game, views, publishedAt } = req.body;

    if (!title || !youtubeId || !game) {
      return res.status(400).json({ error: "Judul, YouTube ID, & game wajib." });
    }

    const { data, error } = await supabase
      .from("videos")
      .insert({
        user_id: req.user.id,
        title: title.trim().slice(0, 100),
        youtube_id: youtubeId,
        game,
        views: views || null,
        published_at: publishedAt || new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, video: data });

  } catch (err) {
    console.error("[POST /api/videos]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ PUT /api/videos/:id ============ */
app.put("/api/videos/:id", requireOwner, async (req, res) => {
  try {
    const { title, youtubeId, game, views, publishedAt } = req.body;

    // Pastiin video ini punya admin yang login
    const { data: existing } = await supabase
      .from("videos")
      .select("user_id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!existing || existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Bukan video kamu." });
    }

    const { error } = await supabase
      .from("videos")
      .update({
        title: title?.trim().slice(0, 100),
        youtube_id: youtubeId,
        game,
        views: views || null,
        published_at: publishedAt,
      })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });

  } catch (err) {
    console.error("[PUT /api/videos/:id]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ DELETE /api/videos/:id ============ */
app.delete("/api/videos/:id", requireOwner, async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from("videos")
      .select("user_id")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!existing || existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Bukan video kamu." });
    }

    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true });

  } catch (err) {
    console.error("[DELETE /api/videos/:id]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============================================
   COMMUNITY ROUTES
   ============================================ */

app.get("/api/community/posts", async (req, res) => {
  try {
    const { data: posts, error: postsError } = await supabase
      .from("community_posts")
      .select("id, title, body, user_id, author_name, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsError) throw postsError;

    const postIds = (posts || []).map((post) => post.id);
    const userIds = [...new Set((posts || []).map((post) => post.user_id).filter(Boolean))];
    let users = [];
    let comments = [];

    if (userIds.length) {
      const { data, error } = await supabase
        .from("users")
        .select("id, gamer_tag, username")
        .in("id", userIds);
      if (error) throw error;
      users = data || [];
    }

    if (postIds.length) {
      const { data, error } = await supabase
        .from("community_post_comments")
        .select("id, post_id, name, message, created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      comments = data || [];
    }

    const usersById = new Map(users.map((user) => [user.id, user]));
    const commentsByPost = new Map();
    comments.forEach((comment) => {
      if (!commentsByPost.has(comment.post_id)) commentsByPost.set(comment.post_id, []);
      commentsByPost.get(comment.post_id).push({
        id: comment.id,
        author: comment.name,
        message: comment.message,
        createdAt: comment.created_at,
      });
    });

    res.json({
      posts: (posts || []).map((post) => {
        const author = usersById.get(post.user_id);
        return {
          id: post.id,
          title: post.title,
          body: post.body,
          author: post.author_name || author?.gamer_tag || author?.username || "Admin",
          createdAt: post.created_at,
          comments: commentsByPost.get(post.id) || [],
        };
      }),
    });
  } catch (err) {
    console.error("[GET /api/community/posts]", err.message);
    res.status(500).json({ error: "Gagal memuat Community." });
  }
});

app.post("/api/community/posts", requireOwner, async (req, res) => {
  try {
    let { title, body } = req.body;
    if (typeof title !== "string" || typeof body !== "string") {
      return res.status(400).json({ error: "Judul dan isi wajib diisi." });
    }

    title = title.trim();
    body = body.trim();
    if (title.length < 3 || title.length > 80) {
      return res.status(400).json({ error: "Judul harus 3–80 karakter." });
    }
    if (body.length < 2 || body.length > 1000) {
      return res.status(400).json({ error: "Isi harus 2–1000 karakter." });
    }

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: req.user.id || null,
        author_name: req.user.gamerTag || req.user.username || "Admin",
        title,
        body,
      })
      .select("id, title, body, author_name, created_at")
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, post: data });
  } catch (err) {
    console.error("[POST /api/community/posts]", err.message);
    res.status(500).json({ error: "Gagal menyimpan postingan." });
  }
});

app.delete("/api/community/posts/:id", requireOwner, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Postingan tidak ditemukan." });
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/community/posts/:id]", err.message);
    res.status(500).json({ error: "Gagal menghapus postingan." });
  }
});

app.post("/api/community/posts/:id/comments", async (req, res) => {
  try {
    const { name, message } = req.body;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(400).json({ error: "Postingan tidak valid." });
    }
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 30) {
      return res.status(400).json({ error: "Nama harus 2–30 karakter." });
    }
    if (typeof message !== "string" || message.trim().length < 2 || message.trim().length > 220) {
      return res.status(400).json({ error: "Komentar harus 2–220 karakter." });
    }

    const { data, error } = await supabase
      .from("community_post_comments")
      .insert({
        post_id: req.params.id,
        name: name.trim(),
        message: message.trim(),
        ip_hash: hashIP(getIP(req)),
      })
      .select("id, post_id, name, message, created_at")
      .single();

    if (error) {
      if (error.code === "23503") return res.status(404).json({ error: "Postingan tidak ditemukan." });
      throw error;
    }
    res.status(201).json({ success: true, comment: data });
  } catch (err) {
    console.error("[POST /api/community/posts/:id/comments]", err.message);
    res.status(500).json({ error: "Gagal menyimpan komentar." });
  }
});

/* ============================================
   COMMENT ROUTES
   ============================================ */

/* ============ GET /api/comments ============ */
app.get("/api/comments", async (req, res) => {
  try {
    const ipHash = hashIP(getIP(req));

    // Ambil komentar
    const { data: comments, error: errC } = await supabase
      .from("comments")
      .select("id, name, message, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (errC) throw errC;

    // Ambil reactions (group by comment_id)
    const commentIds = (comments || []).map((c) => c.id);
    let reactionsMap = {};
    let myReactions = {};

    if (commentIds.length > 0) {
      const { data: reactions } = await supabase
        .from("reactions")
        .select("comment_id, emoji, ip_hash")
        .in("comment_id", commentIds);

      (reactions || []).forEach((r) => {
        if (!reactionsMap[r.comment_id]) reactionsMap[r.comment_id] = {};
        reactionsMap[r.comment_id][r.emoji] = (reactionsMap[r.comment_id][r.emoji] || 0) + 1;

        if (r.ip_hash === ipHash) {
          if (!myReactions[r.comment_id]) myReactions[r.comment_id] = [];
          myReactions[r.comment_id].push(r.emoji);
        }
      });
    }

    // Cek nama IP ini
    const { data: existing } = await supabase
      .from("ip_names")
      .select("name")
      .eq("ip_hash", ipHash)
      .maybeSingle();

    const enriched = (comments || []).map((c) => ({
      ...c,
      reactions: reactionsMap[c.id] || {},
      myReactions: myReactions[c.id] || [],
    }));

    res.json({
      comments: enriched,
      myName: existing?.name || null,
    });

  } catch (err) {
    console.error("[GET /api/comments]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ POST /api/comments ============ */
app.post("/api/comments", async (req, res) => {
  try {
    const ipHash = hashIP(getIP(req));
    let { name, message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Pesan wajib diisi." });
    }

    message = message.trim();
    if (message.length < 2) {
      return res.status(400).json({ error: "Pesan minimal 2 karakter." });
    }
    if (message.length > 300) {
      return res.status(400).json({ error: "Pesan maksimal 300 karakter." });
    }

    // Cek nama IP ini
    const { data: existing } = await supabase
      .from("ip_names")
      .select("name")
      .eq("ip_hash", ipHash)
      .maybeSingle();

    if (existing) {
      name = existing.name;
    } else {
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ error: "Nama minimal 2 karakter." });
      }
      name = name.trim().slice(0, 20);

      const { error: errName } = await supabase
        .from("ip_names")
        .insert({ ip_hash: ipHash, name });

      if (errName) throw errName;
    }

    const { error: errInsert } = await supabase
      .from("comments")
      .insert({ name, message, ip_hash: ipHash });

    if (errInsert) throw errInsert;
    res.json({ success: true, name });

  } catch (err) {
    console.error("[POST /api/comments]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============ POST /api/comments/:id/react ============ */
app.post("/api/comments/:id/react", async (req, res) => {
  try {
    const ipHash = hashIP(getIP(req));
    const { emoji } = req.body;
    const commentId = req.params.id;

    const validEmojis = ["🔥", "👍", "😂", "❤️"];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ error: "Emoji gak valid." });
    }

    // Cek udah react belum
    const { data: existing } = await supabase
      .from("reactions")
      .select("id")
      .eq("comment_id", commentId)
      .eq("emoji", emoji)
      .eq("ip_hash", ipHash)
      .maybeSingle();

    if (existing) {
      // Udah react → hapus (toggle off)
      await supabase.from("reactions").delete().eq("id", existing.id);
      return res.json({ success: true, action: "removed" });
    }

    // Belum → insert
    const { error } = await supabase
      .from("reactions")
      .insert({ comment_id: commentId, emoji, ip_hash: ipHash });

    if (error) throw error;
    res.json({ success: true, action: "added" });

  } catch (err) {
    console.error("[POST /api/comments/:id/react]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============================================
   ADMIN DASHBOARD
   ============================================ */

app.get("/api/admin/dashboard", requireOwner, async (req, res) => {
  try {
    const userId = req.user.id || null;

    // Stats
    const [videosRes, commentsRes, usersRes, userRes] = await Promise.all([
      userId
        ? supabase.from("videos").select("id", { count: "exact", head: true }).eq("user_id", userId)
        : Promise.resolve({ count: 0 }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }),
      userId
        ? supabase.from("users").select("created_at").eq("id", userId).single()
        : Promise.resolve({ data: null }),
    ]);

    const daysActive = userRes.data
      ? Math.floor((Date.now() - new Date(userRes.data.created_at)) / 86400000) + 1
      : 0;

    // Recent videos
    const { data: recentVideos } = userId
      ? await supabase
          .from("videos")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5)
      : { data: [] };

    // Recent comments
    const { data: recentComments } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    // Data admin
    const { data: me } = userId
      ? await supabase.from("users").select("*").eq("id", userId).single()
      : { data: null };

    res.json({
      user: me ? publicUser(me) : ownerUser(req.user.username),
      stats: {
        videos: videosRes.count || 0,
        comments: commentsRes.count || 0,
        users: usersRes.count || 0,
        daysActive,
      },
      recentVideos: recentVideos || [],
      recentComments: recentComments || [],
    });

  } catch (err) {
    console.error("[GET /api/admin/dashboard]", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

/* ============================================
   HELPER: PUBLIC USER
   ============================================ */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    gamerTag: u.gamer_tag,
    displayName: u.display_name,
    bio: u.bio,
    avatar: u.avatar,
    role: u.role,
    games: u.games || [],
    youtube_url: u.youtube_url,
    tiktok_url: u.tiktok_url,
    instagram_url: u.instagram_url,
    subscriber: u.subscriber,
    createdAt: u.created_at,
  };
}

function ownerUser(username) {
  return {
    id: null,
    username,
    gamerTag: username,
    displayName: username,
    role: "owner",
    games: [],
  };
}

/* ============================================
   404 FALLBACK
   ============================================ */
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Endpoint gak ada." });
  }
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

/* ============================================
   START SERVER
   ============================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Destroyer Community running di http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || "development"}`);
});