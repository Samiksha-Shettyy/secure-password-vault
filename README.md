# Secure Password Vault

A full stack password manager with client-side encryption, 2FA, security testing, and a key derivation benchmark.

## Features
- Registration and login with bcrypt hashing
- Rate limiting and account lockout
- Audit logs
- (Coming soon) Client-side AES-256-GCM encryption, TOTP 2FA, breach check, password generator

## Tech Stack
React (Vite), Node.js, Express, SQLite

## Setup
1. Clone the repo
2. Backend: `cd backend`, run `npm install`, copy `.env.example` to `.env`, set `JWT_SECRET`, run `npm run dev`
3. Frontend: `cd frontend`, run `npm install`, run `npm run dev`

## Limitations
Educational project. Runs over HTTP in development and is not audited for production.

## Author
Samiksha S Shetty