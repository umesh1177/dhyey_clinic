import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fmtDate, todayISO, apiFetch, showToast } from '../services/api';

export default function Topbar({ onToggleSidebar, onSelectPatient, theme, onToggleTheme }) {
  const { session, activeClinic, switchClinic, addClinic, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  const profileRef = useRef(null);
  const searchRef = useRef(null);

  const docName = session?.profile?.name || session?.profile?.username || 'Doctor';
  const fullDocName = docName.startsWith('Dr.') ? docName : `Dr. ${docName}`;
  const clinicName = activeClinic?.name || session?.profile?.clinicName || 'Dhyey Clinic & Nursing Home';
  const clinics = session?.profile?.clinics || [{ id: 'CLN-001', name: clinicName }];

  const todayStr = '31/10/2026';

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Keyboard shortcut '/' to focus global search
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const input = document.getElementById('cms-top-search');
        if (input) input.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live search handler
  const handleSearchChange = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    const query = q.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      return;
    }

    try {
      const res = await apiFetch('/families');
      const famList = res.data || [];
      const results = [];

      for (const fam of famList) {
        const famMatches =
          (fam.id && fam.id.toLowerCase().includes(query)) ||
          (fam.famId && fam.famId.toLowerCase().includes(query)) ||
          (fam.headName && fam.headName.toLowerCase().includes(query)) ||
          (fam.phone && fam.phone.includes(query)) ||
          (fam.area && fam.area.toLowerCase().includes(query));

        for (const pat of Object.values(fam.patients || {})) {
          const patMatches =
            famMatches ||
            (pat.id && pat.id.toLowerCase().includes(query)) ||
            (pat.patId && pat.patId.toLowerCase().includes(query)) ||
            (pat.name && pat.name.toLowerCase().includes(query)) ||
            (pat.phone && pat.phone.includes(query));

          if (patMatches) {
            results.push({
              familyId: fam.id || fam.famId,
              headName: fam.headName,
              patientId: pat.id || pat.patId,
              patientName: pat.name,
              relation: pat.relation,
              area: pat.area || fam.area,
            });
          }
        }
      }

      setSearchResults(results.slice(0, 10));
      setSearchDropdownOpen(results.length > 0);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSelectResult = (res) => {
    onSelectPatient(res.familyId, res.patientId);
    setSearchQuery('');
    setSearchDropdownOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectResult(searchResults[0]);
    } else if (searchQuery.trim()) {
      showToast(`No patient found matching "${searchQuery}"`, 'error');
    }
  };

  return (
    <header className="cms-topbar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      minHeight: '56px'
    }}>
      {/* ── LEFT: Hamburger + Clinic Name & Date + Online Pill ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            background: 'var(--surface-alt)', border: '1px solid var(--border)',
            borderRadius: '6px', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text)'
          }}
          title="Toggle Navigation (Alt+S)"
        >
          <i className="fa-solid fa-bars" />
        </button>

        <div>
          <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text)', lineHeight: 1.2 }}>
            {clinicName}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1 }}>
            {todayStr}
          </div>
        </div>

        {/* Online Pill Badge */}
        <span style={{
          background: '#e6f7f2', color: '#059669', border: '1px solid #a7f3d0',
          borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '5px'
        }}>
          <i className="fa-solid fa-signal" style={{ fontSize: '10px' }} /> Online
        </span>
      </div>

      {/* ── RIGHT: Global Search Bar + Dark Mode + Doctor Profile ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Global Patient Search (Exact Screenshot Format) */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <form onSubmit={handleSearchSubmit} style={{ margin: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', background: 'var(--surface-alt, #f8fafc)',
              border: '1px solid var(--border, #cbd5e1)', borderRadius: '8px',
              padding: '0 10px', height: '34px', width: '300px'
            }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)', fontSize: '13px', marginRight: '8px' }} />
              <input
                id="cms-top-search"
                type="text"
                placeholder="Search patient name, ID, family..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => { if (searchQuery.trim()) setSearchDropdownOpen(true); }}
                autoComplete="off"
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '12.5px', color: 'var(--text)', flex: 1
                }}
              />
              <span style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '4px', padding: '1px 5px', fontSize: '10.5px',
                fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1
              }}>
                /
              </span>
            </div>
          </form>

          {/* Search Dropdown */}
          {searchDropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              minWidth: '320px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
              maxHeight: '340px', overflowY: 'auto', zIndex: 9999
            }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  No matching patients for "<strong>{searchQuery}</strong>"
                </div>
              ) : (
                searchResults.slice(0, 8).map((r, i) => (
                  <div
                    key={`${r.patientId}-${i}`}
                    onClick={() => handleSelectResult(r)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text)' }}>
                        {r.patientName} {r.relation && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({r.relation})</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {r.headName} · {r.area}
                      </div>
                    </div>
                    <span className="font-mono" style={{ background: 'var(--surface-alt)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 700 }}>
                      {r.patientId}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Dark / Light Mode Toggle Button (Moon Icon in Circle) */}
        <button
          type="button"
          onClick={onToggleTheme}
          style={{
            background: 'var(--surface-alt)', border: '1px solid var(--border)',
            borderRadius: '50%', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text)', fontSize: '13px'
          }}
          title="Toggle Light / Dark Mode"
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
        </button>

        {/* Doctor Dropdown Pill (Exact Screenshot Format: "Dr. Chirag Paghdal ▾") */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '6px 12px', fontSize: '12.5px',
              fontWeight: 700, color: 'var(--text)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span>{fullDocName}</span>
            <i className="fa-solid fa-chevron-down" style={{ fontSize: '10px', color: 'var(--text-muted)' }} />
          </button>

          {profileOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              width: '240px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
              padding: '12px', zIndex: 10000
            }}>
              <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)' }}>{fullDocName}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {session?.profile?.degree || 'B.H.M.S.'} · Reg #G-9035
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Switch Clinic
              </div>
              {clinics.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { switchClinic(c.id); setProfileOpen(false); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: '4px',
                    border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px',
                    color: 'var(--text)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <i className="fa-solid fa-hospital" style={{ marginRight: '6px', color: 'var(--primary)' }} />
                  {c.name}
                </button>
              ))}

              <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: '4px',
                    border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px',
                    color: '#dc2626', fontWeight: 600
                  }}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: '6px' }} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
