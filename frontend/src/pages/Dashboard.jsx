import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard({ session, setSession }) {
  const [entries, setEntries] = useState([]);
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function load() {
    try {
      setEntries(await api('/vault'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      // TEMPORARY: sent unencrypted. Stage 7 replaces this with AES-GCM encryption.
      await api('/vault', 'POST', {
        site,
        encrypted_data: JSON.stringify({ username, password }),
        iv: 'temporary',
      });
      setSite(''); setUsername(''); setPassword('');
      load();
    } catch (err) {
      setError(err.message);
    }
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

  return (
    <div className="box wide">
      <h2>My Vault <small>({session.email})</small></h2>
      <button onClick={logout}>Logout</button>

      <h3>Add entry</h3>
      <form onSubmit={add}>
        <input placeholder="Site (e.g. github.com)" value={site} onChange={e => setSite(e.target.value)} required />
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Save</button>
      </form>
      {error && <p className="error">{error}</p>}

      <h3>Saved entries</h3>
      {entries.length === 0 && <p>No entries yet.</p>}
      {entries.map(en => (
        <div className="entry" key={en.id}>
          <strong>{en.site}</strong>
          <button style={{ float: 'right' }} onClick={() => remove(en.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}