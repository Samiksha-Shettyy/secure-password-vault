const db = require('./db');

const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);

if (!cols.includes('totp_secret')) {
  db.exec('ALTER TABLE users ADD COLUMN totp_secret TEXT');
}
if (!cols.includes('totp_enabled')) {
  db.exec('ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0');
}