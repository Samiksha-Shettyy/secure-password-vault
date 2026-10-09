import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  // Held in memory only. Never saved to localStorage.
  const [session, setSession] = useState(null);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login setSession={setSession} />} />
      <Route
        path="/dashboard"
        element={session ? <Dashboard session={session} setSession={setSession} /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}