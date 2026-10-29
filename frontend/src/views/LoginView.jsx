import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../services/api';

export default function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid username or password.');
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
    setLoading(true);
    try {
      await login(u, p);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #095c54 0%, #0d3834 100%)',
        padding: '20px',
      }}
    >
      <div
        className="cms-login-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--surface, #ffffff)',
          borderRadius: '16px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #095c54, #146B5C)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '16px',
              boxShadow: '0 10px 15px -3px rgba(9, 92, 84, 0.4)',
            }}
          >
            <i className="fa-solid fa-stethoscope"></i>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text, #1e293b)', margin: '0 0 6px' }}>
            Dhyey Clinic &amp; Hospital
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748b)', margin: 0 }}>
            Doctor Clinical Management System
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <i
                className="fa-solid fa-user-doctor"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              ></i>
              <input
                type="text"
                className="cms-input"
                style={{ width: '100%', paddingLeft: '36px', height: '42px', fontSize: '14px' }}
                placeholder="Enter doctor username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <i
                className="fa-solid fa-lock"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              ></i>
              <input
                type={showPass ? 'text' : 'password'}
                className="cms-input"
                style={{ width: '100%', paddingLeft: '36px', paddingRight: '40px', height: '42px', fontSize: '14px' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="cms-btn cms-btn-primary"
            disabled={loading}
            style={{ width: '100%', height: '44px', fontSize: '15px', fontWeight: 700, marginTop: '8px' }}
          >
            {loading ? (
              <span><i className="fa-solid fa-circle-notch fa-spin"></i> Authenticating...</span>
            ) : (
              <span><i className="fa-solid fa-right-to-bracket"></i> Sign In to Doctor Workspace</span>
            )}
          </button>
        </form>

        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '10px' }}>
            Quick Demo Doctor Accounts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => handleQuickLogin('dhyey', '123')}
              style={{
                width: '100%',
                justifyContent: 'space-between',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12.5px',
              }}
            >
              <span><strong>Dr. Chirag Paghdal</strong> (B.H.M.S.)</span>
              <span className="cms-pill" style={{ fontSize: '10px' }}>dhyey / 123</span>
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => handleQuickLogin('mehul', '123')}
              style={{
                width: '100%',
                justifyContent: 'space-between',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12.5px',
              }}
            >
              <span><strong>Dr. Mehul Shah</strong> (M.D.)</span>
              <span className="cms-pill" style={{ fontSize: '10px' }}>mehul / 123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
