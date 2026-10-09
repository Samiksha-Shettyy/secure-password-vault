const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const db = require('../db');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

router.post('/register', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { email, password } = parsed.data;

  const hash = bcrypt.hashSync(password, 12);
  const salt = crypto.randomBytes(16).toString('hex');
  try {
    db.prepare('INSERT INTO users (email, password_hash, kdf_salt) VALUES (?, ?, ?)')
      .run(email, hash, salt);
    res.json({ message: 'Registered' });
  } catch {
    res.status(400).json({ error: 'Could not register' });
  }
});

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'Invalid input' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const log = (uid, action) =>
    db.prepare('INSERT INTO audit_logs (user_id, action, ip) VALUES (?, ?, ?)')
      .run(uid, action, req.ip);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.locked_until > Date.now())
    return res.status(423).json({ error: 'Account temporarily locked' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    const fails = user.failed_attempts + 1;
    const lock = fails >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
      .run(fails >= 5 ? 0 : fails, lock, user.id);
    log(user.id, 'LOGIN_FAILED');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  db.prepare('UPDATE users SET failed_attempts = 0 WHERE id = ?').run(user.id);
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30m' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: false });
  log(user.id, 'LOGIN_SUCCESS');
  res.json({ message: 'Logged in', kdf_salt: user.kdf_salt });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

module.exports = router;