const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};

// Uniform random integer in [0, max) with no modulo bias
function secureRandomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

export function generatePassword({
  length = 16,
  lower = true,
  upper = true,
  digits = true,
  symbols = true,
} = {}) {
  const chosen = [];
  if (lower) chosen.push(SETS.lower);
  if (upper) chosen.push(SETS.upper);
  if (digits) chosen.push(SETS.digits);
  if (symbols) chosen.push(SETS.symbols);
  if (chosen.length === 0) throw new Error("Select at least one character type");
  if (length < chosen.length) throw new Error("Length too short");

  const pool = chosen.join("");
  const chars = [];

  // Guarantee at least one character from each selected set
  for (const set of chosen) chars.push(set[secureRandomInt(set.length)]);
  while (chars.length < length) chars.push(pool[secureRandomInt(pool.length)]);

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// Simple entropy-based estimate. A guide only, not a guarantee.
export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "Empty", bits: 0 };

  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;

  let bits = pw.length * Math.log2(pool || 1);

  // Penalties: repeated characters and sequences like "abc" / "123"
  if (/(.)\1{2,}/.test(pw)) bits *= 0.8;
  if (/(012|123|234|345|456|567|678|789|abc|bcd|cde|qwe|asd|zxc)/i.test(pw)) bits *= 0.8;
  if (/^(password|admin|welcome|letmein|qwerty)/i.test(pw)) bits = Math.min(bits, 20);

  let score = 0;
  if (bits >= 28) score = 1;
  if (bits >= 45) score = 2;
  if (bits >= 60) score = 3;
  if (bits >= 80) score = 4;

  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
  return { score, label: labels[score], bits: Math.round(bits) };
}

async function sha1Hex(text) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// Returns number of times seen in breaches (0 = not found), or null if the check failed
export async function checkBreach(password) {
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return null;

    const text = await res.text();
    for (const line of text.split("\n")) {
      const [s, count] = line.trim().split(":");
      if (s === suffix) return parseInt(count, 10);
    }
    return 0;
  } catch {
    return null;
  }
}