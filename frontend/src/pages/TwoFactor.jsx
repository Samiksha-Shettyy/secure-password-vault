import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function TwoFactor() {
  const [enabled, setEnabled] = useState(null); // null = loading
  const [setup, setSetup] = useState(null);     // { qr, secret }
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/auth/me').then(d => setEnabled(d.totp_enabled)).catch(() => setEnabled(false));
  }, []);

  async function start() {
    setError('');
    try {
      setSetup(await api('/auth/totp/setup', 'POST'));
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirm(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/auth/totp/enable', 'POST', { code });
      setEnabled(true);
      setSetup(null);
      setCode('');
    } catch (err) {
      setError(err.message);
    }
  }

  if (enabled === null) return null;

  return (
    <div>
      <h3>Two-factor authentication</h3>
      {enabled && <p>2FA is <strong>enabled</strong>. You will be asked for a code at login.</p>}

      {!enabled && !setup && (
        <button onClick={start}>Enable 2FA</button>
      )}

      {!enabled && setup && (
        <div>
          <p>1. Scan this QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy).</p>
          <img src={setup.qr} alt="2FA QR code" width="200" height="200" />
          <p>Can't scan? Enter this key manually: <code>{setup.secret}</code></p>
          <p>2. Enter the 6-digit code the app shows:</p>
          <form onSubmit={confirm}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
            <button type="submit">Confirm and enable</button>
          </form>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}