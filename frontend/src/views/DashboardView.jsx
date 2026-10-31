import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getLocalDB, fmtMoney, fmtDate, todayISO } from '../services/api';

const DATE_OPTS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Last 7 Days' },
  { key: 'month', label: 'This Month' },
];

export default function DashboardView({ onNavigate }) {
  const { session, activeClinic } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [dateRange, setDateRange] = useState('today');
  const [activeTab, setActiveTab] = useState('opd');
  const [tableSearch, setTableSearch] = useState('');

  const [stats, setStats] = useState({
    visitsToday: 0, newVisits: 0, revisits: 0,
    dateCollection: 0, billed: 0, due: 0,
    totalPatients: 0, totalFamilies: 0,
    totalDue: 0, defaulters: 0,
  });
  const [allVisits, setAllVisits] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardData(); }, [clinicId, dateRange]);

  const getDateRange = () => {
    const today = todayISO();
    if (dateRange === 'today') return { from: today, to: today };
    if (dateRange === 'yesterday') {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const s = y.toISOString().slice(0, 10);
      return { from: s, to: s };
    }
    if (dateRange === 'week') {
      const y = new Date(); y.setDate(y.getDate() - 6);
      return { from: y.toISOString().slice(0, 10), to: today };
    }
    // month
    const m = new Date(); m.setDate(1);
    return { from: m.toISOString().slice(0, 10), to: today };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const db = getLocalDB(clinicId);
      const { from, to } = getDateRange();
      const pats = [];
      const visits = [];
      const fups = [];

      Object.values(db.families || {}).forEach((f) => {
        Object.values(f.patients || {}).forEach((p) => {
          pats.push({ ...p, famHead: f.headName, famId: f.id, famDue: f.due || 0 });
          (p.visits || []).forEach((v) => {
            visits.push({
              ...v,
              famHead: f.headName,
              familyId: f.id,
              patName: p.name,
              patientId: p.id,
              gender: p.gender,
              age: p.age,
            });
          });
          (p.followUps || []).forEach((fu) => {
            fups.push({ ...fu, patName: p.name, familyId: f.id, patientId: p.id });
          });
        });
      });

      const inRange = visits.filter((v) => v.date >= from && v.date <= to);
      const today = todayISO();
      const todayVisits = visits.filter((v) => v.date === today);

      const collectionInRange = inRange.reduce((a, v) => a + (Number(v.received) || 0), 0);
      const billedInRange = inRange.reduce((a, v) => a + (Number(v.charge) || 0), 0);
      const dueInRange = inRange.reduce((a, v) => a + (Number(v.due) || 0), 0);
      const totalDueAll = visits.reduce((a, v) => a + (Number(v.due) || 0), 0);
      const defaulters = pats.filter((p) => (p.due || 0) > 0).length;

      setStats({
        visitsToday: inRange.length,
        newVisits: inRange.filter((v) => v.visitNum === 1).length,
        revisits: inRange.filter((v) => (v.visitNum || 1) > 1).length,
        dateCollection: collectionInRange,
        billed: billedInRange,
        due: dueInRange,
        totalPatients: pats.length,
        totalFamilies: Object.keys(db.families || {}).length,
        totalDue: totalDueAll,
        defaulters,
      });

      inRange.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setAllVisits(inRange);
      setAllPatients(pats);
      setFollowUps(fups.filter((f) => f.date >= today));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const todayLabel = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  };

  const filtered = (list) => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((v) =>
      (v.patName || '').toLowerCase().includes(q) ||
      (v.caseId || '').toLowerCase().includes(q) ||
      (v.diagnosis || '').toLowerCase().includes(q) ||
      (v.complaint || '').toLowerCase().includes(q)
    );
  };

  const tabCounts = {
    opd: allVisits.length,
    followups: followUps.length,
    invoices: allVisits.filter((v) => v.charge > 0).length,
    patients: allPatients.length,
    dues: allPatients.filter((p) => (p.due || 0) > 0).length,
  };

  const TABS = [
    { key: 'opd', label: 'OPD Consultations', icon: 'fa-stethoscope' },
    { key: 'followups', label: 'Follow-ups', icon: 'fa-bell' },
    { key: 'invoices', label: 'Invoices & Receipts', icon: 'fa-file-invoice' },
    { key: 'patients', label: 'Patient Directory', icon: 'fa-users' },
    { key: 'dues', label: 'Dues Recovery', icon: 'fa-triangle-exclamation' },
  ];

  return (
    <div className="cms-page-container" style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-chart-line" style={{ color: 'var(--primary)', fontSize: '18px' }}></i>
          <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Clinical Dashboard</h2>
          {/* Date filter pills */}
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            {DATE_OPTS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDateRange(d.key)}
                style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  background: dateRange === d.key ? 'var(--primary)' : 'var(--surface-alt)',
                  color: dateRange === d.key ? '#fff' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer',
                }}
              >{d.label}</button>
            ))}
          </div>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>{todayLabel()}</span>
        </div>
        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="cms-btn cms-btn-primary" onClick={() => onNavigate('case')} style={{ fontSize: '13px', padding: '7px 14px' }}>
            <i className="fa-solid fa-plus"></i> New Consultation <span className="cms-kbd" style={{ marginLeft: '4px' }}>F3</span>
          </button>
          <button className="cms-btn cms-btn-outline" onClick={() => onNavigate('patient')} style={{ fontSize: '13px', padding: '7px 14px' }}>
            <i className="fa-solid fa-user-plus"></i> Add Patient <span className="cms-kbd" style={{ marginLeft: '4px' }}>F2</span>
          </button>
          <button className="cms-btn cms-btn-outline" onClick={() => onNavigate('family')} style={{ fontSize: '13px', padding: '7px 14px' }}>
            <i className="fa-solid fa-people-roof"></i> Family Head <span className="cms-kbd" style={{ marginLeft: '4px' }}>F1</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '16px 20px' }}>
        {/* Visits */}
        <div className="cms-card" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px' }}>Today</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <i className="fa-solid fa-user-clock" style={{ color: 'var(--primary)', fontSize: '18px' }}></i>
                <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{stats.visitsToday}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Visits</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>OPD Consultations</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {stats.newVisits} New • {stats.revisits} Re-visits
              </div>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="cms-card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>Received</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <i className="fa-solid fa-indian-rupee-sign" style={{ color: '#10b981', fontSize: '18px' }}></i>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)' }}>
                {fmtMoney(stats.dateCollection).replace('₹', '')}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Revenue Collected</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Billed: {fmtMoney(stats.billed)} • Due: <span style={{ color: '#ef4444', fontWeight: 700 }}>{fmtMoney(stats.due)}</span>
            </div>
          </div>
        </div>

        {/* Network */}
        <div className="cms-card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '4px' }}>Network</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <i className="fa-solid fa-people-group" style={{ color: '#8b5cf6', fontSize: '18px' }}></i>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{stats.totalPatients}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Registered Patients</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{stats.totalFamilies} Families Registered</div>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="cms-card" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>Critical</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '18px' }}></i>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
                {fmtMoney(stats.totalDue).replace('₹', '')}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Outstanding Dues</div>
            <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '2px', fontWeight: 600 }}>
              {stats.defaulters} Defaulters • Recovery Pending
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
              <span style={{
                background: activeTab === tab.key ? 'var(--primary)' : 'var(--border)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700,
              }}>{tabCounts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '16px 20px' }}>
        {/* Table header with search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
            {activeTab === 'opd' && `OPD Consultations on ${todayLabel()}`}
            {activeTab === 'followups' && 'Upcoming Follow-ups'}
            {activeTab === 'invoices' && 'Invoices & Receipts'}
            {activeTab === 'patients' && 'Patient Directory'}
            {activeTab === 'dues' && 'Dues Recovery'}
          </div>
          <input
            type="text"
            className="cms-input"
            placeholder="Search table..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            style={{ width: '200px', height: '32px', fontSize: '12.5px' }}
          />
        </div>

        {/* OPD Consultations Table */}
        {activeTab === 'opd' && (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>CASE ID</th>
                  <th>PATIENT NAME</th>
                  <th>AGE/SEX</th>
                  <th>CHIEF COMPLAINT</th>
                  <th>DIAGNOSIS</th>
                  <th>TOTAL FEE</th>
                  <th>RECEIVED</th>
                  <th>DUE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered(allVisits).length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No consultations found
                  </td></tr>
                ) : (
                  filtered(allVisits).map((v, i) => (
                    <tr key={`${v.caseId}-${i}`}>
                      <td style={{ fontSize: '12.5px', fontWeight: 600 }}>{v.time || '--:--'}</td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '12px', color: 'var(--primary)' }}>
                          {v.caseId || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '12.5px' }}>{v.patName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.patName} · PT {v.patientId}</div>
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        {v.age || '?'} / {(v.gender || 'M').charAt(0)}
                      </td>
                      <td style={{ fontSize: '12.5px', maxWidth: '160px' }}>{v.complaint || '—'}</td>
                      <td>
                        {v.diagnosis ? (
                          <span style={{
                            background: 'rgba(139,92,246,0.1)', color: '#7c3aed',
                            borderRadius: '4px', padding: '2px 8px', fontSize: '11.5px', fontWeight: 600
                          }}>{v.diagnosis}</span>
                        ) : '—'}
                      </td>
                      <td className="font-mono" style={{ fontSize: '12.5px' }}>{fmtMoney(v.charge)}</td>
                      <td className="font-mono" style={{ fontSize: '12.5px', color: '#059669', fontWeight: 700 }}>{fmtMoney(v.received)}</td>
                      <td className="font-mono" style={{ fontSize: '12.5px', color: Number(v.due) > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                        {fmtMoney(v.due)}
                      </td>
                      <td>
                        <button
                          className="cms-btn cms-btn-ghost"
                          onClick={() => onNavigate('case', { familyId: v.familyId, patientId: v.patientId })}
                          style={{ fontSize: '12px', padding: '3px 10px', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                        >
                          Case →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Follow-ups Tab */}
        {activeTab === 'followups' && (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead><tr><th>DATE</th><th>PATIENT</th><th>FAMILY</th><th>NOTES</th><th>ACTION</th></tr></thead>
              <tbody>
                {filtered(followUps).length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No upcoming follow-ups</td></tr>
                ) : filtered(followUps).map((f, i) => (
                  <tr key={i}>
                    <td className="font-mono">{fmtDate(f.date)}</td>
                    <td style={{ fontWeight: 700 }}>{f.patName}</td>
                    <td>{f.familyId}</td>
                    <td>{f.notes || '—'}</td>
                    <td>
                      <button className="cms-btn cms-btn-ghost" onClick={() => onNavigate('case', { familyId: f.familyId, patientId: f.patientId })} style={{ fontSize: '12px' }}>
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead><tr><th>DATE</th><th>CASE ID</th><th>PATIENT</th><th>BILLED</th><th>RECEIVED</th><th>DUE</th><th>ACTION</th></tr></thead>
              <tbody>
                {filtered(allVisits.filter(v => v.charge > 0)).length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No invoices</td></tr>
                ) : filtered(allVisits.filter(v => v.charge > 0)).map((v, i) => (
                  <tr key={i}>
                    <td className="font-mono">{fmtDate(v.date)}</td>
                    <td className="font-mono" style={{ color: 'var(--primary)' }}>{v.caseId}</td>
                    <td style={{ fontWeight: 700 }}>{v.patName}</td>
                    <td className="font-mono">{fmtMoney(v.charge)}</td>
                    <td className="font-mono" style={{ color: '#059669', fontWeight: 700 }}>{fmtMoney(v.received)}</td>
                    <td className="font-mono" style={{ color: Number(v.due) > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: 700 }}>{fmtMoney(v.due)}</td>
                    <td>
                      <button className="cms-btn cms-btn-ghost" onClick={() => onNavigate('case', { familyId: v.familyId, patientId: v.patientId })} style={{ fontSize: '12px' }}>Open →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Patient Directory Tab */}
        {activeTab === 'patients' && (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead><tr><th>PATIENT ID</th><th>PATIENT NAME</th><th>FAMILY HEAD</th><th>AGE</th><th>AREA</th><th>DUE</th><th>ACTION</th></tr></thead>
              <tbody>
                {filtered(allPatients).length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No patients found</td></tr>
                ) : filtered(allPatients).map((p, i) => (
                  <tr key={i}>
                    <td className="font-mono" style={{ color: 'var(--primary)' }}>{p.id}</td>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td>{p.famHead}</td>
                    <td>{p.age || '—'}</td>
                    <td>{p.area || '—'}</td>
                    <td className="font-mono" style={{ color: Number(p.due) > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: 700 }}>
                      {fmtMoney(p.due || 0)}
                    </td>
                    <td>
                      <button className="cms-btn cms-btn-ghost" onClick={() => onNavigate('case', { familyId: p.famId, patientId: p.id })} style={{ fontSize: '12px' }}>Open →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dues Recovery Tab */}
        {activeTab === 'dues' && (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead><tr><th>PATIENT</th><th>FAMILY HEAD</th><th>PHONE</th><th>AREA</th><th>OUTSTANDING DUE</th><th>ACTION</th></tr></thead>
              <tbody>
                {filtered(allPatients.filter(p => (p.due || 0) > 0)).length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No outstanding dues 🎉</td></tr>
                ) : filtered(allPatients.filter(p => (p.due || 0) > 0)).map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td>{p.famHead}</td>
                    <td className="font-mono">{p.phone || '—'}</td>
                    <td>{p.area || '—'}</td>
                    <td className="font-mono" style={{ color: '#dc2626', fontWeight: 800 }}>{fmtMoney(p.due)}</td>
                    <td>
                      <button className="cms-btn cms-btn-ghost" onClick={() => onNavigate('case', { familyId: p.famId, patientId: p.id })} style={{ fontSize: '12px' }}>Collect →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
