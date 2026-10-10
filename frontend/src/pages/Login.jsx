import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { deriveKeyHex } from '../crypto.js';

export default function Login({ setSession }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/login', 'POST', {
        email,
        password,
        totp: needTotp ? totp : undefined,
      });

      // Password was correct and the account has 2FA: ask for the code
      if (data.totp_required) {
        setNeedTotp(true);
        return;
      }

      const key = await deriveKeyHex(password, data.kdf_salt);
      setPassword('');
      setTotp('');
      setSession({ email, key });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="box">
      <h2>Login</h2>
      <form onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required disabled={needTotp} />
        <input type="password" placeholder="Master password" value={password} onChange={e => setPassword(e.target.value)} required disabled={needTotp} />
        {needTotp && (
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit 2FA code"
            value={totp}
            onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
            autoFocus
            required
          />
        )}
        <button type="submit" disabled={busy}>
          {busy ? 'Unlocking...' : needTotp ? 'Verify code' : 'Login'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <p>No account? <Link to="/register">Register</Link></p>
    </div>
  );
}