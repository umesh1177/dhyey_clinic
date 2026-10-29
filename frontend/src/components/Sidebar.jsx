import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentView, setCurrentView, isCollapsed, isMobileOpen, onCloseMobile }) {
  const { activeClinic } = useAuth();
  const clinicName = activeClinic?.name || 'Dhyey Clinic';

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-table-columns', kbd: 'F4' },
    { key: 'family', label: 'Family Head Reg.', icon: 'fa-people-roof', kbd: 'F1' },
    { key: 'patient', label: 'Add Member', icon: 'fa-user-plus', kbd: 'F2' },
    { key: 'case', label: 'Patient Record', icon: 'fa-clipboard-user', kbd: 'F3' },
    { key: 'masters', label: 'Master Data', icon: 'fa-layer-group', kbd: 'F7' },
    { key: 'certificates', label: 'Medical Certificate', icon: 'fa-certificate', kbd: 'F6' },
    { key: 'reports', label: 'Reports', icon: 'fa-chart-line', kbd: 'F5' },
    { key: 'billing', label: 'Billing & Dues', icon: 'fa-file-invoice-dollar' },
    { key: 'inventory', label: 'Pharmacy Stock', icon: 'fa-boxes-stacked' },
    { key: 'followups', label: 'Follow-ups', icon: 'fa-calendar-check' },
    { key: 'feedback', label: 'Help & Feedback', icon: 'fa-headset', kbd: 'F8' },
  ];

  return (
    <>
      {isMobileOpen && (
        <div className="cms-sidebar-backdrop active" onClick={onCloseMobile} />
      )}
      <aside className={`cms-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`} id="cms-sidebar">
        <div className="cms-brand">
          <div className="cms-brand-icon"><i className="fa-solid fa-stethoscope"></i></div>
          <div>
            <div className="cms-brand-text">{clinicName}</div>
            <div className="cms-brand-subtitle">Doctor Workspace</div>
          </div>
        </div>

        <nav id="doctor-nav-links" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => (
            <a
              key={item.key}
              className={`cms-nav-item ${currentView === item.key ? 'active' : ''}`}
              onClick={() => {
                setCurrentView(item.key);
                onCloseMobile();
              }}
              style={{ cursor: 'pointer' }}
            >
              <span className="cms-nav-left">
                <i className={`fa-solid ${item.icon}`}></i>
                <span>{item.label}</span>
              </span>
              {item.kbd && <span className="cms-kbd">{item.kbd}</span>}
            </a>
          ))}
        </nav>

        <div className="cms-sidebar-footer">
          <div
            id="service-mode-indicator"
            style={{
              marginBottom: '6px',
              padding: '6px 8px',
              borderRadius: '6px',
              background: 'rgba(20,107,92,0.12)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--primary)',
            }}
          >
            <i className="fa-solid fa-user-doctor"></i> Mode: OPD Practice
          </div>
          <b>Shortcuts:</b><br />
          F1 Family · F2 Member · F3 Case<br />
          F4 Dashboard · F5 Reports · F6 Cert<br />
          F7 Masters · F8 Support · / Search
        </div>
      </aside>
    </>
  );
}
