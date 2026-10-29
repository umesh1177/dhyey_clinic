import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fmtDate, todayISO, getLocalDB, showToast } from '../services/api';

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
  const clinicName = activeClinic?.name || session?.profile?.clinicName || 'Dhyey Clinic & Hospital';
  const clinics = session?.profile?.clinics || [{ id: 'CLN-001', name: clinicName }];

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

  // Live search handler
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    const query = q.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      return;
    }

    const db = getLocalDB(session?.profile?.activeClinicId || 'demo');
    const results = [];

    for (const fam of Object.values(db.families || {})) {
      const famMatches =
        (fam.id && fam.id.toLowerCase().includes(query)) ||
        (fam.headName && fam.headName.toLowerCase().includes(query)) ||
        (fam.phone && fam.phone.includes(query)) ||
        (fam.area && fam.area.toLowerCase().includes(query)) ||
        (fam.society && fam.society.toLowerCase().includes(query));

      for (const pat of Object.values(fam.patients || {})) {
        let patMatches =
          famMatches ||
          (pat.id && pat.id.toLowerCase().includes(query)) ||
          (pat.name && pat.name.toLowerCase().includes(query)) ||
          (pat.phone && pat.phone.includes(query));

        let matchedCase = null;
        if (!patMatches && pat.visits) {
          for (const v of pat.visits) {
            if (
              (v.caseId && String(v.caseId).toLowerCase().includes(query)) ||
              (v.complaint && v.complaint.toLowerCase().includes(query)) ||
              (v.diagnosis && v.diagnosis.toLowerCase().includes(query))
            ) {
              patMatches = true;
              matchedCase = v.caseId;
              break;
            }
          }
        }

        if (patMatches) {
          results.push({
            familyId: fam.id || fam.famId,
            headName: fam.headName,
            patientId: pat.id || pat.patId,
            patientName: pat.name,
            age: pat.age,
            gender: pat.gender,
            relation: pat.relation,
            phone: pat.phone || fam.phone,
            area: pat.area || fam.area,
            matchedCase,
          });
        }
      }
    }

    setSearchResults(results);
    setSearchDropdownOpen(true);
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

  const handleAddNewClinic = () => {
    const name = window.prompt('Enter new clinic / hospital branch name:');
    if (name && name.trim()) {
      addClinic(name.trim());
    }
  };

  return (
    <header className="cms-topbar">
      <div className="cms-topbar-left">
        <button
          type="button"
          className="cms-btn-ghost cms-btn-icon"
          id="btn-toggle-sidebar"
          title="Toggle Navigation (Alt+S)"
          onClick={onToggleSidebar}
        >
          <i className="fa-solid fa-bars"></i>
        </button>

        <div className="cms-clinic-info-tag">
          <i className="fa-solid fa-hospital-user text-primary" style={{ marginRight: '6px' }}></i>
          <span className="cms-clinic-title" id="topbar-clinic-title">{clinicName}</span>
        </div>
      </div>

      {/* Global Live Patient Search */}
      <div className="cms-topbar-center" ref={searchRef} style={{ position: 'relative' }}>
        <form id="cms-global-search-form" className="cms-search-box" onSubmit={handleSearchSubmit}>
          <i className="fa-solid fa-magnifying-glass cms-search-icon"></i>
          <input
            type="text"
            id="cms-top-search"
            className="cms-search-input"
            placeholder="Search patient name, family, phone or case (Press '/' to focus)..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if (searchQuery.trim()) setSearchDropdownOpen(true); }}
            autoComplete="off"
          />
          <kbd className="cms-kbd">/</kbd>
        </form>

        {searchDropdownOpen && (
          <div
            id="cms-top-search-dropdown"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              minWidth: '340px',
              background: 'var(--surface, #ffffff)',
              border: '1.5px solid var(--border, #e2e8f0)',
              borderRadius: 'var(--radius-md, 8px)',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
              maxHeight: '380px',
              overflowY: 'auto',
              zIndex: 9999,
            }}
          >
            {searchResults.length === 0 ? (
              <div style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '6px', opacity: 0.6 }}></i>
                No matching patients or cases for "<strong>{searchQuery}</strong>"
              </div>
            ) : (
              <div>
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Matching Patients ({searchResults.length})</span>
                  <span>Click to open case</span>
                </div>
                {searchResults.slice(0, 8).map((r, i) => (
                  <div
                    key={`${r.patientId}-${i}`}
                    className="cms-search-result-item"
                    onClick={() => handleSelectResult(r)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #095c54, #0b5ed7)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {r.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                          {r.patientName}
                          {r.relation && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>({r.relation})</span>}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                          <span><i className="fa-solid fa-users" style={{ fontSize: '10px' }}></i> {r.headName}</span>
                          {r.phone && <span><i className="fa-solid fa-phone" style={{ fontSize: '10px' }}></i> {r.phone}</span>}
                          {r.matchedCase && <span className="cms-pill" style={{ fontSize: '10px', background: 'rgba(13,110,253,0.1)', color: '#095c54' }}>Case #{r.matchedCase}</span>}
                        </div>
                      </div>
                    </div>
                    <span className="cms-pill font-mono" style={{ fontSize: '11px', flexShrink: 0 }}>
                      {r.patientId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="cms-topbar-right">
        {/* Date Display */}
        <div className="cms-badge cms-badge-calendar" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-calendar-day"></i>
          <span id="topbar-date-display">{fmtDate(todayISO())}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="cms-btn-ghost cms-btn-icon"
          id="btn-theme-toggle"
          title="Toggle Light / Dark Mode"
          onClick={onToggleTheme}
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>

        {/* Doctor Profile Dropdown */}
        <div className="cms-profile-menu-container" ref={profileRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="cms-doctor-badge"
            id="btn-doc-profile"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="cms-doctor-avatar"><i className="fa-solid fa-user-md"></i></div>
            <div className="cms-doctor-meta">
              <span className="cms-doctor-name" id="topbar-doc-name">{fullDocName}</span>
              <span className="cms-doctor-sub">Clinical OP · Active</span>
            </div>
            <i className="fa-solid fa-chevron-down" style={{ fontSize: '11px', marginLeft: '4px', opacity: 0.7 }}></i>
          </button>

          {profileOpen && (
            <div
              className="cms-dropdown-menu"
              id="doc-profile-dropdown"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '280px',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                padding: '12px',
                zIndex: 10000,
              }}
            >
              <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{fullDocName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {session?.profile?.degree || 'B.H.M.S.'} · Reg #{session?.profile?.regNo || 'G-9035'}
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Active Clinics &amp; Branches
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                {clinics.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="cms-btn cms-btn-ghost clinic-switch-btn"
                    onClick={() => {
                      switchClinic(c.id);
                      setProfileOpen(false);
                    }}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      padding: '6px 10px',
                      fontSize: '12.5px',
                      background: c.id === activeClinic?.id ? 'var(--primary-soft, #e6f4f1)' : 'transparent',
                      color: c.id === activeClinic?.id ? 'var(--primary-dark, #063d38)' : 'var(--text)',
                      fontWeight: c.id === activeClinic?.id ? 700 : 500,
                    }}
                  >
                    <span><i className="fa-solid fa-hospital" style={{ marginRight: '6px' }}></i>{c.name}</span>
                    {c.id === activeClinic?.id && (
                      <span className="cms-pill cms-badge-paid" style={{ marginLeft: 'auto', fontSize: '9px' }}>
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="cms-btn cms-btn-outline"
                id="btn-add-clinic-action"
                onClick={() => {
                  setProfileOpen(false);
                  handleAddNewClinic();
                }}
                style={{ width: '100%', marginBottom: '8px', fontSize: '12px' }}
              >
                <i className="fa-solid fa-plus"></i> Add New Clinic Branch
              </button>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-danger"
                  id="btn-doc-logout"
                  onClick={logout}
                  style={{ width: '100%', fontSize: '12px', justifyContent: 'center' }}
                >
                  <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
