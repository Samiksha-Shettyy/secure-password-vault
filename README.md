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