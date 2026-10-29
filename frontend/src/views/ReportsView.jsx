import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getLocalDB,
  apiFetch,
  fmtDate,
  fmtMoney,
  todayISO,
} from '../services/api';

export default function ReportsView() {
  const { session, activeClinic } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [dateFilter, setDateFilter] = useState(todayISO());
  const [stats, setStats] = useState({
    totalFamilies: 0,
    totalPatients: 0,
    visitsCount: 0,
    dateCollection: 0,
    totalDue: 0,
    drCounts: {},
    diagCounts: {},
    areaCounts: {},
  });

  useEffect(() => {
    loadReportsData();
  }, [clinicId, dateFilter]);

  const loadReportsData = () => {
    const db = getLocalDB(clinicId);
    const allVisits = [];
    const allPats = [];

    Object.values(db.families || {}).forEach((f) => {
      Object.values(f.patients || {}).forEach((p) => {
        allPats.push(p);
        (p.visits || []).forEach((v) => {
          allVisits.push({ ...v, area: f.area, famHead: f.headName });
        });
      });
    });

    const targetVisits = dateFilter
      ? allVisits.filter((v) => v.date === dateFilter)
      : allVisits;

    const collection = targetVisits.reduce((acc, v) => acc + (Number(v.received) || 0), 0);
    const dueAll = allVisits.reduce((acc, v) => acc + (Number(v.due) || 0), 0);

    const drCounts = {};
    const diagCounts = {};
    const areaCounts = {};

    targetVisits.forEach((v) => {
      const dr = v.reference || 'Self';
      drCounts[dr] = (drCounts[dr] || 0) + 1;

      if (v.diagnosis) {
        diagCounts[v.diagnosis] = (diagCounts[v.diagnosis] || 0) + 1;
      }
    });

    Object.values(db.families || {}).forEach((f) => {
      const a = f.area || 'Unknown';
      areaCounts[a] = (areaCounts[a] || 0) + 1;
    });

    setStats({
      totalFamilies: Object.keys(db.families || {}).length,
      totalPatients: allPats.length,
      visitsCount: targetVisits.length,
      dateCollection: collection,
      totalDue: dueAll,
      drCounts,
      diagCounts,
      areaCounts,
    });

    // Attempt backend stats fetch
    apiFetch(`/reports/stats?date=${dateFilter}`).then((res) => {
      if (res && res.success && res.data) {
        setStats((prev) => ({ ...prev, ...res.data }));
      }
    }).catch(() => {});
  };

  return (
    <div className="cms-page-container">
      {/* Title & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
            <i className="fa-solid fa-chart-line" style={{ color: '#8b5cf6', marginRight: '8px' }}></i>
            Clinic Reports &amp; Clinical Analytics (F5)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Financial statistics, referring doctor trends, and diagnosis distribution
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted)' }}>Date:</label>
          <input
            type="date"
            className="cms-input"
            style={{ width: '150px' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          {dateFilter && (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => setDateFilter('')}
              style={{ fontSize: '12px' }}
            >
              Lifetime All Dates
            </button>
          )}
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => window.print()}
            style={{ fontSize: '12.5px' }}
          >
            <i className="fa-solid fa-print"></i> Print Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="cms-card cms-kpi-card">
          <div className="cms-kpi-header">
            <span className="cms-kpi-title">{dateFilter ? 'Selected Date Fees' : 'Total Revenue'}</span>
            <div className="cms-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <i className="fa-solid fa-indian-rupee-sign"></i>
            </div>
          </div>
          <div className="cms-kpi-value font-mono" style={{ color: '#059669' }}>
            {fmtMoney(stats.dateCollection)}
          </div>
          <div className="cms-kpi-sub">Received consultation charges</div>
        </div>

        <div className="cms-card cms-kpi-card">
          <div className="cms-kpi-header">
            <span className="cms-kpi-title">Visits Recorded</span>
            <div className="cms-kpi-icon" style={{ background: 'rgba(9, 92, 84, 0.1)', color: 'var(--primary)' }}>
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
          <div className="cms-kpi-value font-mono">{stats.visitsCount}</div>
          <div className="cms-kpi-sub">Completed consultations</div>
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
          <div className="cms-kpi-sub">Across all registered patients</div>
        </div>

        <div className="cms-card cms-kpi-card">
          <div className="cms-kpi-header">
            <span className="cms-kpi-title">Total Families</span>
            <div className="cms-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <i className="fa-solid fa-people-roof"></i>
            </div>
          </div>
          <div className="cms-kpi-value font-mono">{stats.totalFamilies}</div>
          <div className="cms-kpi-sub">{stats.totalPatients} registered members</div>
        </div>
      </div>

      {/* Reports Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Referring Doctor Trends */}
        <div className="cms-card">
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 12px', color: 'var(--text)' }}>
            <i className="fa-solid fa-user-doctor" style={{ color: 'var(--primary)', marginRight: '6px' }}></i>
            Referring Doctors Distribution
          </h3>
          {Object.keys(stats.drCounts || {}).length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No referral data for selected period.
            </div>
          ) : (
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Referring Doctor</th>
                  <th style={{ textAlign: 'right' }}>Patients Referred</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.drCounts).map(([dr, count]) => (
                  <tr key={dr}>
                    <td><strong>{dr}</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="cms-pill font-mono">{count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Diagnosis Trends */}
        <div className="cms-card">
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 12px', color: 'var(--text)' }}>
            <i className="fa-solid fa-heart-pulse" style={{ color: '#ef4444', marginRight: '6px' }}></i>
            Frequent Diagnoses Breakdown
          </h3>
          {Object.keys(stats.diagCounts || {}).length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No diagnosis data recorded for selected period.
            </div>
          ) : (
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Condition / Diagnosis</th>
                  <th style={{ textAlign: 'right' }}>Case Frequency</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.diagCounts).map(([diag, count]) => (
                  <tr key={diag}>
                    <td><strong>{diag}</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="cms-pill font-mono" style={{ background: 'rgba(9,92,84,0.1)', color: 'var(--primary)' }}>
                        {count} cases
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Area Patient Distribution */}
        <div className="cms-card">
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 12px', color: 'var(--text)' }}>
            <i className="fa-solid fa-location-dot" style={{ color: '#0b5ed7', marginRight: '6px' }}></i>
            Patient Locality &amp; Area Demographics
          </h3>
          {Object.keys(stats.areaCounts || {}).length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No area data available.
            </div>
          ) : (
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Area / Locality</th>
                  <th style={{ textAlign: 'right' }}>Families</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.areaCounts).map(([area, count]) => (
                  <tr key={area}>
                    <td><strong>{area}</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="cms-pill font-mono">{count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
