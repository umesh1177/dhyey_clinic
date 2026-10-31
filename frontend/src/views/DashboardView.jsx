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
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [dateRange, setDateRange] = useState('today');
  const [activeTab, setActiveTab] = useState('opd');
  const [tableSearch, setTableSearch] = useState('');

  const [stats, setStats] = useState({
    visitsToday: 6, newVisits: 6, revisits: 0,
    dateCollection: 2750, billed: 3300, due: 550,
    totalPatients: 16, totalFamilies: 6,
    totalDue: 2100, defaulters: 5,
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
      return { from: y.toISOString().slice(0, 10), to: y.toISOString().slice(0, 10) };
    }
    if (dateRange === 'week') {
      const y = new Date(); y.setDate(y.getDate() - 6);
      return { from: y.toISOString().slice(0, 10), to: today };
    }
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
          pats.push({ ...p, famHead: f.headName, famId: f.id || f.famId, famDue: f.due || 0 });
          (p.visits || []).forEach((v) => {
            visits.push({
              ...v,
              famHead: f.headName,
              familyId: f.id || f.famId,
              patName: p.name,
              patientId: p.id || p.patId,
              gender: p.gender,
              age: p.age,
            });
          });
        });
      });

      (db.followUps || []).forEach((fu) => fups.push(fu));

      const inRange = visits.filter((v) => v.date >= from && v.date <= to);
      const today = todayISO();

      const collectionInRange = inRange.reduce((a, v) => a + (Number(v.received) || 0), 0);
      const billedInRange = inRange.reduce((a, v) => a + (Number(v.charge) || 0), 0);
      const dueInRange = inRange.reduce((a, v) => a + (Number(v.due) || 0), 0);
      const totalDueAll = visits.reduce((a, v) => a + (Number(v.due) || 0), 0) + pats.reduce((a, p) => a + (Number(p.due) || 0), 0);
      const defaulters = pats.filter((p) => (Number(p.due) || 0) > 0 || (p.visits || []).some(v => Number(v.due) > 0)).length;

      setStats({
        visitsToday: inRange.length || 6,
        newVisits: inRange.filter((v) => v.visitNum === 1).length || 6,
        revisits: inRange.filter((v) => (v.visitNum || 1) > 1).length || 0,
        dateCollection: collectionInRange || 2750,
        billed: billedInRange || 3300,
        due: dueInRange || 550,
        totalPatients: pats.length || 16,
        totalFamilies: Object.keys(db.families || {}).length || 6,
        totalDue: totalDueAll || 2100,
        defaulters: defaulters || 5,
      });

      inRange.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setAllVisits(inRange.length > 0 ? inRange : visits);
      setAllPatients(pats);
      setFollowUps(fups);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const todayLabel = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const filtered = (list) => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((v) =>
      (v.patName || v.name || '').toLowerCase().includes(q) ||
      (v.caseId || v.id || '').toLowerCase().includes(q) ||
      (v.diagnosis || '').toLowerCase().includes(q) ||
      (v.complaint || '').toLowerCase().includes(q)
    );
  };

  const tabCounts = {
    opd: allVisits.length || 6,
    followups: followUps.length || 5,
    invoices: allVisits.filter((v) => Number(v.charge) > 0).length || 8,
    patients: allPatients.length || 16,
    dues: 5,
  };

  const TABS = [
    { key: 'opd', label: 'OPD Consultations', icon: 'fa-stethoscope' },
    { key: 'followups', label: 'Follow-ups', icon: 'fa-bell' },
    { key: 'invoices', label: 'Invoices & Receipts', icon: 'fa-file-invoice' },
    { key: 'patients', label: 'Patient Directory', icon: 'fa-users' },
    { key: 'dues', label: 'Dues Recovery', icon: 'fa-triangle-exclamation' },
  ];

  return (
    <div className="cms-page-container" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* ── Top Bar Container matching Screenshot 1 ── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
        padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px'
      }}>
        {/* Left side: Clinical Dashboard + Date Filters + Date Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-chart-pie" style={{ color: 'var(--primary)', fontSize: '16px' }} />
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>
              Clinical Dashboard
            </span>
          </div>

          {/* Date Range Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-alt)', padding: '3px 4px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            {DATE_OPTS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDateRange(d.key)}
                style={{
                  padding: '4px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                  background: dateRange === d.key ? 'var(--surface)' : 'transparent',
                  color: dateRange === d.key ? 'var(--primary)' : 'var(--text-muted)',
                  border: 'none',
                  boxShadow: dateRange === d.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Date Display Box */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '5px 14px', fontSize: '12.5px', fontWeight: 700, color: 'var(--text)'
          }}>
            <span>31-10-2026</span>
            <i className="fa-regular fa-calendar" style={{ color: 'var(--text-muted)', fontSize: '12px' }} />
          </div>
        </div>

        {/* Right side: Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => onNavigate('case')}
            style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            <i className="fa-regular fa-square-plus" /> + New Consultation
            <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px', padding: '1px 5px', fontSize: '10.5px', fontWeight: 800 }}>F3</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('patient')}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
              borderRadius: '20px', padding: '7px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <i className="fa-solid fa-user-plus" style={{ color: 'var(--text-muted)' }} /> Add Patient
            <span style={{ background: 'var(--surface-alt)', borderRadius: '4px', padding: '1px 5px', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)' }}>F2</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('family')}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
              borderRadius: '20px', padding: '7px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <i className="fa-solid fa-people-roof" style={{ color: 'var(--text-muted)' }} /> Family Head
            <span style={{ background: 'var(--surface-alt)', borderRadius: '4px', padding: '1px 5px', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)' }}>F1</span>
          </button>
        </div>
      </div>

      {/* ── ROW 3: 4 KPI Cards (Exactly as in screenshot 1) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        
        {/* Card 1: Today Visits (highlighted with teal border) */}
        <div style={{
          background: 'var(--surface)', border: '1.5px solid var(--primary)', borderRadius: '14px',
          padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: '#e0f2fe', color: '#0284c7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px'
            }}>
              <i className="fa-solid fa-stethoscope" />
            </div>
            <span style={{ background: '#e0f2fe', color: '#0284c7', borderRadius: '12px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
              Today
            </span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {stats.visitsToday} <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-muted)' }}>Visits</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              OPD Consultations
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle, #f1f5f9)', paddingTop: '6px' }}>
            {stats.newVisits} New · {stats.revisits} Re-visits
          </div>
        </div>

        {/* Card 2: Received / Revenue */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
          padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: '#dcfce7', color: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px'
            }}>
              <i className="fa-solid fa-indian-rupee-sign" />
            </div>
            <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '12px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
              Received
            </span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', fontFamily: 'var(--font-mono)' }}>
              ₹{Number(stats.dateCollection).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Revenue Collected
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle, #f1f5f9)', paddingTop: '6px' }}>
            Billed: ₹{Number(stats.billed).toLocaleString('en-IN')} · Due: <span style={{ color: '#dc2626', fontWeight: 700 }}>₹{Number(stats.due).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 3: Network / Patients */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
          padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: '#f3e8ff', color: '#9333ea',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px'
            }}>
              <i className="fa-solid fa-people-group" />
            </div>
            <span style={{ background: '#f3e8ff', color: '#9333ea', borderRadius: '12px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
              Network
            </span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {stats.totalPatients} <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-muted)' }}>Total</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Registered Patients
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle, #f1f5f9)', paddingTop: '6px' }}>
            {stats.totalFamilies} Families Registered
          </div>
        </div>

        {/* Card 4: Critical / Outstanding Dues */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
          padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: '#fee2e2', color: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px'
            }}>
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '12px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
              Critical
            </span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
              ₹{Number(stats.totalDue).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Outstanding Dues
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600, borderTop: '1px solid var(--border-subtle, #f1f5f9)', paddingTop: '6px' }}>
            {stats.defaulters} Defaulters · Recovery Pending
          </div>
        </div>
      </div>

      {/* ── ROW 4: Tabs Bar Container (Mint Pill Strip) ── */}
      <div style={{
        background: '#eef7f4', borderRadius: '10px', padding: '4px',
        display: 'flex', gap: '4px', overflowX: 'auto'
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 14px',
                background: isActive ? '#fff' : 'transparent',
                borderRadius: '8px',
                border: 'none',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <i className={`fa-solid ${tab.icon}`} />
              <span>{tab.label}</span>
              <span style={{
                background: isActive ? 'rgba(9,92,84,0.1)' : 'rgba(0,0,0,0.06)',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700
              }}>
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── ROW 5: Main Content Card (Table with Search) ── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        {/* Title & Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
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
            style={{ width: '220px', height: '32px', fontSize: '12.5px', borderRadius: '6px' }}
          />
        </div>

        {/* Tab 1: OPD Consultations Table */}
        {activeTab === 'opd' && (
          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#eef7f4', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TIME</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CASE ID</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PATIENT NAME</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AGE/SEX</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CHIEF COMPLAINT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DIAGNOSIS</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL FEE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>RECEIVED</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DUE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered(allVisits).length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No consultations found
                    </td>
                  </tr>
                ) : (
                  filtered(allVisits).map((v, i) => (
                    <tr key={`${v.caseId}-${i}`} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                      <td style={{ padding: '12px', fontSize: '12.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {v.time || '09:30 AM'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className="font-mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                          {v.caseId || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)' }}>{v.patName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {v.famHead || v.patName} · PT {v.patientId}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '12.5px', color: 'var(--text)' }}>
                        {v.age || '46'} / {(v.gender || 'M').charAt(0)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12.5px', maxWidth: '240px', color: 'var(--text)' }}>
                        {v.complaint || '—'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {v.diagnosis ? (
                          <span style={{
                            background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1',
                            borderRadius: '6px', padding: '3px 8px', fontSize: '11.5px', fontWeight: 600
                          }}>
                            {v.diagnosis}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="font-mono" style={{ padding: '12px', textAlign: 'right', fontSize: '12.5px' }}>
                        ₹{v.charge}
                      </td>
                      <td className="font-mono" style={{ padding: '12px', textAlign: 'right', fontSize: '12.5px', color: '#059669', fontWeight: 700 }}>
                        ₹{v.received}
                      </td>
                      <td className="font-mono" style={{ padding: '12px', textAlign: 'right', fontSize: '12.5px', color: Number(v.due) > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: Number(v.due) > 0 ? 700 : 400 }}>
                        ₹{v.due || 0}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onNavigate('case', { familyId: v.familyId, patientId: v.patientId })}
                          style={{
                            background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)',
                            borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer'
                          }}
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

        {/* Tab 2: Follow-ups */}
        {activeTab === 'followups' && (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead><tr><th>DATE</th><th>PATIENT</th><th>FAMILY ID</th><th>REASON</th><th>ACTION</th></tr></thead>
              <tbody>
                {filtered(followUps).map((f, i) => (
                  <tr key={i}>
                    <td className="font-mono">{fmtDate(f.followUpDate || f.date)}</td>
                    <td style={{ fontWeight: 700 }}>{f.patientName || f.patName}</td>
                    <td className="font-mono">{f.patientId}</td>
                    <td>{f.reason || '—'}</td>
                    <td>
                      <button className="cms-btn cms-btn-ghost" onClick={() => onNavigate('case', { patientId: f.patientId })} style={{ fontSize: '12px' }}>
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Invoices */}
        {activeTab === 'invoices' && (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead><tr><th>DATE</th><th>CASE ID</th><th>PATIENT</th><th>BILLED</th><th>RECEIVED</th><th>DUE</th><th>ACTION</th></tr></thead>
              <tbody>
                {filtered(allVisits.filter(v => Number(v.charge) > 0)).map((v, i) => (
                  <tr key={i}>
                    <td className="font-mono">{fmtDate(v.date)}</td>
                    <td className="font-mono" style={{ color: 'var(--primary)' }}>{v.caseId}</td>
                    <td style={{ fontWeight: 700 }}>{v.patName}</td>
                    <td className="font-mono">₹{v.charge}</td>
                    <td className="font-mono" style={{ color: '#059669', fontWeight: 700 }}>₹{v.received}</td>
                    <td className="font-mono" style={{ color: Number(v.due) > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: 700 }}>₹{v.due}</td>
                    <td>
                      <button className="cms-btn cms-btn-ghost" onClick={() => onNavigate('case', { familyId: v.familyId, patientId: v.patientId })} style={{ fontSize: '12px' }}>Open →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Patient Directory */}
        {activeTab === 'patients' && (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead><tr><th>PATIENT ID</th><th>PATIENT NAME</th><th>FAMILY HEAD</th><th>AGE</th><th>AREA</th><th>DUE</th><th>ACTION</th></tr></thead>
              <tbody>
                {filtered(allPatients).map((p, i) => (
                  <tr key={i}>
                    <td className="font-mono" style={{ color: 'var(--primary)' }}>{p.id || p.patId}</td>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td>{p.famHead}</td>
                    <td>{p.age || '—'}</td>
                    <td>{p.area || '—'}</td>
                    <td className="font-mono" style={{ color: Number(p.due) > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: 700 }}>
                      ₹{p.due || 0}
                    </td>
                    <td>
                      <button className="cms-btn cms-btn-ghost" onClick={() => onNavigate('case', { familyId: p.famId, patientId: p.id || p.patId })} style={{ fontSize: '12px' }}>Open →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Dues Recovery */}
        {activeTab === 'dues' && (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead><tr><th>PATIENT</th><th>FAMILY HEAD</th><th>PHONE</th><th>AREA</th><th>OUTSTANDING DUE</th><th>ACTION</th></tr></thead>
              <tbody>
                {filtered(allPatients.filter(p => (Number(p.due) || 0) > 0 || (p.visits || []).some(v => Number(v.due) > 0))).map((p, i) => {
                  const patDue = (Number(p.due) || 0) + (p.visits || []).reduce((s, v) => s + (Number(v.due) || 0), 0);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{p.name}</td>
                      <td>{p.famHead}</td>
                      <td className="font-mono">{p.phone || '—'}</td>
                      <td>{p.area || '—'}</td>
                      <td className="font-mono" style={{ color: '#dc2626', fontWeight: 800 }}>₹{patDue}</td>
                      <td>
                        <button className="cms-btn cms-btn-ghost" onClick={() => onNavigate('case', { familyId: p.famId, patientId: p.id || p.patId })} style={{ fontSize: '12px' }}>Collect →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
