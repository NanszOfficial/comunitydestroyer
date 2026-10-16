-- ============================================
-- DESTROYER COMMUNITY — DATABASE SCHEMA
-- Copy-paste ke Supabase SQL Editor
-- ============================================

-- ============ EXTENSIONS ============
create extension if not exists "pgcrypto";

-- ============================================
-- TABEL: users
-- ============================================
create table if not exists users (
  id uuid default gen_random_uuid() primary key,

  -- Auth (buat admin)
  username text unique not null,
  password_hash text,                  -- NULL buat user biasa, ada buat admin

  -- Profil
  display_name text,
  gamer_tag text,
  bio text,
  avatar text,

  -- Role
  role text default 'user' check (role in ('user', 'admin')),

  -- Sosmed
  youtube_url text,
  tiktok_url text,
  instagram_url text,

  -- Game
  games text[] default '{}',

  -- Stats (display)
  subscriber text,
  video_count int default 0,

  -- IP (buat user biasa: 1 IP = 1 akun)
  ip_hash text unique,

  -- Timestamp
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists users_role_idx on users(role);
create index if not exists users_ip_hash_idx on users(ip_hash);

-- ============================================
-- TABEL: videos
-- ============================================
create table if not exists videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,

  title text not null,
  youtube_id text not null,
  game text,
  views text,
  published_at date,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists videos_user_idx on videos(user_id);
create index if not exists videos_game_idx on videos(game);
create index if not exists videos_created_idx on videos(created_at desc);

-- ============================================
-- TABEL: gallery
-- ============================================
create table if not exists gallery (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,

  image_url text not null,
  caption text,
  game text,

  created_at timestamp with time zone default now()
);

create index if not exists gallery_user_idx on gallery(user_id);
create index if not exists gallery_game_idx on gallery(game);

-- ============================================
-- TABEL: comments (feedback)
-- ============================================
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,

  name text not null,
  message text not null,
  ip_hash text not null,

  created_at timestamp with time zone default now()
);

create index if not exists comments_created_idx on comments(created_at desc);
create index if not exists comments_ip_idx on comments(ip_hash);

-- ============================================
-- TABEL: community posts + comments
-- ============================================
create table if not exists community_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  author_name text,
  title text not null,
  body text not null,
  created_at timestamp with time zone default now()
);

alter table community_posts alter column user_id drop not null;
alter table community_posts add column if not exists author_name text;

create index if not exists community_posts_created_idx on community_posts(created_at desc);

create table if not exists community_post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references community_posts(id) on delete cascade not null,
  name text not null,
  message text not null,
  ip_hash text not null,
  created_at timestamp with time zone default now()
);

create index if not exists community_post_comments_post_idx on community_post_comments(post_id, created_at);

-- ============================================
-- TABEL: ip_names (lock nama per IP)
-- ============================================
create table if not exists ip_names (
  ip_hash text primary key,
  name text not null,

  created_at timestamp with time zone default now()
);

-- ============================================
-- TABEL: reactions (emoji di komentar)
-- ============================================
create table if not exists reactions (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid references comments(id) on delete cascade,

  emoji text not null,
  ip_hash text not null,

  created_at timestamp with time zone default now(),

  -- 1 IP cuma bisa react 1x per emoji per komentar
  unique(comment_id, emoji, ip_hash)
);

create index if not exists reactions_comment_idx on reactions(comment_id);

-- ============================================
-- TABEL: sessions (buat login admin)
-- ============================================
create table if not exists sessions (
  token text primary key,
  user_id uuid references users(id) on delete cascade,

  ip_hash text,
  user_agent text,
  expires_at timestamp with time zone not null,

  created_at timestamp with time zone default now()
);

create index if not exists sessions_user_idx on sessions(user_id);
create index if not exists sessions_expires_idx on sessions(expires_at);

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_updated_at on users;
create trigger users_updated_at
  before update on users
  for each row execute function update_updated_at();

drop trigger if exists videos_updated_at on videos;
create trigger videos_updated_at
  before update on videos
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Aktifin RLS biar anon key gak bisa akses langsung.
-- Server pakai service_role key → bypass RLS.
-- ============================================

alter table users enable row level security;
alter table videos enable row level security;
alter table gallery enable row level security;
alter table comments enable row level security;
alter table ip_names enable row level security;
alter table reactions enable row level security;
alter table sessions enable row level security;
alter table community_posts enable row level security;
alter table community_post_comments enable row level security;

-- ============ POLICY: comments (publik bisa baca) ============
drop policy if exists "comments_public_read" on comments;
create policy "comments_public_read"
  on comments for select
  using (true);

drop policy if exists "community_posts_public_read" on community_posts;
create policy "community_posts_public_read"
  on community_posts for select
  using (true);

drop policy if exists "community_post_comments_public_read" on community_post_comments;
create policy "community_post_comments_public_read"
  on community_post_comments for select
  using (true);

-- ============ POLICY: videos (publik bisa baca) ============
drop policy if exists "videos_public_read" on videos;
create policy "videos_public_read"
  on videos for select
  using (true);

-- ============ POLICY: gallery (publik bisa baca) ============
drop policy if exists "gallery_public_read" on gallery;
create policy "gallery_public_read"
  on gallery for select
  using (true);

-- ============ POLICY: reactions (publik bisa baca) ============
drop policy if exists "reactions_public_read" on reactions;
create policy "reactions_public_read"
  on reactions for select
  using (true);

-- ============ POLICY: users (cuma bisa baca profil publik) ============
drop policy if exists "users_public_read" on users;
create policy "users_public_read"
  on users for select
  using (true);

-- ============================================
-- VIEW: video + user info
-- ============================================
create or replace view videos_with_user as
select
  v.id,
  v.title,
  v.youtube_id,
  v.game,
  v.views,
  v.published_at,
  v.created_at,
  u.id as user_id,
  u.gamer_tag,
  u.username,
  u.avatar,
  u.role
from videos v
left join users u on v.user_id = u.id;

-- ============================================
-- VIEW: komentar + reaction count
-- ============================================
create or replace view comments_with_reactions as
select
  c.id,
  c.name,
  c.message,
  c.ip_hash,
  c.created_at,
  coalesce(
    jsonb_object_agg(r.emoji, r.count)
    filter (where r.emoji is not null),
    '{}'::jsonb
  ) as reactions
from comments c
left join (
  select comment_id, emoji, count(*) as count
  from reactions
  group by comment_id, emoji
) r on r.comment_id = c.id
group by c.id
order by c.created_at desc;

-- Owner credentials are configured with ADMIN_USERNAME and ADMIN_PASSWORD in .env.

-- ============================================
-- CLEANUP: hapus session expired
-- ============================================
-- Jalanin manual atau pakai cron:
-- delete from sessions where expires_at < now();

-- ============================================
-- DONE!
-- ============================================