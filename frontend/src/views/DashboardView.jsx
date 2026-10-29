import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getLocalDB, fmtMoney, fmtDate, todayISO } from '../services/api';

export default function DashboardView({ onNavigate }) {
  const { session, activeClinic } = useAuth();
  const [stats, setStats] = useState({
    visitsToday: 0,
    dateCollection: 0,
    totalDue: 0,
    totalPatients: 0,
    totalFamilies: 0,
  });
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  const clinicId = session?.profile?.activeClinicId || 'demo';

  useEffect(() => {
    loadDashboardData();
  }, [clinicId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const db = getLocalDB(clinicId);
      const allPats = [];
      const allVisits = [];

      Object.values(db.families || {}).forEach((f) => {
        Object.values(f.patients || {}).forEach((p) => {
          allPats.push({ ...p, famHead: f.headName, famId: f.id });
          (p.visits || []).forEach((v) => {
            allVisits.push({
              ...v,
              famHead: f.headName,
              familyId: f.id,
              patName: p.name,
              patientId: p.id,
              gender: p.gender,
              age: p.age,
            });
          });
        });
      });

      const today = todayISO();
      const todayVisits = allVisits.filter((v) => v.date === today);
      const collectionToday = todayVisits.reduce((acc, v) => acc + (Number(v.received) || 0), 0);
      const totalDueAll = allVisits.reduce((acc, v) => acc + (Number(v.due) || 0), 0);

      setStats({
        visitsToday: todayVisits.length,
        dateCollection: collectionToday,
        totalDue: totalDueAll,
        totalPatients: allPats.length,
        totalFamilies: Object.keys(db.families || {}).length,
      });

      // Sort visits descending
      allVisits.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      setRecentVisits(allVisits.slice(0, 10));

      // Attempt async backend fetch for aggregated stats
      apiFetch('/reports/stats').then((res) => {
        if (res && res.success && res.data) {
          const d = res.data;
          setStats((prev) => ({
            ...prev,
            visitsToday: d.visitsCount ?? prev.visitsToday,
            dateCollection: d.dateCollection ?? prev.dateCollection,
            totalDue: d.totalDue ?? prev.totalDue,
            totalPatients: d.totalPatients ?? prev.totalPatients,
            totalFamilies: d.totalFamilies ?? prev.totalFamilies,
          }));
        }
      }).catch(() => {});
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cms-page-container">
      {/* Welcome Banner */}
      <div
        className="cms-card"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          color: '#ffffff',
          padding: '24px',
          marginBottom: '20px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>
            Good day, Dr. {session?.profile?.name || 'Doctor'}
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '13.5px' }}>
            Active at <strong>{activeClinic?.name || 'Clinic'}</strong> · Today's OPD queue is active.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="cms-btn"
            onClick={() => onNavigate('case')}
            style={{ background: '#ffffff', color: 'var(--primary)', fontWeight: 700 }}
          >
            <i className="fa-solid fa-notes-medical"></i> Quick Consultation (F3)
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="cms-card cms-kpi-card">
          <div className="cms-kpi-header">
            <span className="cms-kpi-title">Today's OPD Visits</span>
            <div className="cms-kpi-icon" style={{ background: 'rgba(9, 92, 84, 0.1)', color: 'var(--primary)' }}>
              <i className="fa-solid fa-user-clock"></i>
            </div>
          </div>
          <div className="cms-kpi-value font-mono">{stats.visitsToday}</div>
          <div className="cms-kpi-sub">Registered patients today</div>
        </div>

        <div className="cms-card cms-kpi-card">
          <div className="cms-kpi-header">
            <span className="cms-kpi-title">Today's Collection</span>
            <div className="cms-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <i className="fa-solid fa-indian-rupee-sign"></i>
            </div>
          </div>
          <div className="cms-kpi-value font-mono" style={{ color: '#059669' }}>
            {fmtMoney(stats.dateCollection)}
          </div>
          <div className="cms-kpi-sub">Total received fees</div>
        </div>

        <div className="cms-card cms-kpi-card">
          <div className="cms-kpi-header">
            <span className="cms-kpi-title">Outstanding Dues</span>
            <div className="cms-kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <i className="fa-solid fa-receipt"></i>
            </div>
          </div>
          <div className="cms-kpi-value font-mono" style={{ color: stats.totalDue > 0 ? '#dc2626' : 'var(--text)' }}>
            {fmtMoney(stats.totalDue)}
          </div>
          <div className="cms-kpi-sub">Pending patient balances</div>
        </div>

        <div className="cms-card cms-kpi-card">
          <div className="cms-kpi-header">
            <span className="cms-kpi-title">Total Patients</span>
            <div className="cms-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
          <div className="cms-kpi-value font-mono">{stats.totalPatients}</div>
          <div className="cms-kpi-sub">Across {stats.totalFamilies} families</div>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
          Quick Operational Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
          <button
            type="button"
            className="cms-card cms-action-tile"
            onClick={() => onNavigate('family')}
            style={{ cursor: 'pointer', textAlign: 'left', padding: '16px' }}
          >
            <i className="fa-solid fa-people-roof" style={{ fontSize: '22px', color: 'var(--primary)', marginBottom: '8px' }}></i>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>New Family (F1)</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Register family head</div>
          </button>

          <button
            type="button"
            className="cms-card cms-action-tile"
            onClick={() => onNavigate('patient')}
            style={{ cursor: 'pointer', textAlign: 'left', padding: '16px' }}
          >
            <i className="fa-solid fa-user-plus" style={{ fontSize: '22px', color: '#0b5ed7', marginBottom: '8px' }}></i>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>Add Member (F2)</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Enroll family patient</div>
          </button>

          <button
            type="button"
            className="cms-card cms-action-tile"
            onClick={() => onNavigate('case')}
            style={{ cursor: 'pointer', textAlign: 'left', padding: '16px' }}
          >
            <i className="fa-solid fa-clipboard-user" style={{ fontSize: '22px', color: '#10b981', marginBottom: '8px' }}></i>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>Patient Record (F3)</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>OPD case &amp; diagnosis</div>
          </button>

          <button
            type="button"
            className="cms-card cms-action-tile"
            onClick={() => onNavigate('certificates')}
            style={{ cursor: 'pointer', textAlign: 'left', padding: '16px' }}
          >
            <i className="fa-solid fa-certificate" style={{ fontSize: '22px', color: '#f59e0b', marginBottom: '8px' }}></i>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>Certificates (F6)</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Fitness &amp; leave letters</div>
          </button>

          <button
            type="button"
            className="cms-card cms-action-tile"
            onClick={() => onNavigate('reports')}
            style={{ cursor: 'pointer', textAlign: 'left', padding: '16px' }}
          >
            <i className="fa-solid fa-chart-line" style={{ fontSize: '22px', color: '#8b5cf6', marginBottom: '8px' }}></i>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>Reports (F5)</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Financial &amp; clinical stats</div>
          </button>
        </div>
      </div>

      {/* Today's / Recent Visits Queue Table */}
      <div className="cms-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
              Recent Consultations &amp; Patient Queue
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Showing latest clinical visits across the clinic
            </p>
          </div>
          <button type="button" className="cms-btn cms-btn-outline" onClick={loadDashboardData}>
            <i className="fa-solid fa-rotate"></i> Refresh
          </button>
        </div>

        {recentVisits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '32px', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
            No consultation visits recorded yet for this clinic.
          </div>
        ) : (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Time / Date</th>
                  <th>Case ID</th>
                  <th>Patient Name</th>
                  <th>Family Head</th>
                  <th>Diagnosis</th>
                  <th>Charge</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map((v, i) => (
                  <tr key={`${v.caseId}-${i}`}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{v.time || 'OPD'}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtDate(v.date)}</div>
                    </td>
                    <td>
                      <span className="cms-pill font-mono" style={{ fontSize: '11px' }}>
                        #{v.caseId}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{v.patName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {v.age ? `${v.age} Y` : ''} {v.gender || ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px' }}>{v.famHead}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-dark, #334155)' }}>
                        {v.diagnosis || 'General Checkup'}
                      </span>
                    </td>
                    <td className="font-mono">{fmtMoney(v.charge)}</td>
                    <td className="font-mono" style={{ color: '#059669', fontWeight: 600 }}>
                      {fmtMoney(v.received)}
                    </td>
                    <td className="font-mono">
                      {Number(v.due) > 0 ? (
                        <span className="cms-pill cms-badge-due">{fmtMoney(v.due)}</span>
                      ) : (
                        <span className="cms-pill cms-badge-paid">Paid</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        onClick={() => onNavigate('case', { familyId: v.familyId, patientId: v.patientId })}
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        <i className="fa-solid fa-folder-open"></i> Open Case
                      </button>
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
