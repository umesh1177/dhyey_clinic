import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  apiFetch,
  todayISO,
  fmtDate,
  showToast,
  pad,
} from '../services/api';

const DEFAULT_TEMPLATES = [
  { key: 'fitness', label: 'Medical Fitness Certificate (Fitness)', heading: 'MEDICAL FITNESS CERTIFICATE', body: 'This is to certify that {PATIENT_NAME}, aged {AGE}, has been examined by me. The patient has clinically recovered from {DIAGNOSIS} and is now found medically fit in all respects to resume normal daily duties.' },
  { key: 'leave', label: 'Medical Sick Leave Certificate (Leave)', heading: 'MEDICAL SICK LEAVE CERTIFICATE', body: 'This is to certify that {PATIENT_NAME}, aged {AGE}, is suffering from {DIAGNOSIS} and has been advised complete rest for {REST_DAYS} days from {FROM_DATE} to {TO_DATE}.' },
  { key: 'unfit', label: 'Medical Unfitness Certificate', heading: 'MEDICAL UNFITNESS CERTIFICATE', body: 'This is to certify that {PATIENT_NAME}, aged {AGE}, has been examined and is found temporarily unfit for duties due to {DIAGNOSIS}.' },
];

export default function CertificatesView() {
  const { session, activeClinic } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [certificates, setCertificates] = useState([]);
  const [certTemplate, setCertTemplate] = useState('fitness');
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);

  // Modal states
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' | 'upload'
  const [signatureImg, setSignatureImg] = useState(() => localStorage.getItem('doctor_digital_signature') || null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplCategory, setNewTplCategory] = useState('Sickness / Leave');
  const [newTplHeading, setNewTplHeading] = useState('MEDICAL CERTIFICATE');
  const [newTplBody, setNewTplBody] = useState(
    'This is to certify that {PATIENT_NAME} has been treated for {DIAGNOSIS} from {FROM_DATE} to {TO_DATE}...'
  );

  // Form State
  const [certNo, setCertNo] = useState(`CERT-${new Date().getFullYear()}-0001`);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [diagnosis, setDiagnosis] = useState('');
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [restDays, setRestDays] = useState(1);
  const [place, setPlace] = useState('Ahmedabad');

  const [filterQuery, setFilterQuery] = useState('');
  const [certPage, setCertPage] = useState(1);
  const [certPerPage, setCertPerPage] = useState(5);

  const docName = session?.profile?.name || 'Dr. Chirag Paghdal';
  const clinicName = activeClinic?.name || 'Dhyey Clinic & Nursing Home';
  const clinicAddress = 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat · Ph: 9876543210';

  const [customBody, setCustomBody] = useState(
    'This is to certify that {PATIENT_NAME}, aged {AGE}, has been examined by me. The patient has clinically recovered from {DIAGNOSIS} and is now found medically fit in all respects to resume normal daily duties.'
  );

  useEffect(() => {
    loadCertificates();
    loadTemplates();
  }, [clinicId]);

  const computeNextCertId = (list) => {
    const yr = new Date().getFullYear();
    const count = (list || []).length + 1;
    return `CERT-${yr}-${String(count).padStart(4, '0')}`;
  };

  const loadTemplates = async () => {
    try {
      const res = await apiFetch('/certificates/templates');
      if (res.data && res.data.length > 0) {
        setTemplates(res.data.map(t => ({
          key: t._id || t.key || t.templateName,
          label: t.templateName || t.label,
          heading: t.title || t.heading,
          body: t.body,
          category: t.category,
        })));
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const loadCertificates = async () => {
    try {
      const res = await apiFetch('/certificates');
      const list = res.data || [];
      setCertificates(list);
      setCertNo(computeNextCertId(list));
    } catch (err) {
      console.warn(err);
    }
  };

  const handleTemplateChange = (key) => {
    setCertTemplate(key);
    const tpl = templates.find((t) => t.key === key);
    if (tpl?.body) {
      setCustomBody(tpl.body);
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#095c54';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureImg(dataUrl);
    localStorage.setItem('doctor_digital_signature', dataUrl);
    showToast('Signature saved & applied!');
    setSignatureModalOpen(false);
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        setSignatureImg(dataUrl);
        localStorage.setItem('doctor_digital_signature', dataUrl);
        showToast('Signature image uploaded & applied!');
        setSignatureModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!newTplName.trim()) {
      showToast('Template Name is required', 'error');
      return;
    }
    const key = newTplName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newTpl = {
      key,
      label: newTplName.trim(),
      category: newTplCategory,
      heading: newTplHeading.trim() || 'MEDICAL CERTIFICATE',
      body: newTplBody.trim(),
    };
    try {
      await apiFetch('/certificates/templates', {
        method: 'POST',
        body: {
          templateName: newTplName.trim(),
          title: newTplHeading.trim() || 'MEDICAL CERTIFICATE',
          body: newTplBody.trim(),
          category: newTplCategory,
        },
      });
      showToast(`Template "${newTplName}" saved to database!`);
      await loadTemplates();
    } catch (err) {
      showToast(err.message || 'Failed to save template', 'error');
    }
    setCertTemplate(key);
    setCustomBody(newTplBody.trim());
    setTemplateModalOpen(false);
    setNewTplName('');
  };

  const insertTagToNewTpl = (tag) => {
    setNewTplBody((prev) => prev + ` {${tag}}`);
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

  const handleIssue = async (e) => {
    e.preventDefault();
    const newCert = {
      certNo,
      patientName,
      patientAge,
      patientGender,
      templateType: certTemplate === 'fitness' ? 'Medical Fitness Certificate' : 'Medical Sick Leave Certificate',
      diagnosis,
      fromDate,
      toDate,
      restDays: Number(restDays) || 1,
      place,
      customBody,
      doctorName: docName,
      validity: `${fmtDate(fromDate)} → ${fmtDate(toDate)} (${restDays}d)`,
      issuedDate: '31/10/2026',
      status: 'Issued',
    };

    try {
      await apiFetch('/certificates', {
        method: 'POST',
        body: newCert,
      });
      showToast(`Medical Certificate ${certNo} saved to database!`);
      await loadCertificates();
      window.print();
    } catch (err) {
      showToast(err.message || 'Failed to issue certificate', 'error');
    }
  };

  const handleClear = () => {
    setPatientName('');
    setPatientAge('');
    setDiagnosis('');
    setPatientSearch('');
  };

  const handleDelete = async (cNo) => {
    if (!window.confirm(`Delete certificate #${cNo} from database?`)) return;
    try {
      await apiFetch(`/certificates/${cNo}`, { method: 'DELETE' });
      showToast('Certificate removed from database.');
      await loadCertificates();
    } catch (err) {
      showToast(err.message || 'Failed to delete certificate', 'error');
    }
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
            onClick={() => setSignatureModalOpen(true)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
              borderRadius: '6px', padding: '6px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <i className="fa-solid fa-signature" style={{ color: 'var(--primary)' }} /> + Add Digital Signature
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setTemplateModalOpen(true)}
            style={{ fontSize: '12.5px', padding: '6px 14px', borderRadius: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-plus" /> + Add Template
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
                <span
                  style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setTemplateModalOpen(true)}
                >
                  + New Template
                </span>
              </div>
              <select
                className="cms-input"
                style={{ height: '36px', fontSize: '12.5px' }}
                value={certTemplate}
                onChange={e => handleTemplateChange(e.target.value)}
              >
                {templates.map(t => (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{ fontSize: '11.5px', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setSignatureModalOpen(true)}
              >
                + Add Digital Signature
              </span>
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
                {signatureImg ? (
                  <img src={signatureImg} alt="Doctor Digital Signature" style={{ height: '42px', maxWidth: '140px', objectFit: 'contain', marginBottom: '4px', display: 'inline-block' }} />
                ) : (
                  <div style={{ fontStyle: 'italic', fontSize: '13px', color: '#0369a1', fontFamily: 'serif' }}>
                    {docName}
                  </div>
                )}
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
              {filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No issued certificates found in database
                  </td>
                </tr>
              ) : (
                certificates
                  .filter(c => !filterQuery || (c.patientName || '').toLowerCase().includes(filterQuery.toLowerCase()) || (c.certNo || '').toLowerCase().includes(filterQuery.toLowerCase()))
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Certificates Pagination Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '10px', padding: '12px 14px',
          borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)'
        }}>
          <div>
            Showing {filteredCerts.length === 0 ? 0 : (certPerPage === 'all' ? 1 : (certPage - 1) * Number(certPerPage) + 1)} to{' '}
            {certPerPage === 'all' ? filteredCerts.length : Math.min(certPage * Number(certPerPage), filteredCerts.length)} of {filteredCerts.length} entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Rows per page:</span>
            <select
              className="cms-input"
              style={{ height: '28px', padding: '0 6px', fontSize: '12px' }}
              value={certPerPage}
              onChange={e => {
                setCertPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                setCertPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value="all">All</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setCertPage(p => Math.max(1, p - 1))}
              disabled={certPage === 1}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '5px', padding: '4px 10px', cursor: certPage > 1 ? 'pointer' : 'not-allowed',
                color: certPage > 1 ? 'var(--text)' : '#94a3b8', fontSize: '11.5px', fontWeight: 600
              }}
            >
              &lt; Prev
            </button>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
              Page {certPage} of {totalCertPages}
            </span>
            <button
              type="button"
              onClick={() => setCertPage(p => Math.min(totalCertPages, p + 1))}
              disabled={certPage === totalCertPages}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '5px', padding: '4px 10px', cursor: certPage < totalCertPages ? 'pointer' : 'not-allowed',
                color: certPage < totalCertPages ? 'var(--text)' : '#94a3b8', fontSize: '11.5px', fontWeight: 600
              }}
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: Doctor Digital Signature (Screenshot 4) ── */}
      {signatureModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSignatureModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              color: '#1e293b',
              borderRadius: '14px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              padding: '24px',
              position: 'relative',
              zIndex: 1000000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header matching Screenshot 4 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'rgba(9,92,84,0.1)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                }}>
                  <i className="fa-solid fa-signature" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: 'var(--text)' }}>
                    Doctor Digital Signature
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {docName} • {clinicName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
              background: 'var(--surface-alt)', padding: '4px', borderRadius: '8px', marginBottom: '16px'
            }}>
              <button
                type="button"
                onClick={() => setSignatureMode('draw')}
                style={{
                  padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 700,
                  background: signatureMode === 'draw' ? 'var(--primary)' : 'transparent',
                  color: signatureMode === 'draw' ? '#fff' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <i className="fa-solid fa-pen-nib" /> Draw Signature
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('upload')}
                style={{
                  padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 700,
                  background: signatureMode === 'upload' ? 'var(--primary)' : 'transparent',
                  color: signatureMode === 'upload' ? '#fff' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <i className="fa-solid fa-cloud-arrow-up" /> Upload Image (PNG/JPG)
              </button>
            </div>

            {/* Signature Canvas / Upload Box */}
            {signatureMode === 'draw' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Sign using mouse, stylus, or touchscreen:
                  </span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
                      padding: '4px 10px', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <i className="fa-solid fa-eraser" /> Clear Canvas
                  </button>
                </div>

                <div style={{
                  position: 'relative', width: '100%', height: '170px',
                  border: '2px dashed var(--primary)', borderRadius: '10px',
                  background: '#ffffff', overflow: 'hidden'
                }}>
                  {!hasDrawn && (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', pointerEvents: 'none'
                    }}>
                      Draw Doctor's Signature Here
                    </div>
                  )}
                  <canvas
                    ref={canvasRef}
                    width={570}
                    height={170}
                    style={{ width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                border: '2px dashed var(--border)', borderRadius: '10px', padding: '36px 20px',
                textAlign: 'center', background: 'var(--surface-alt)'
              }}>
                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '32px', color: 'var(--primary)', marginBottom: '10px' }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                  Click or drop your signature file here
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Supports transparent PNG or JPG format
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleSignatureUpload}
                  style={{ fontSize: '12px' }}
                />
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="cms-btn cms-btn-outline"
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSignature}
                className="cms-btn cms-btn-primary"
                style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                ✓ Save &amp; Apply Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Add New Certificate Template (Screenshot 5) ── */}
      {templateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setTemplateModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              color: '#1e293b',
              borderRadius: '14px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              padding: '24px',
              position: 'relative',
              zIndex: 1000000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header matching Screenshot 5 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-circle-plus" style={{ color: 'var(--primary)', fontSize: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  Add New Certificate Template
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Row 1: Name + Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    TEMPLATE NAME *
                  </label>
                  <input
                    type="text"
                    className="cms-input"
                    placeholder="e.g. School Absence Certificate"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    CATEGORY
                  </label>
                  <select
                    className="cms-input"
                    value={newTplCategory}
                    onChange={(e) => setNewTplCategory(e.target.value)}
                  >
                    <option value="Sickness / Leave">Sickness / Leave</option>
                    <option value="Medical Fitness">Medical Fitness</option>
                    <option value="Fitness & Recovery">Fitness & Recovery</option>
                    <option value="Travel & Work">Travel & Work</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Heading Title */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  CERTIFICATE HEADING / TITLE *
                </label>
                <input
                  type="text"
                  className="cms-input"
                  value={newTplHeading}
                  onChange={(e) => setNewTplHeading(e.target.value.toUpperCase())}
                  required
                  style={{ textTransform: 'uppercase', fontWeight: 700 }}
                />
              </div>

              {/* Row 3: Placeholder tags pills */}
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  INSERT DYNAMIC PLACEHOLDER TAGS (CLICK TO ADD):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['PATIENT_NAME', 'AGE', 'GENDER', 'DIAGNOSIS', 'FROM_DATE', 'TO_DATE', 'REST_DAYS', 'CERT_ID', 'TODAY_DATE'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertTagToNewTpl(tag)}
                      style={{
                        background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7',
                        borderRadius: '14px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.1s'
                      }}
                    >
                      +{'{' + tag + '}'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Body */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  TEMPLATE BODY TEXT *
                </label>
                <textarea
                  className="cms-input font-mono"
                  rows={5}
                  value={newTplBody}
                  onChange={(e) => setNewTplBody(e.target.value)}
                  required
                  style={{ fontSize: '12.5px', lineHeight: 1.6 }}
                />
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="cms-btn cms-btn-outline"
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cms-btn cms-btn-primary"
                  style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-floppy-disk" /> Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
