const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.use(auth);

const log = (req, action) =>
  db.prepare('INSERT INTO audit_logs (user_id, action, ip) VALUES (?, ?, ?)')
    .run(req.user.id, action, req.ip);

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT id, site, encrypted_data, iv FROM vault_entries WHERE user_id = ?'
  ).all(req.user.id);
  log(req, 'VAULT_VIEW');
  res.json(rows);
});

router.post('/', (req, res) => {
  const { site, encrypted_data, iv } = req.body;
  if (!site || !encrypted_data || !iv)
    return res.status(400).json({ error: 'Missing fields' });
  db.prepare(
    'INSERT INTO vault_entries (user_id, site, encrypted_data, iv) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, site, encrypted_data, iv);
  log(req, 'VAULT_ADD');
  res.json({ message: 'Saved' });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vault_entries WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  log(req, 'VAULT_DELETE');
  res.json({ message: 'Deleted' });
});

module.exports = router;