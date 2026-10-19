const fs = require('fs');
const path = require('path');

const label = process.argv[2] || 'before';
const API = 'http://localhost:5000/api';
const results = [];
const add = (check, status, detail) => results.push({ Check: check, Status: status, Detail: detail });

function post(p, body, headers = {}) {
  return fetch(API + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

(async () => {
  try {
    await fetch(API + '/auth/me');
  } catch {
    console.error('Backend not reachable on port 5000. Start it with npm run dev in the backend folder.');
    process.exit(1);
  }

  // 1. Security headers
  const h = (await fetch(API + '/auth/me')).headers;
  for (const n of ['x-content-type-options', 'x-frame-options', 'content-security-policy', 'referrer-policy']) {
    add(`Header ${n}`, h.get(n) ? 'PASS' : 'FAIL', h.get(n) || 'missing');
  }
  add('Header x-powered-by hidden', h.get('x-powered-by') ? 'FAIL' : 'PASS', h.get('x-powered-by') || 'absent');

  // 2. CORS
  const evil = await fetch(API + '/auth/me', { headers: { Origin: 'http://evil.example' } });
  const acao = evil.headers.get('access-control-allow-origin');
  add('CORS rejects unknown origin', acao === 'http://evil.example' || acao === '*' ? 'FAIL' : 'PASS', `allow-origin: ${acao || 'none'}`);
  const good = await fetch(API + '/auth/me', { headers: { Origin: 'http://localhost:5173' } });
  const gacao = good.headers.get('access-control-allow-origin');
  add('CORS allows the frontend', gacao === 'http://localhost:5173' ? 'PASS' : 'FAIL', `allow-origin: ${gacao || 'none'}`);

  // 3. Unauthenticated access
  const un = await fetch(API + '/vault');
  add('Vault blocked without login', un.status === 401 ? 'PASS' : 'FAIL', `status ${un.status}`);

  // 4. Error handling: malformed JSON should not leak a stack trace
  const bad = await post('/auth/login', '{bad');
  const badText = await bad.text();
  const leaks = /node_modules|\.js:\d+:\d+/.test(badText);
  add('No stack trace in error responses', leaks ? 'FAIL' : 'PASS', `status ${bad.status}${leaks ? ', stack trace leaked' : ''}`);

  // 5. Oversized request body
  const big = await post('/auth/login', { email: 'a@b.com', password: 'x'.repeat(2 * 1024 * 1024) });
  add('Large body rejected (2 MB)', big.status === 413 ? 'PASS' : 'FAIL', `status ${big.status}`);

  // 6. Cookie flags (uses a throwaway account)
  const email = `audit_${Date.now()}@example.com`;
  const goodPw = 'AuditPass!12345';
  await post('/auth/register', { email, password: goodPw });
  let loginCount = 0;
  const ok = await post('/auth/login', { email, password: goodPw });
  loginCount++;
  const cookie = (ok.headers.getSetCookie?.() || []).join('; ');
  add('Cookie HttpOnly', /httponly/i.test(cookie) ? 'PASS' : 'FAIL', cookie ? 'set' : 'no cookie');
  add('Cookie SameSite=Strict', /samesite=strict/i.test(cookie) ? 'PASS' : 'FAIL', cookie ? 'checked' : 'no cookie');
  add('Cookie Secure', /secure/i.test(cookie) ? 'PASS' : 'INFO', 'not set; expected over HTTP in development');

  // 7. Account lockout: 5 wrong passwords, then the correct one should be refused
  for (let i = 0; i < 5; i++) { await post('/auth/login', { email, password: 'WrongPass!99999' }); loginCount++; }
  const locked = await post('/auth/login', { email, password: goodPw });
  loginCount++;
  add('Account lockout after 5 failures', locked.status === 423 ? 'PASS' : 'FAIL', `status ${locked.status}`);

  // 8. Rate limit on register (invalid input, so nothing is created)
  let regLimited = 0;
  for (let i = 0; i < 40; i++) {
    const r = await post('/auth/register', { email: 'x', password: 'y' });
    if (r.status === 429) regLimited++;
  }
  add('Rate limit on /register (40 requests)', regLimited > 0 ? 'PASS' : 'FAIL', `${regLimited} requests got 429`);

  // 9. Rate limit on login (non-existent email, so no real account is touched)
  let firstLimited = null;
  for (let i = 0; i < 30; i++) {
    const r = await post('/auth/login', { email: 'nobody@example.com', password: 'WrongPass!99999' });
    loginCount++;
    if (r.status === 429 && firstLimited === null) firstLimited = loginCount;
  }
  add('Rate limit on /login', firstLimited ? 'PASS' : 'FAIL', firstLimited ? `first 429 at login request #${firstLimited}` : 'never limited');

  console.log(`\nSecurity audit: ${label}\n`);
  console.table(results);
  const out = path.join(__dirname, `results_${label}.json`);
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('Saved', out);
})();