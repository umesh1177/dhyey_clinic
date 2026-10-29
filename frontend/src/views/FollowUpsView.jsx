import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocalDB, saveLocalDB, showToast, uid, fmtDate, todayISO } from '../services/api';

export default function FollowUpsView({ onNavigate }) {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [followUps, setFollowUps] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [followUpDate, setFollowUpDate] = useState(todayISO());
  const [reason, setReason] = useState('Routine Checkup & Blood Test Review');

  useEffect(() => {
    loadFollowUps();
  }, [clinicId]);

  const loadFollowUps = () => {
    const db = getLocalDB(clinicId);
    setFollowUps(db.followUps || []);
  };

  const handleAddFollowUp = (e) => {
    e.preventDefault();
    if (!patientName.trim()) {
      showToast('Patient name is required', 'error');
      return;
    }

    const newFup = {
      id: `fup_${uid()}`,
      patientId: 'WALK-IN',
      patientName: patientName.trim().toUpperCase(),
      followUpDate,
      reason: reason.trim(),
      status: 'Pending',
    };

    const db = getLocalDB(clinicId);
    if (!db.followUps) db.followUps = [];
    db.followUps.unshift(newFup);
    saveLocalDB(clinicId, db);

    setFollowUps([newFup, ...followUps]);
    showToast(`Follow-up scheduled for ${newFup.patientName}`);
    setIsAdding(false);
    setPatientName('');
  };

  const toggleStatus = (id) => {
    const db = getLocalDB(clinicId);
    const item = (db.followUps || []).find((f) => f.id === id);
    if (item) {
      item.status = item.status === 'Completed' ? 'Pending' : 'Completed';
      saveLocalDB(clinicId, db);
      loadFollowUps();
      showToast(`Status updated to ${item.status}`);
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this follow-up reminder?')) return;
    const db = getLocalDB(clinicId);
    db.followUps = (db.followUps || []).filter((f) => f.id !== id);
    saveLocalDB(clinicId, db);
    setFollowUps(db.followUps);
    showToast('Follow-up deleted.');
  };

  return (
    <div className="cms-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
            <i className="fa-solid fa-calendar-check" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
            Patient Follow-ups &amp; Scheduled Appointments
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Schedule patient return dates, post-treatment reviews, and lab report follow-ups
          </p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          onClick={() => setIsAdding(!isAdding)}
        >
          <i className={`fa-solid ${isAdding ? 'fa-xmark' : 'fa-plus'}`}></i>
          {isAdding ? 'Close Form' : 'Schedule Follow-up'}
        </button>
      </div>

      {isAdding && (
        <div className="cms-card" style={{ marginBottom: '20px', border: '1.5px solid var(--primary)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: 'var(--primary)' }}>
            Schedule Follow-up Appointment
          </h3>
          <form onSubmit={handleAddFollowUp}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Patient Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="e.g. PATEL RAMESHBHAI"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Follow-up Date
                </label>
                <input
                  type="date"
                  className="cms-input"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Reason / Purpose
                </label>
                <input
                  type="text"
                  className="cms-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="cms-btn cms-btn-outline" onClick={() => setIsAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Save Follow-up
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="cms-card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: 'var(--text)' }}>
          Scheduled Follow-ups List ({followUps.length})
        </h3>

        {followUps.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No follow-ups currently scheduled.
          </div>
        ) : (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Scheduled Date</th>
                  <th>Patient Name</th>
                  <th>Reason / Clinical Purpose</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <span style={{ fontWeight: 700 }}>{fmtDate(f.followUpDate)}</span>
                    </td>
                    <td><strong>{f.patientName}</strong></td>
                    <td style={{ color: 'var(--text-muted)' }}>{f.reason}</td>
                    <td>
                      <span className={`cms-pill ${f.status === 'Completed' ? 'cms-badge-paid' : 'cms-badge-due'}`}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          onClick={() => toggleStatus(f.id)}
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        >
                          <i className={`fa-solid ${f.status === 'Completed' ? 'fa-rotate-left' : 'fa-check'}`}></i>
                          {f.status === 'Completed' ? 'Reopen' : 'Mark Done'}
                        </button>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost text-danger"
                          onClick={() => handleDelete(f.id)}
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
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
