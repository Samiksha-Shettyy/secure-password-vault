const crypto = require('crypto');
const { promisify } = require('util');
const argon2 = require('argon2');

const pbkdf2 = promisify(crypto.pbkdf2);
const scrypt = promisify(crypto.scrypt);

const PASSWORD = 'correct horse battery staple';
const SALT = crypto.randomBytes(16);
const KEYLEN = 32;
const RUNS = 5;

// Each config: label, algorithm, cost description, memory in MB, function that derives one key
const configs = [
  // PBKDF2-SHA256: CPU-only, no memory cost
  ...[100000, 310000, 600000, 1000000].map(n => ({
    algo: 'PBKDF2-SHA256',
    params: `iterations=${n.toLocaleString()}`,
    memMB: 0,
    run: () => pbkdf2(PASSWORD, SALT, n, KEYLEN, 'sha256'),
  })),

  // scrypt: memory = 128 * N * r bytes
  ...[
    { N: 2 ** 14, r: 8, p: 1 },
    { N: 2 ** 15, r: 8, p: 1 },
    { N: 2 ** 16, r: 8, p: 1 },
  ].map(({ N, r, p }) => ({
    algo: 'scrypt',
    params: `N=2^${Math.log2(N)}, r=${r}, p=${p}`,
    memMB: (128 * N * r) / (1024 * 1024),
    run: () => scrypt(PASSWORD, SALT, KEYLEN, { N, r, p, maxmem: 256 * 1024 * 1024 }),
  })),

  // Argon2id: memoryCost is in KiB
  ...[
    { m: 19456, t: 2, p: 1 }, // OWASP minimum recommendation
    { m: 46080, t: 1, p: 1 }, // OWASP alternative
    { m: 65536, t: 3, p: 1 },
  ].map(({ m, t, p }) => ({
    algo: 'Argon2id',
    params: `m=${m} KiB, t=${t}, p=${p}`,
    memMB: m / 1024,
    run: () =>
      argon2.hash(PASSWORD, {
        type: argon2.argon2id,
        memoryCost: m,
        timeCost: t,
        parallelism: p,
        salt: SALT,
        hashLength: KEYLEN,
        raw: true,
      }),
  })),
];

async function time(fn) {
  const start = process.hrtime.bigint();
  await fn();
  return Number(process.hrtime.bigint() - start) / 1e6; // ms
}

(async () => {
  console.log(`Node ${process.version} on ${process.platform}, ${RUNS} runs each (+1 warm-up)\n`);
  const results = [];

  for (const c of configs) {
    await c.run(); // warm-up, not counted
    const times = [];
    for (let i = 0; i < RUNS; i++) times.push(await time(c.run));
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    results.push({
      Algorithm: c.algo,
      Parameters: c.params,
      'Memory (MB)': c.memMB,
      'Avg (ms)': Math.round(avg),
      'Min (ms)': Math.round(min),
      'Max (ms)': Math.round(max),
    });
    console.log(`done: ${c.algo} ${c.params}`);
  }

  console.log('');
  console.table(results);
  require('fs').writeFileSync('results.json', JSON.stringify(results, null, 2));
  console.log('Saved results.json');
})();