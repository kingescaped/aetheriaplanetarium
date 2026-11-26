CREATE TABLE IF NOT EXISTS avatars (
  uid TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data_base64 TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS geocode_cache (
  coord_key TEXT PRIMARY KEY,
  lang TEXT NOT NULL,
  display_name TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_sessions (
  token_hash TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  firebase_refresh_token TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_uid ON refresh_sessions(uid);
