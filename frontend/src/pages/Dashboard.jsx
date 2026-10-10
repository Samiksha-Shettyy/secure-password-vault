import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { encryptText, decryptText } from '../crypto.js';
import { generatePassword, passwordStrength, checkBreach } from '../tools.js';
import TwoFactor from './TwoFactor.jsx';

export default function Dashboard({ session, setSession }) {
  const [entries, setEntries] = useState([]);
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [revealed, setRevealed] = useState({}); // id -> { username, password } or { failed: true }
  const [genLen, setGenLen] = useState(20);
  const [genSymbols, setGenSymbols] = useState(true);
  const navigate = useNavigate();

  const strength = passwordStrength(password);

  async function load() {
    try {
      setEntries(await api('/vault'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!session) { navigate('/login'); return; }
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    setError(''); setInfo('');
    try {
      const payload = await encryptText(session.key, JSON.stringify({ username, password }));
      const { iv, ct } = JSON.parse(payload);
      await api('/vault', 'POST', { site, encrypted_data: ct, iv });
      setSite(''); setUsername(''); setPassword('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reveal(en) {
    if (revealed[en.id]) {
      setRevealed(r => { const n = { ...r }; delete n[en.id]; return n; });
      return;
    }
    try {
      const pt = await decryptText(session.key, JSON.stringify({ iv: en.iv, ct: en.encrypted_data }));
      setRevealed(r => ({ ...r, [en.id]: JSON.parse(pt) }));
    } catch {
      setRevealed(r => ({ ...r, [en.id]: { failed: true } }));
    }
  }

  async function copyPassword(pw) {
    await navigator.clipboard.writeText(pw);
    setInfo('Copied. Clipboard will be cleared in 15 seconds.');
    setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 15000);
  }

  function fillGenerated() {
    setPassword(generatePassword({ length: genLen, symbols: genSymbols }));
  }

  async function runBreachCheck() {
    setInfo('Checking...');
    const n = await checkBreach(password);
    if (n === null) setInfo('Breach check failed (network error).');
    else if (n === 0) setInfo('Not found in known breaches.');
    else setInfo(`WARNING: seen ${n.toLocaleString()} times in breaches. Do not use it.`);
  }

  async function remove(id) {
    await api('/vault/' + id, 'DELETE');
    load();
  }

  async function logout() {
    await api('/auth/logout', 'POST');
    setSession(null);
    navigate('/login');
  }

  if (!session) return null;

  return (
    <div className="box wide">
      <h2>My Vault <small>({session.email})</small></h2>
            <button onClick={logout}>Logout</button>

            <TwoFactor />

      <h3>Add entry</h3>
      <form onSubmit={add}>
        <input placeholder="Site (e.g. github.com)" value={site} onChange={e => setSite(e.target.value)} required />
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input type="text" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />

        <p>Strength: <strong>{strength.label}</strong> (~{strength.bits} bits)</p>

        <div>
          <label>Length: {genLen} <input type="range" min="8" max="64" value={genLen} onChange={e => setGenLen(+e.target.value)} /></label>
          <label> <input type="checkbox" checked={genSymbols} onChange={e => setGenSymbols(e.target.checked)} /> Symbols</label>
        </div>
        <button type="button" onClick={fillGenerated}>Generate</button>{' '}
        <button type="button" onClick={runBreachCheck} disabled={!password}>Check breach</button>{' '}
        <button type="submit">Save (encrypted)</button>
      </form>
      {info && <p>{info}</p>}
      {error && <p className="error">{error}</p>}

      <h3>Saved entries</h3>
      {entries.length === 0 && <p>No entries yet.</p>}
      {entries.map(en => (
        <div className="entry" key={en.id}>
          <strong>{en.site}</strong>
          <span style={{ float: 'right' }}>
            <button onClick={() => reveal(en)}>{revealed[en.id] ? 'Hide' : 'Reveal'}</button>{' '}
            <button onClick={() => remove(en.id)}>Delete</button>
          </span>
          {revealed[en.id]?.failed && <p className="error">Cannot decrypt (old test entry or wrong key). Delete it.</p>}
          {revealed[en.id] && !revealed[en.id].failed && (
            <p>
              {revealed[en.id].username} / {revealed[en.id].password}{' '}
              <button onClick={() => copyPassword(revealed[en.id].password)}>Copy</button>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}