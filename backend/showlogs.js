const db = require('./db');

const rows = db
  .prepare("SELECT rowid, action, ip FROM audit_logs WHERE action LIKE 'TOTP%' OR action LIKE 'LOGIN%' ORDER BY rowid DESC LIMIT 15")
  .all();

console.table(rows);