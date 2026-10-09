const Database = require('better-sqlite3');
const db = new Database('vault.db');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  kdf_salt TEXT NOT NULL,
  totp_secret TEXT,
  totp_enabled INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0,
  locked_until INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vault_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  site TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  ip TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;