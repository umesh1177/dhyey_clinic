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

const DEFAULT_TEMPLATES = [
  { key: 'fitness', label: 'Medical Fitness Certificate (Fitness)' },
  { key: 'leave', label: 'Medical Sick Leave Certificate (Leave)' },
  { key: 'unfit', label: 'Medical Unfitness Certificate' },
];

export default function CertificatesView() {
  const { session, activeClinic } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [certificates, setCertificates] = useState([]);
  const [certTemplate, setCertTemplate] = useState('fitness');

  // Form State matching Screenshot 1
  const [certNo, setCertNo] = useState('CERT-2026-0003');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientName, setPatientName] = useState('PATEL RAMESHBHAI GOVINDBHAI');
  const [patientAge, setPatientAge] = useState('46');
  const [patientGender, setPatientGender] = useState('Male');
  const [diagnosis, setDiagnosis] = useState('Acute Viral Pyrexia');
  const [fromDate, setFromDate] = useState('2026-10-31');
  const [toDate, setToDate] = useState('2026-10-31');
  const [restDays, setRestDays] = useState(1);
  const [place, setPlace] = useState('Ahmedabad');

  const [filterQuery, setFilterQuery] = useState('');

  const docName = session?.profile?.name || 'Dr. Chirag Paghdal';
  const clinicName = activeClinic?.name || 'Dhyey Clinic & Nursing Home';
  const clinicAddress = 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat · Ph: 9876543210';

  const [customBody, setCustomBody] = useState(
    'This is to certify that {PATIENT_NAME}, aged {AGE}, has been examined by me. The patient has clinically recovered from {DIAGNOSIS} and is now found medically fit in all respects to resume normal daily duties.'
  );

  useEffect(() => {
    loadCertificates();
  }, [clinicId]);

  const loadCertificates = () => {
    const db = getLocalDB(clinicId);
    let list = db.certificates || [];
    if (list.length === 0) {
      list = [
        {
          certNo: 'CERT-2026-0001',
          patientName: 'PATEL RAMESHBHAI GOVINDBHAI',
          patientAge: '46',
          patientGender: 'Male',
          templateType: 'Medical Fitness Certificate',
          diagnosis: 'Acute Viral Pyrexia',
          validity: '31/10/2026 → 31/10/2026 (1d)',
          issuedDate: '31/10/2026',
          status: 'Issued',
        },
        {
          certNo: 'CERT-2026-0002',
          patientName: 'PATEL RAMESHBHAI GOVINDBHAI',
          patientAge: '46',
          patientGender: 'Male',
          templateType: 'Medical Fitness Certificate',
          diagnosis: 'Acute Viral Pyrexia',
          validity: '31/10/2026 → 31/10/2026 (1d)',
          issuedDate: '31/10/2026',
          status: 'Issued',
        },
      ];
    }
    setCertificates(list);
  };

  const handlePatientSelect = (p) => {
    setPatientName(p.name);
    setPatientAge(p.age || '46');
    setPatientGender(p.gender || 'Male');
    setPatientSearch(p.name);
  };

  const insertVariable = (varName) => {
    setCustomBody((prev) => prev + ` {${varName}}`);
  };

  const renderedPreviewBody = () => {
    return customBody
      .replace(/{PATIENT_NAME}/g, patientName || 'PATEL RAMESHBHAI GOVINDBHAI')
      .replace(/{AGE}/g, patientAge ? `${patientAge} Yrs` : '46 Yrs')
      .replace(/{DIAGNOSIS}/g, diagnosis || 'Acute Viral Pyrexia')
      .replace(/{FROM_DATE}/g, fmtDate(fromDate))
      .replace(/{TO_DATE}/g, fmtDate(toDate))
      .replace(/{REST_DAYS}/g, `${restDays}`)
      .replace(/{CERT_ID}/g, certNo)
      .replace(/{CLINIC_NAME}/g, clinicName);
  };

  const handleIssue = (e) => {
    e.preventDefault();
    const newCert = {
      certNo,
      patientName,
      patientAge,
      patientGender,
      templateType: certTemplate === 'fitness' ? 'Medical Fitness Certificate' : 'Medical Sick Leave Certificate',
      diagnosis,
      validity: `${fmtDate(fromDate)} → ${fmtDate(toDate)} (${restDays}d)`,
      issuedDate: '31/10/2026',
      status: 'Issued',
    };

    const updated = [newCert, ...certificates];
    setCertificates(updated);
    const db = getLocalDB(clinicId);
    db.certificates = updated;
    saveLocalDB(clinicId, db);
    showToast(`Medical Certificate ${certNo} issued!`);
    window.print();
  };

  const handleClear = () => {
    setPatientName('');
    setPatientAge('');
    setDiagnosis('');
    setPatientSearch('');
  };

  const handleDelete = (cNo) => {
    if (!window.confirm(`Delete certificate #${cNo}?`)) return;
    const updated = certificates.filter(c => c.certNo !== cNo);
    setCertificates(updated);
    const db = getLocalDB(clinicId);
    db.certificates = updated;
    saveLocalDB(clinicId, db);
    showToast('Certificate removed.');
  };

  return (
    <div className="cms-page-container" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* ── TOP BANNER (Screenshot 1) ── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-certificate" style={{ color: 'var(--primary)', fontSize: '20px' }} />
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 2px', color: 'var(--text)' }}>
              Medical Fitness &amp; Leave Certificates
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Issue official verifiable medical certificates with auto generated unique ID and custom templates
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            border: '1.5px dashed #0284c7', background: '#f0f9ff', color: '#0284c7',
            borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)'
          }}>
            NEXT CERT ID: {certNo}
          </div>
          <button
            type="button"
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
              borderRadius: '6px', padding: '6px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer'
            }}
          >
            + Add Digital Signature
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            style={{ fontSize: '12.5px', padding: '6px 14px', borderRadius: '6px', fontWeight: 700 }}
          >
            + Add Template
          </button>
          <button
            type="button"
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
              borderRadius: '6px', padding: '6px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer'
            }}
          >
            Verify Certificate
          </button>
        </div>
      </div>

      {/* ── TWO-COLUMN GENERATOR & LIVE PREVIEW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: Issue Medical Certificate Form */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-file-signature" style={{ color: 'var(--primary)' }} />
              <span>Issue Medical Certificate</span>
            </div>
            <span style={{
              background: '#e6f7f2', color: '#059669', borderRadius: '6px',
              padding: '2px 8px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)'
            }}>
              Unique ID: {certNo}
            </span>
          </div>

          {/* Dynamic Clinic Header Tag */}
          <div style={{
            background: 'rgba(9,92,84,0.06)', border: '1px solid rgba(9,92,84,0.15)',
            borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text)' }}>
              <strong>{clinicName}</strong> {clinicAddress.slice(0, 48)}...
            </div>
            <span style={{ background: 'var(--surface)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 700, color: 'var(--primary)' }}>
              Dynamic Clinic Header
            </span>
          </div>

          <form onSubmit={handleIssue} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Template Dropdown */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>SELECT CERTIFICATE TEMPLATE *</label>
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>+ New Template</span>
              </div>
              <select
                className="cms-input"
                style={{ height: '36px', fontSize: '12.5px' }}
                value={certTemplate}
                onChange={e => setCertTemplate(e.target.value)}
              >
                {DEFAULT_TEMPLATES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Quick Select & Patient Full Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  QUICK SELECT REGISTERED PATIENT
                </label>
                <input
                  type="text"
                  className="cms-input"
                  style={{ height: '34px', fontSize: '12px' }}
                  placeholder="Type name or ID to auto-fill..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  PATIENT FULL NAME *
                </label>
                <input
                  type="text"
                  className="cms-input"
                  style={{ height: '34px', fontSize: '12.5px', fontWeight: 700 }}
                  value={patientName}
                  onChange={e => setPatientName(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            {/* Age, Gender, Diagnosis */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>AGE</label>
                <input className="cms-input" style={{ height: '34px', fontSize: '12.5px' }} value={patientAge} onChange={e => setPatientAge(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>GENDER</label>
                <select className="cms-input" style={{ height: '34px', fontSize: '12.5px' }} value={patientGender} onChange={e => setPatientGender(e.target.value)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>MEDICAL DIAGNOSIS *</label>
                <input className="cms-input" style={{ height: '34px', fontSize: '12.5px' }} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} required />
              </div>
            </div>

            {/* From Date, To Date, Rest Days, Issue Place */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 110px', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>FROM DATE *</label>
                <input type="date" className="cms-input" style={{ height: '34px', fontSize: '12px' }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>TO DATE *</label>
                <input type="date" className="cms-input" style={{ height: '34px', fontSize: '12px' }} value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>REST DAYS</label>
                <input type="number" className="cms-input" style={{ height: '34px', fontSize: '12px', textAlign: 'center' }} value={restDays} onChange={e => setRestDays(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>ISSUE PLACE</label>
                <input className="cms-input" style={{ height: '34px', fontSize: '12px' }} value={place} onChange={e => setPlace(e.target.value)} />
              </div>
            </div>

            {/* Certificate Body Text with Variable Tags */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  CERTIFICATE BODY TEXT (LIVE EDITABLE • AUTO-FILLED)
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>↺ Reset to Template Default</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {['PATIENT_NAME', 'DIAGNOSIS', 'FROM_DATE', 'TO_DATE', 'REST_DAYS', 'CERT_ID', 'CLINIC_NAME'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    style={{
                      background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                      borderRadius: '4px', padding: '1px 6px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    +{`{${v}}`}
                  </button>
                ))}
              </div>
              <textarea
                className="cms-input"
                style={{ width: '100%', height: '80px', fontSize: '12px', resize: 'vertical' }}
                value={customBody}
                onChange={e => setCustomBody(e.target.value)}
              />
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '6px', padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Clear
              </button>
              <button
                type="submit"
                className="cms-btn cms-btn-primary"
                style={{ flex: 1, height: '38px', fontSize: '13px', fontWeight: 700, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-print" /> Issue &amp; Print Medical Certificate
                <kbd style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px', padding: '1px 6px', fontSize: '10.5px' }}>Enter</kbd>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Live Certificate Preview (A4 Formatted) */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-eye" style={{ color: 'var(--primary)' }} />
              <span>Live Certificate Preview (A4 Formatted)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>+ Add Digital Signature</span>
              <span style={{
                background: '#e6f7f2', color: '#059669', borderRadius: '6px',
                padding: '2px 8px', fontSize: '11px', fontWeight: 700
              }}>
                Verifiable
              </span>
            </div>
          </div>

          {/* A4 Sheet Box */}
          <div style={{
            background: '#fff', border: '1.5px solid #095c54', borderRadius: '10px',
            padding: '24px', minHeight: '440px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              {/* Sheet Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#095c54', margin: '0 0 4px' }}>
                  {clinicName}
                </h3>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {clinicAddress}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '10px', textDecoration: 'underline', letterSpacing: '0.5px' }}>
                  MEDICAL FITNESS CERTIFICATE
                </div>
              </div>

              {/* Certificate ID Pill */}
              <div style={{
                border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#f8fafc'
              }}>
                <span className="font-mono" style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  CERTIFICATE ID: {certNo}
                </span>
                <span style={{ border: '1px solid #059669', color: '#059669', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 800 }}>
                  VERIFIABLE
                </span>
              </div>

              {/* Body */}
              <p style={{ fontSize: '13px', lineHeight: 1.8, color: '#1e293b', textAlign: 'justify', margin: 0 }}>
                {renderedPreviewBody()}
              </p>
            </div>

            {/* Sheet Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '24px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                <div>Date of Issue: 31/10/2026</div>
                <div>Place of Issue: {place}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Security Verifiable Document</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontStyle: 'italic', fontSize: '13px', color: '#0369a1', fontFamily: 'serif' }}>
                  {docName}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  {docName}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  B.H.M.S. (Reg. No. G-9035)
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── BOTTOM CARD: ISSUED MEDICAL CERTIFICATES REGISTRY (Screenshot 2) ── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-folder-closed" style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Issued Medical Certificates Registry
            </h3>
            <span style={{ background: '#e6f7f2', color: '#059669', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
              {certificates.length} Issued
            </span>
          </div>

          <input
            type="text"
            className="cms-input"
            placeholder="Search by Certificate ID or Patient Name..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            style={{ width: '280px', height: '34px', fontSize: '12px', borderRadius: '6px' }}
          />
        </div>

        <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
          <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CERTIFICATE ID</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PATIENT NAME</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TEMPLATE / TYPE</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>MEDICAL DIAGNOSIS</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>VALIDITY PERIOD</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ISSUE DATE</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {certificates
                .filter(c => !filterQuery || c.patientName.toLowerCase().includes(filterQuery.toLowerCase()) || c.certNo.toLowerCase().includes(filterQuery.toLowerCase()))
                .map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '12px' }}>
                      <span className="font-mono" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '4px', padding: '2px 8px', fontSize: '11.5px', fontWeight: 700 }}>
                        {c.certNo}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 800, fontSize: '12.5px', color: 'var(--text)' }}>
                      {c.patientName} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>({c.patientAge || '46'}Y/{c.patientGender || 'Male'})</span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {c.templateType || 'Medical Fitness Certificate'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12.5px', color: 'var(--text)', fontWeight: 600 }}>
                      {c.diagnosis}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {c.validity || '31/10/2026 → 31/10/2026 (1d)'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {c.issuedDate || '31/10/2026'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ background: '#e6f7f2', color: '#059669', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                        ● Issued
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          <i className="fa-solid fa-print" /> Print
                        </button>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.certNo)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
