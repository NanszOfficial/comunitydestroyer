/* ============================================
   DESTROYER COMMUNITY — CONFIG.JS
   Isi semua data komunitas di sini.
   ============================================ */

const config = {

  /* ============ INFO KOMUNITAS ============ */
  communityName: "Destroyer Community",
  tagline: "Two Gamers. One Squad.",
  shortDesc: "Komunitas gamer yang main berbagai game dan berbagi momen seru bersama.",
  estYear: 2026,

  /* ============ STATS (buat counter di homepage) ============ */
  stats: [
    { label: "Jam Mabar", value: 200, suffix: "+" },
    { label: "Squad Terbentuk", value: 12, suffix: "" },
  ],

  /* ============ JADWAL MABAR ============ */
  schedule: [
    { day: "Senin",  time: "20:00", game: "Any Game", note: "Main santai" },
    { day: "Rabu",   time: "20:00", game: "Any Game", note: "Mabar bareng" },
    { day: "Jumat",  time: "21:00", game: "Any Game", note: "Event komunitas" },
    { day: "Sabtu",  time: "19:00", game: "Any Game", note: "Nongkrong santai" },
    { day: "Minggu", time: "20:00", game: "Any Game", note: "Mabar bebas" },
  ],

  /* ============ LINKS SOSMED ============ */
  // Dipakai di join.html & footer (otomatis ngambil dari sini)
  links: {
    discord:   "https://discord.gg/ISI",
    tiktok:    "https://tiktok.com/@ISI",
    instagram: "https://instagram.com/ISI",
    whatsapp:  "https://chat.whatsapp.com/ISI",
  },

  /* ============ GALLERY ============ */
  // Pakai LINK EKSTERNAL (Imgur, Cloudinary, Discord CDN, dll)
  gallery: [
    {
      src: "https://i.imgur.com/ISI1.jpg",
      caption: "Momen seru bareng komunitas",
      game: "Any Game",
    },
    {
      src: "https://i.imgur.com/ISI2.jpg",
      caption: "Kumpulan momen komunitas",
      game: "Any Game",
    },
    {
      src: "https://i.imgur.com/ISI3.jpg",
      caption: "Highlight sesi main bersama",
      game: "Any Game",
    },
    // tambahin...
  ],

};