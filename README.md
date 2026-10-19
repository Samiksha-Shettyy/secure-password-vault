# CipherVault

Secure Password Vault: a full-stack password manager with client-side encryption, TOTP 2FA, security testing, and a key derivation benchmark.

## Features
- Registration and login with bcrypt hashing
- Rate limiting (login and register) and account lockout after 5 failures
- Audit logs
- Client-side AES-256-GCM encryption (key derived in the browser with PBKDF2-SHA256, 600,000 iterations; the server only stores ciphertext)
- Secure password generator (crypto.getRandomValues, no modulo bias)
- Password strength meter
- Breach check using Have I Been Pwned (k-anonymity: only the first 5 characters of the SHA-1 hash are sent)
- TOTP two-factor authentication (RFC 6238, works with Google/Microsoft Authenticator); failed 2FA codes count toward the account lockout
- Key derivation benchmark (PBKDF2 vs scrypt vs Argon2id)
- Security testing: a repeatable audit script with before/after results

## Tech Stack
React (Vite), Node.js, Express, SQLite

## Project Structure
- `backend/` Express API, SQLite database, auth and vault routes
- `frontend/` React app (Register, Login, Dashboard, 2FA setup)
- `benchmark/` PBKDF2 vs scrypt vs Argon2id timing script
- `security-testing/` audit script, before/after results and comparison

## Setup
1. Clone the repo
2. Backend: `cd backend`, run `npm install`, copy `.env.example` to `.env`, set `JWT_SECRET`, run `npm run dev`
3. Frontend: `cd frontend`, run `npm install`, run `npm run dev`
4. Open `http://localhost:5173` (use localhost, because the Web Crypto API needs a secure context)

## Running the benchmark
```
cd benchmark
npm install
node bench.js
```
Prints a timing table and saves `results.json`.

## Running the security audit
Start the backend first, then:
```
cd security-testing
node audit.js before
node compare.js
```
Run `node audit.js after` after making changes, then `node compare.js` to see the difference. The audit triggers the rate limiters, so restart the backend afterwards.

## Security testing results
The audit script ran before and after two fixes: an error handler that hides stack traces, and a rate limit on `/register`. Result: 2 checks fixed, 15 pass, 1 informational (see `security-testing/comparison.md`).

## Limitations
- Educational project. Runs over HTTP in development and is not audited for production.
- The master password is sent to the server for the bcrypt login check, and the server stores the KDF salt, so this is not true zero-knowledge. A planned hardening step is to derive separate auth and encryption keys in the browser.
- The vault uses PBKDF2 because the browser's built-in Web Crypto API has no scrypt or Argon2. Argon2 in the browser would need a WASM library.
- The TOTP secret is stored in plain text in the database, and there are no recovery codes yet. Hardening: encrypt the secret with a server-side key and add one-time backup codes.
- The session cookie has no Secure flag because development runs over HTTP.
- `npm audit` reports 3 high-severity findings, all in the dev-only chain nodemon > chokidar > braces. They do not affect runtime code.
- Security testing used a custom audit script rather than OWASP ZAP (the ZAP installer was blocked by Microsoft Defender as a potentially unwanted application, so it was not run). A ZAP scan in an isolated environment is future work.

## Author
Samiksha S Shetty