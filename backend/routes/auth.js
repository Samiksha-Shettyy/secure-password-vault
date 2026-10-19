const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const db = require('../db');
const auth = require('../middleware/auth');
require('../migrate_totp');

authenticator.options = { window: 1 }; // accept the previous/next 30s code (clock drift)

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

const log = (uid, action, ip) =>
  db.prepare('INSERT INTO audit_logs (user_id, action, ip) VALUES (?, ?, ?)')
    .run(uid, action, ip);

function verifyTotp(code, secret) {
  try {
    return authenticator.check(String(code).trim(), secret);
  } catch {
    return false;
  }
}

router.post('/register', registerLimiter, (req, res) => {
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
  const { email, password, totp } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'Invalid input' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.locked_until > Date.now())
    return res.status(423).json({ error: 'Account temporarily locked' });

  // Every failure (wrong password OR wrong 2FA code) counts toward lockout
  const fail = (action, message) => {
    const fails = user.failed_attempts + 1;
    const lock = fails >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
      .run(fails >= 5 ? 0 : fails, lock, user.id);
    log(user.id, action, req.ip);
    return res.status(401).json({ error: message });
  };

  if (!bcrypt.compareSync(password, user.password_hash))
    return fail('LOGIN_FAILED', 'Invalid credentials');

  if (user.totp_enabled) {
    // Password was correct but no code yet: ask the client for it. No cookie is issued.
    if (!totp) return res.json({ totp_required: true });
    if (!verifyTotp(totp, user.totp_secret))
      return fail('LOGIN_2FA_FAILED', 'Invalid 2FA code');
  }

  db.prepare('UPDATE users SET failed_attempts = 0 WHERE id = ?').run(user.id);
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30m' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: false });
  log(user.id, 'LOGIN_SUCCESS', req.ip);
  res.json({ message: 'Logged in', kdf_salt: user.kdf_salt });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// ---- 2FA ----

router.get('/me', auth, (req, res) => {
  const u = db.prepare('SELECT email, totp_enabled FROM users WHERE id = ?').get(req.user.id);
  res.json({ email: u.email, totp_enabled: !!u.totp_enabled });
});

router.post('/totp/setup', auth, async (req, res) => {
  const u = db.prepare('SELECT email, totp_enabled FROM users WHERE id = ?').get(req.user.id);
  if (u.totp_enabled) return res.status(400).json({ error: '2FA already enabled' });

  const secret = authenticator.generateSecret();
  db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret, req.user.id);

  const otpauth = authenticator.keyuri(u.email, 'Secure Password Vault', secret);
  const qr = await QRCode.toDataURL(otpauth);
  log(req.user.id, 'TOTP_SETUP_STARTED', req.ip);
  res.json({ qr, secret });
});

router.post('/totp/enable', auth, (req, res) => {
  const { code } = req.body;
  const u = db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?').get(req.user.id);
  if (!u.totp_secret || u.totp_enabled)
    return res.status(400).json({ error: 'Start 2FA setup first' });
  if (!code || !verifyTotp(code, u.totp_secret))
    return res.status(400).json({ error: 'Invalid code' });

  db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(req.user.id);
  log(req.user.id, 'TOTP_ENABLED', req.ip);
  res.json({ message: '2FA enabled' });
});

module.exports = router;