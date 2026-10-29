import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getLocalDB,
  saveLocalDB,
  apiFetch,
  todayISO,
  fmtDate,
  showToast,
  pad,
} from '../services/api';

export default function CertificatesView() {
  const { session, activeClinic } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [certificates, setCertificates] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [printingCert, setPrintingCert] = useState(null);

  // Form
  const [certNo, setCertNo] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [diagnosis, setDiagnosis] = useState('');
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [restDays, setRestDays] = useState(3);
  const [place, setPlace] = useState('Ahmedabad');
  const [customBody, setCustomBody] = useState('');

  useEffect(() => {
    loadCertificates();
  }, [clinicId]);

  useEffect(() => {
    // Recalc rest days
    if (fromDate && toDate) {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setRestDays(diffDays > 0 ? diffDays : 1);
    }
  }, [fromDate, toDate]);

  const loadCertificates = () => {
    const db = getLocalDB(clinicId);
    const list = db.certificates || [];
    setCertificates(list);

    const nextCount = list.length + 1;
    const year = new Date().getFullYear();
    setCertNo(`MC-${year}-${pad(nextCount, 4)}`);

    apiFetch('/certificates').then((res) => {
      if (res && res.success && res.data) {
        setCertificates(res.data);
      }
    }).catch(() => {});
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!patientName.trim() || !diagnosis.trim()) {
      showToast('Patient name and diagnosis are required.', 'error');
      return;
    }

    const docName = session?.profile?.name || 'Dr. Chirag Paghdal';
    const clinicName = activeClinic?.name || 'Dhyey Clinic & Hospital';

    const newCert = {
      certNo,
      patientName: patientName.trim().toUpperCase(),
      patientAge: patientAge.trim(),
      patientGender,
      diagnosis: diagnosis.trim(),
      fromDate,
      toDate,
      restDays: Number(restDays),
      doctorName: docName,
      clinicName,
      issuedDate: todayISO(),
      place,
      customBody,
    };

    const db = getLocalDB(clinicId);
    if (!db.certificates) db.certificates = [];
    db.certificates.unshift(newCert);
    saveLocalDB(clinicId, db);

    setCertificates([newCert, ...certificates]);
    showToast(`Medical Certificate #${certNo} generated!`);

    apiFetch('/certificates', {
      method: 'POST',
      body: newCert,
    }).catch(() => {});

    setIsCreating(false);
    setPrintingCert(newCert);

    // Reset Form
    setPatientName('');
    setPatientAge('');
    setDiagnosis('');
    const year = new Date().getFullYear();
    setCertNo(`MC-${year}-${pad(certificates.length + 2, 4)}`);
  };

  const handleDelete = (cNo) => {
    if (!window.confirm(`Delete certificate #${cNo}?`)) return;
    const db = getLocalDB(clinicId);
    db.certificates = (db.certificates || []).filter((c) => c.certNo !== cNo);
    saveLocalDB(clinicId, db);
    setCertificates(db.certificates);
    showToast('Certificate deleted.');
    apiFetch(`/certificates/${cNo}`, { method: 'DELETE' }).catch(() => {});
  };

  return (
    <div className="cms-page-container">
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
            <i className="fa-solid fa-certificate" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
            Medical Certificates &amp; Fitness Leaves (F6)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Issue authentic medical fitness and sick leave certificates with verification codes
          </p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          onClick={() => setIsCreating(!isCreating)}
        >
          <i className={`fa-solid ${isCreating ? 'fa-xmark' : 'fa-plus'}`}></i>
          {isCreating ? 'Close Generator' : 'Generate Certificate (F6)'}
        </button>
      </div>

      {/* Generator Form */}
      {isCreating && (
        <div className="cms-card" style={{ marginBottom: '24px', border: '1.5px solid #f59e0b' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: '#b45309' }}>
            New Medical Certificate Entry
          </h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Certificate Number
                </label>
                <input
                  type="text"
                  className="cms-input font-mono"
                  value={certNo}
                  onChange={(e) => setCertNo(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Patient Full Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="e.g. PATEL RAMESHBHAI"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value.toUpperCase())}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Age / Gender
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="cms-input"
                    placeholder="Age (Y)"
                    style={{ width: '80px' }}
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                  />
                  <select
                    className="cms-input"
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Diagnosis / Illness <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="e.g. Acute Viral Pyrexia, Bronchitis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Leave / Rest Period
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="date"
                    className="cms-input"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    className="cms-input"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Computed Rest Days
                </label>
                <input
                  type="number"
                  className="cms-input font-mono"
                  value={restDays}
                  onChange={(e) => setRestDays(e.target.value)}
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Place of Issue
                </label>
                <input
                  type="text"
                  className="cms-input"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="cms-btn cms-btn-outline" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                <i className="fa-solid fa-print"></i> Generate &amp; Print Letter
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Certificates Table */}
      <div className="cms-card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: 'var(--text)' }}>
          Issued Certificates History ({certificates.length})
        </h3>

        {certificates.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No medical certificates issued yet.
          </div>
        ) : (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Cert #</th>
                  <th>Patient Name</th>
                  <th>Age / Sex</th>
                  <th>Diagnosis</th>
                  <th>Leave Period</th>
                  <th>Days</th>
                  <th>Issued Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.certNo}>
                    <td>
                      <span className="cms-pill font-mono" style={{ fontSize: '12px', fontWeight: 700 }}>
                        {c.certNo}
                      </span>
                    </td>
                    <td>
                      <strong>{c.patientName}</strong>
                    </td>
                    <td>{c.patientAge ? `${c.patientAge} Y` : '-'} · {c.patientGender || '-'}</td>
                    <td>{c.diagnosis}</td>
                    <td>{fmtDate(c.fromDate)} to {fmtDate(c.toDate)}</td>
                    <td>
                      <span className="cms-pill" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                        {c.restDays} days
                      </span>
                    </td>
                    <td>{fmtDate(c.issuedDate)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="cms-btn cms-btn-primary"
                          onClick={() => setPrintingCert(c)}
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        >
                          <i className="fa-solid fa-print"></i> Print
                        </button>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost text-danger"
                          onClick={() => handleDelete(c.certNo)}
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

      {/* Printable Certificate Modal */}
      {printingCert && (
        <div className="cms-modal-backdrop" style={{ zIndex: 10000 }}>
          <div
            className="cms-modal-content"
            style={{
              width: '95%',
              maxWidth: '680px',
              background: '#ffffff',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            }}
          >
            <div
              className="no-print"
              style={{
                padding: '12px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Print Certificate Preview</strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => window.print()} style={{ padding: '6px 14px' }}>
                  <i className="fa-solid fa-print"></i> Print Letter
                </button>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setPrintingCert(null)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div
              className="cms-print-area"
              style={{
                padding: '36px 40px',
                color: '#1e293b',
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1.8,
              }}
            >
              {/* Letterhead */}
              <div style={{ textAlign: 'center', borderBottom: '2.5px solid #095c54', paddingBottom: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#095c54' }}>
                  {activeClinic?.name || 'DHYEY CLINIC & HOSPITAL'}
                </div>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  {activeClinic?.address || '101, Medical Enclave, CG Road, Ahmedabad'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Phone: {activeClinic?.phone || '9876543210'} · Reg #{session?.profile?.regNo || 'GUJ-MED-2026-001'}
                </div>
              </div>

              {/* Title & Ref */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '12.5px' }}>
                <span className="font-mono"><strong>Ref:</strong> {printingCert.certNo}</span>
                <span><strong>Date:</strong> {fmtDate(printingCert.issuedDate)}</span>
              </div>

              <div style={{ textAlign: 'center', margin: '20px 0 28px' }}>
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    borderBottom: '2px solid #1e293b',
                    paddingBottom: '4px',
                  }}
                >
                  Medical Certificate
                </span>
              </div>

              {/* Body */}
              <p style={{ fontSize: '14.5px', textIndent: '30px', textAlign: 'justify', margin: '0 0 20px' }}>
                This is to certify that <strong>{printingCert.patientName}</strong>, aged{' '}
                <strong>{printingCert.patientAge || '—'} years</strong>, {printingCert.patientGender}, is under my medical treatment for{' '}
                <strong>{printingCert.diagnosis}</strong>.
              </p>

              <p style={{ fontSize: '14.5px', textIndent: '30px', textAlign: 'justify', margin: '0 0 24px' }}>
                In my professional opinion, the patient has been advised complete rest and absence from duty / studies for a period of{' '}
                <strong>{printingCert.restDays} days</strong>, from{' '}
                <strong>{fmtDate(printingCert.fromDate)}</strong> to <strong>{fmtDate(printingCert.toDate)}</strong>.
              </p>

              <p style={{ fontSize: '14.5px', textIndent: '30px', textAlign: 'justify', margin: '0 0 36px' }}>
                The patient is making satisfactory recovery and is declared fit to resume normal duties with effect from{' '}
                <strong>{fmtDate(printingCert.toDate)}</strong>.
              </p>

              {/* Signature */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '48px' }}>
                <div>
                  <div style={{ fontSize: '12.5px' }}><strong>Place:</strong> {printingCert.place || 'Ahmedabad'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Verification: /api/certificates/verify/{printingCert.certNo}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', marginBottom: '6px' }}></div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{printingCert.doctorName}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {session?.profile?.degree || 'B.H.M.S.'} · Reg #{session?.profile?.regNo || 'G-9035'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
