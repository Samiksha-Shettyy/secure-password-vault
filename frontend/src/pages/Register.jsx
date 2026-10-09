import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/auth/register', 'POST', { email, password });
      navigate('/login');
    } catch (err) {
      setError(err.message + ' (password needs 10+ characters)');
    }
  }

  return (
    <div className="box">
      <h2>Register</h2>
      <form onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Master password (10+ chars)" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Register</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p>Have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}