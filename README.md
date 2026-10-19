# Secure Password Vault

A full stack password manager with client-side encryption, 2FA, security testing, and a key derivation benchmark.

## Features
- Registration and login with bcrypt hashing
- Rate limiting and account lockout
- Audit logs
- Client-side AES-256-GCM encryption (key derived in the browser with PBKDF2-SHA256, 600,000 iterations; the server only stores ciphertext)
- Secure password generator (crypto.getRandomValues, no modulo bias)
- Password strength meter
- Breach check using Have I Been Pwned (k-anonymity: only the first 5 characters of the SHA-1 hash are sent)
- TOTP two-factor authentication (RFC 6238, compatible with Google/Microsoft Authenticator); failed 2FA codes count toward the account lockout
- Key derivation benchmark (PBKDF2 vs scrypt vs Argon2id) in /benchmark; run with `cd benchmark`, `npm install`, `node bench.js`
- Security testing (/security-testing): a repeatable audit script (headers, CORS, auth, error handling, body limit, cookie flags, lockout, rate limits) with before/after results. Fixes: error handler that hides stack traces, rate limit on /register

## Tech Stack
React (Vite), Node.js, Express, SQLite

## Setup
1. Clone the repo
2. Backend: `cd backend`, run `npm install`, copy `.env.example` to `.env`, set `JWT_SECRET`, run `npm run dev`
3. Frontend: `cd frontend`, run `npm install`, run `npm run dev`

## Limitations
Educational project. Runs over HTTP in development and is not audited for production.

The master password is sent to the server for login (bcrypt check), and the server stores the KDF salt, so this is not true zero-knowledge. A planned hardening step is to derive separate auth and encryption keys in the browser.

npm audit reports 3 high-severity findings, all in the dev-only dependency chain nodemon > chokidar > braces (ReDoS-style DoS). They do not affect runtime code and are not exploitable in production. Fix is to upgrade nodemon when a patched release is available.

The TOTP secret is stored in plain text in the database, and there are no recovery codes yet. A hardening step is to encrypt the secret with a server-side key and add one-time backup codes.
npm audit reports 3 high-severity findings, all in the dev-only chain nodemon > chokidar > braces. They do not affect runtime code.

Security testing used a custom audit script rather than OWASP ZAP (the ZAP installer was blocked by Microsoft Defender as a potentially unwanted application, so it was not run). A ZAP scan in an isolated environment is future work. The session cookie has no Secure flag because development runs over HTTP.

## Author
Samiksha S Shetty