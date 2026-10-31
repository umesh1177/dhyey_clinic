import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../services/api';

export default function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('dhyey');
  const [password, setPassword] = useState('123');
  const [showPass, setShowPass] = useState(false);
  const [keepSigned, setKeepSigned] = useState(true);
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
        background: 'radial-gradient(ellipse at center, #0d322c 0%, #051a16 100%)',
        padding: '24px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* 2-Column Main Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '890px',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          display: 'flex',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        {/* Left Side: Brand & Feature Highlights (Dark Green) */}
        <div
          style={{
            width: '48%',
            background: '#062d26',
            padding: '36px 32px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div>
            {/* Top Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#34d399',
                marginBottom: '20px',
              }}
            >
              <i className="fa-solid fa-stethoscope" /> Doctor Clinical Practice Portal
            </div>

            {/* Brand Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.45)',
                  flexShrink: 0,
                }}
              >
                <i className="fa-solid fa-notes-medical" />
              </div>
              <div>
                <h1 style={{ fontSize: '21px', fontWeight: 900, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                  Dhyey Clinic &amp; Hospital
                </h1>
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#6ee7b7', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>
                  DOCTOR WORKSPACE
                </div>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.72)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Comprehensive OPD case records, fast family member indexing, digital clinical prescriptions, and complete medical certificates.
            </p>

            {/* 3 Feature Boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                  <i className="fa-solid fa-users" />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#ffffff' }}>Family Head &amp; Member System</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.3 }}>Instant family card grouping with complete shared medical histories and pedigree tracking.</div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                  <i className="fa-solid fa-prescription" />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#ffffff' }}>Smart Digital Prescriptions</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.3 }}>Speedy drug dosages, auto-complete shortcuts, and professional prescription prints.</div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                  <i className="fa-solid fa-certificate" />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#ffffff' }}>Medical Certificates &amp; Reports</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.3 }}>Quick generation of medical fitness, illness, and leave certificates in 1 click.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 3 Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              marginTop: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>100%</div>
              <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#6ee7b7', letterSpacing: '0.5px' }}>DOCTOR SCOPED</div>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>F1-F8</div>
              <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#6ee7b7', letterSpacing: '0.5px' }}>KEYBOARD FLOW</div>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>Offline</div>
              <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#6ee7b7', letterSpacing: '0.5px' }}>PWA READY</div>
            </div>
          </div>
        </div>

        {/* Right Side: Doctor Sign In Form (White) */}
        <div
          style={{
            flex: 1,
            padding: '36px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Doctor Sign In
          </h2>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
            Enter your credentials to access clinical records
          </p>

          {/* Callout Badge */}
          <div
            style={{
              background: '#e6f4f1',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#095c54',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            <i className="fa-solid fa-user-doctor" /> Doctor Clinical Workspace Login
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <i className="fa-solid fa-circle-exclamation" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                Doctor Username or Email *
              </label>
              <div style={{ position: 'relative' }}>
                <i
                  className="fa-solid fa-user"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}
                />
                <input
                  type="text"
                  className="cms-input"
                  style={{ width: '100%', paddingLeft: '34px', height: '40px', fontSize: '13.5px', background: '#f8fafc', border: '1px solid #cbd5e1' }}
                  placeholder="dhyey"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', margin: 0 }}>
                  Password *
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); alert('Default credentials: username "dhyey", password "123"'); }}
                  style={{ fontSize: '11.5px', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}
                >
                  Forgot Password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <i
                  className="fa-solid fa-lock"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="cms-input"
                  style={{ width: '100%', paddingLeft: '34px', paddingRight: '38px', height: '40px', fontSize: '13.5px', background: '#f8fafc', border: '1px solid #cbd5e1' }}
                  placeholder="•••"
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
                    color: '#94a3b8',
                    padding: '2px',
                  }}
                >
                  <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {/* Keep me signed in checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer', margin: '2px 0 6px' }}>
              <input
                type="checkbox"
                checked={keepSigned}
                onChange={(e) => setKeepSigned(e.target.checked)}
                style={{ accentColor: '#059669', width: '15px', height: '15px' }}
              />
              <span>Keep me signed in on this device</span>
            </label>

            {/* Gradient Green Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '42px',
                background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <span><i className="fa-solid fa-circle-notch fa-spin" /> Authenticating...</span>
              ) : (
                <span>Sign In to Workspace <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }} /></span>
              )}
            </button>
          </form>

          {/* Quick Doctor Logins */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px', textAlign: 'center', marginBottom: '8px', textTransform: 'uppercase' }}>
              Quick Doctor Logins
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('dhyey', '123')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '11.5px',
                  color: '#334155',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-user-doctor" style={{ color: '#059669', fontSize: '11px' }} />
                <span>Dr. Chirag (dhyey / 123)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('mehul', '123')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '11.5px',
                  color: '#334155',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-user-doctor" style={{ color: '#059669', fontSize: '11px' }} />
                <span>Dr. Mehul (mehul / 123)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
