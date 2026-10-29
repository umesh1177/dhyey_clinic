import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getLocalDB,
  saveLocalDB,
  apiFetch,
  todayISO,
  nowTime,
  fmtDate,
  fmtMoney,
  showToast,
  getSharedMasterCollection,
  addSharedMasterItem,
  makeCaseId,
} from '../services/api';
import PrescriptionModal from '../components/PrescriptionModal';

export default function ConsultationView({
  initialSelection,
  onNavigate,
}) {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [familyId, setFamilyId] = useState(initialSelection?.familyId || null);
  const [patientId, setPatientId] = useState(initialSelection?.patientId || null);

  const [activePatient, setActivePatient] = useState(null);
  const [activeFamily, setActiveFamily] = useState(null);

  // Subview: 'case' | 'family-due'
  const [subView, setSubView] = useState('case');
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  // New Visit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState(null);

  const [visitDate, setVisitDate] = useState(todayISO());
  const [visitTime, setVisitTime] = useState(nowTime());
  const [weight, setWeight] = useState('');
  const [bp, setBp] = useState('');
  const [sugar, setSugar] = useState('');
  const [pulse, setPulse] = useState('');
  const [reference, setReference] = useState('Self');
  const [otherNotes, setOtherNotes] = useState('');

  const [complaint, setComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [investigation, setInvestigation] = useState('');

  // Treatment rows
  const [treatment, setTreatment] = useState([
    { name: 'Clinical Consultation', qty: '1', cost: 300 },
  ]);

  // Prescription rows
  const [prescription, setPrescription] = useState([
    { name: '', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF', notes: '' },
  ]);

  const [charge, setCharge] = useState(300);
  const [received, setReceived] = useState(300);
  const [due, setDue] = useState(0);

  // Attached Lab Report
  const [labReportFile, setLabReportFile] = useState(null);

  // Active modal for printing
  const [printingVisit, setPrintingVisit] = useState(null);

  // Masters Autocomplete
  const [complaintsMaster, setComplaintsMaster] = useState([]);
  const [investigationsMaster, setInvestigationsMaster] = useState([]);
  const [medicinesMaster, setMedicinesMaster] = useState([]);

  // Search state if no patient selected
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    setComplaintsMaster(getSharedMasterCollection('complaints'));
    setInvestigationsMaster(getSharedMasterCollection('investigations'));
    setMedicinesMaster(getSharedMasterCollection('medicines'));
  }, []);

  useEffect(() => {
    if (initialSelection?.familyId) {
      setFamilyId(initialSelection.familyId);
    }
    if (initialSelection?.patientId) {
      setPatientId(initialSelection.patientId);
    }
  }, [initialSelection]);

  useEffect(() => {
    loadPatientData();
  }, [familyId, patientId, clinicId]);

  const loadPatientData = () => {
    if (!familyId || !patientId) {
      setActivePatient(null);
      setActiveFamily(null);
      return;
    }

    const db = getLocalDB(clinicId);
    const fam = db.families?.[familyId] || Object.values(db.families || {}).find((f) => f.id === familyId || f.famId === familyId);
    const pat = fam?.patients?.[patientId] || Object.values(fam?.patients || {}).find((p) => p.id === patientId || p.patId === patientId);

    setActiveFamily(fam || null);
    setActivePatient(pat || null);
  };

  // Treatment Row Handlers
  const handleTreatmentChange = (index, field, value) => {
    const list = [...treatment];
    list[index][field] = value;

    // Auto add row if typing on the last row
    if (index === list.length - 1 && list[index].name.trim() !== '') {
      list.push({ name: '', qty: '1', cost: 0 });
    }
    setTreatment(list);
    recalcTotalCharge(list);
  };

  const handleRemoveTreatment = (index) => {
    if (treatment.length <= 1) return;
    const list = treatment.filter((_, i) => i !== index);
    setTreatment(list);
    recalcTotalCharge(list);
  };

  const recalcTotalCharge = (treatList) => {
    const total = treatList.reduce((acc, item) => acc + (Number(item.cost) || 0), 0);
    setCharge(total);
    setReceived(total);
    setDue(0);
  };

  // Prescription Row Handlers
  const handlePrescriptionChange = (index, field, value) => {
    const list = [...prescription];
    list[index][field] = value;

    if (index === list.length - 1 && list[index].name.trim() !== '') {
      list.push({ name: '', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF', notes: '' });
    }
    setPrescription(list);
  };

  const handleRemovePrescription = (index) => {
    if (prescription.length <= 1) return;
    setPrescription(prescription.filter((_, i) => i !== index));
  };

  // Financial Changes
  const handleReceivedChange = (val) => {
    const rec = Number(val) || 0;
    setReceived(rec);
    setDue(Math.max(0, charge - rec));
  };

  const handleChargeChange = (val) => {
    const ch = Number(val) || 0;
    setCharge(ch);
    setDue(Math.max(0, ch - received));
  };

  // Save Consultation Case
  const handleSaveVisit = (andPrint = false) => {
    if (!activePatient || !activeFamily) {
      showToast('Please select a patient first.', 'error');
      return;
    }

    const cleanTreatment = treatment.filter((t) => t.name.trim() !== '');
    const cleanPrescription = prescription.filter((p) => p.name.trim() !== '');

    const db = getLocalDB(clinicId);
    const fam = db.families[activeFamily.id || activeFamily.famId];
    const pat = fam.patients[activePatient.id || activePatient.patId];
    if (!pat.visits) pat.visits = [];

    const visitNum = editingCaseId
      ? pat.visits.find((v) => v.caseId === editingCaseId)?.visitNum || 1
      : pat.visits.length + 1;

    const caseId = editingCaseId || makeCaseId(activeFamily.id || activeFamily.famId, activePatient.id || activePatient.patId, visitNum);

    const visitData = {
      caseId,
      visitNum,
      date: visitDate,
      time: visitTime,
      weight,
      bp,
      sugar,
      pulse,
      reference,
      otherNotes,
      complaint: complaint.trim(),
      diagnosis: diagnosis.trim(),
      investigation: investigation.trim(),
      treatment: cleanTreatment,
      prescription: cleanPrescription,
      charge: Number(charge),
      received: Number(received),
      due: Number(due),
      labReportFile: labReportFile ? labReportFile.name : null,
    };

    if (editingCaseId) {
      const idx = pat.visits.findIndex((v) => v.caseId === editingCaseId);
      if (idx !== -1) {
        pat.visits[idx] = visitData;
      }
      showToast(`Case #${caseId} updated successfully.`);
    } else {
      pat.visits.unshift(visitData);
      showToast(`New Visit #${caseId} recorded successfully!`);

      // Auto-learn new complaints or investigations
      if (complaint.trim()) {
        addSharedMasterItem('complaints', { name: complaint.trim(), category: 'General' });
      }
      if (investigation.trim()) {
        addSharedMasterItem('investigations', { name: investigation.trim(), category: 'General' });
      }
    }

    saveLocalDB(clinicId, db);
    loadPatientData();

    // Async sync to backend
    apiFetch('/consultations', {
      method: editingCaseId ? 'PUT' : 'POST',
      body: {
        ...visitData,
        familyId: activeFamily.id || activeFamily.famId,
        patientId: activePatient.id || activePatient.patId,
      },
    }).catch(() => {});

    // Close form
    resetVisitForm();

    if (andPrint) {
      setPrintingVisit(visitData);
    }
  };

  const resetVisitForm = () => {
    setIsFormOpen(false);
    setEditingCaseId(null);
    setVisitDate(todayISO());
    setVisitTime(nowTime());
    setWeight('');
    setBp('');
    setSugar('');
    setPulse('');
    setReference('Self');
    setOtherNotes('');
    setComplaint('');
    setDiagnosis('');
    setInvestigation('');
    setTreatment([{ name: 'Clinical Consultation', qty: '1', cost: 300 }]);
    setPrescription([{ name: '', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF', notes: '' }]);
    setCharge(300);
    setReceived(300);
    setDue(0);
    setLabReportFile(null);
  };

  const handleEditVisit = (v) => {
    setEditingCaseId(v.caseId);
    setVisitDate(v.date || todayISO());
    setVisitTime(v.time || nowTime());
    setWeight(v.weight || '');
    setBp(v.bp || '');
    setSugar(v.sugar || '');
    setPulse(v.pulse || '');
    setReference(v.reference || 'Self');
    setOtherNotes(v.otherNotes || '');
    setComplaint(v.complaint || '');
    setDiagnosis(v.diagnosis || '');
    setInvestigation(v.investigation || '');
    setTreatment(v.treatment && v.treatment.length > 0 ? v.treatment : [{ name: '', qty: '1', cost: 0 }]);
    setPrescription(v.prescription && v.prescription.length > 0 ? v.prescription : [{ name: '', qty: '1', mor: '0', noon: '0', eve: '0', ngt: '0', timing: 'AF', notes: '' }]);
    setCharge(v.charge || 0);
    setReceived(v.received || 0);
    setDue(v.due || 0);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteVisit = (caseId) => {
    if (!window.confirm(`Delete clinical visit case #${caseId}?`)) return;

    const db = getLocalDB(clinicId);
    const fam = db.families[activeFamily.id || activeFamily.famId];
    const pat = fam.patients[activePatient.id || activePatient.patId];
    pat.visits = pat.visits.filter((v) => v.caseId !== caseId);

    saveLocalDB(clinicId, db);
    showToast('Visit case entry deleted.');
    loadPatientData();

    apiFetch(`/consultations/${caseId}`, { method: 'DELETE' }).catch(() => {});
  };

  // Searching patients when none active
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    const query = q.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const db = getLocalDB(clinicId);
    const results = [];
    for (const f of Object.values(db.families || {})) {
      for (const p of Object.values(f.patients || {})) {
        if (
          p.name.toLowerCase().includes(query) ||
          (p.id && p.id.toLowerCase().includes(query)) ||
          (f.headName && f.headName.toLowerCase().includes(query)) ||
          (p.phone && p.phone.includes(query))
        ) {
          results.push({
            familyId: f.id || f.famId,
            patientId: p.id || p.patId,
            patientName: p.name,
            headName: f.headName,
            relation: p.relation,
            phone: p.phone || f.phone,
            area: p.area || f.area,
          });
        }
      }
    }
    setSearchResults(results);
  };

  // Calculate dues
  const personalDue = (activePatient?.visits || []).reduce((acc, v) => acc + (Number(v.due) || 0), 0);
  const familyDue = activeFamily
    ? Object.values(activeFamily.patients || {}).reduce((famAcc, p) => {
        return famAcc + (p.visits || []).reduce((patAcc, v) => patAcc + (Number(v.due) || 0), 0);
      }, 0)
    : 0;

  // Filter history
  let historyVisits = activePatient?.visits || [];
  if (showDueOnly) {
    historyVisits = historyVisits.filter((v) => Number(v.due) > 0);
  }
  if (historyDateFilter) {
    historyVisits = historyVisits.filter((v) => v.date === historyDateFilter);
  }

  // Render search selection view if no patient active
  if (!activePatient || !activeFamily) {
    return (
      <div className="cms-page-container">
        <div className="cms-card" style={{ maxWidth: '640px', margin: '40px auto', padding: '32px', textAlign: 'center' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(9, 92, 84, 0.1)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              marginBottom: '16px',
            }}
          >
            <i className="fa-solid fa-clipboard-user"></i>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' }}>
            Select Patient for Clinical Consultation
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Search by patient name, family head, or phone number to open clinical case record
          </p>

          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            ></i>
            <input
              type="text"
              className="cms-input"
              style={{ width: '100%', paddingLeft: '40px', height: '44px', fontSize: '14px' }}
              placeholder="Type patient name, phone, or ID..."
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>

          {searchResults.length > 0 && (
            <div style={{ textAlign: 'left', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              {searchResults.slice(0, 6).map((r, i) => (
                <div
                  key={`${r.patientId}-${i}`}
                  onClick={() => {
                    setFamilyId(r.familyId);
                    setPatientId(r.patientId);
                  }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  className="cms-search-result-item"
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                      {r.patientName} {r.relation && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({r.relation})</span>}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Head: {r.headName} · {r.area || 'General'} · Phone: {r.phone || '-'}
                    </div>
                  </div>
                  <span className="cms-pill font-mono" style={{ fontSize: '11px' }}>{r.patientId}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button type="button" className="cms-btn cms-btn-outline" onClick={() => onNavigate('patient')}>
              <i className="fa-solid fa-user-plus"></i> Enroll New Patient (F2)
            </button>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={() => onNavigate('dashboard')}>
              Dashboard (F4)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cms-page-container">
      {/* Active Patient Header Banner */}
      <div
        className="cms-card cms-patient-header"
        style={{
          padding: '16px 20px',
          marginBottom: '16px',
          borderRadius: '10px',
          background: 'var(--surface)',
          borderLeft: '5px solid var(--primary)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                {activePatient.name}
              </h2>
              <span className="cms-pill" style={{ background: 'rgba(9,92,84,0.1)', color: 'var(--primary)', fontWeight: 700 }}>
                {activePatient.relation || 'Member'}
              </span>
              <span className="cms-pill font-mono" style={{ fontSize: '12px' }}>
                ID: {activePatient.id || activePatient.patId}
              </span>
              {activePatient.bloodGroup && (
                <span className="cms-pill" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                  <i className="fa-solid fa-droplet" style={{ marginRight: '4px' }}></i>
                  {activePatient.bloodGroup}
                </span>
              )}
              {activePatient.allergy && activePatient.allergy.toLowerCase() !== 'none' && (
                <span className="cms-pill" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i>
                  Allergy: {activePatient.allergy}
                </span>
              )}
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span><i className="fa-solid fa-calendar"></i> Age: {activePatient.age ? `${activePatient.age} Y` : '-'}</span>
              <span><i className="fa-solid fa-venus-mars"></i> {activePatient.gender || '-'}</span>
              <span><i className="fa-solid fa-phone"></i> {activePatient.phone || activeFamily.phone || '-'}</span>
              <span><i className="fa-solid fa-users"></i> Head: <strong>{activeFamily.headName}</strong> ({activeFamily.id || activeFamily.famId})</span>
              <span><i className="fa-solid fa-location-dot"></i> {activePatient.area || activeFamily.area || '-'}</span>
            </div>
          </div>

          {/* Dues & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => onNavigate('patient', { familyId: activeFamily.id || activeFamily.famId, editPatientId: activePatient.id || activePatient.patId })}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <i className="fa-solid fa-user-pen"></i> Edit Patient
            </button>

            <button
              type="button"
              className={`cms-btn ${personalDue > 0 ? 'cms-btn-danger' : 'cms-btn-ghost'}`}
              onClick={() => setShowDueOnly(!showDueOnly)}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              title="Click to highlight personal due cases"
            >
              <i className="fa-solid fa-user"></i> Patient Due: {fmtMoney(personalDue)}
              {showDueOnly && <span style={{ marginLeft: '4px' }}>✕</span>}
            </button>

            <button
              type="button"
              className={`cms-btn ${subView === 'family-due' ? 'cms-btn-primary' : 'cms-btn-outline'}`}
              onClick={() => setSubView(subView === 'family-due' ? 'case' : 'family-due')}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <i className="fa-solid fa-people-roof"></i> Family Due: {fmtMoney(familyDue)}
            </button>

            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => {
                if (isFormOpen) {
                  resetVisitForm();
                } else {
                  setIsFormOpen(true);
                }
              }}
              style={{ fontSize: '13px' }}
            >
              <i className={`fa-solid ${isFormOpen ? 'fa-xmark' : 'fa-plus'}`}></i>
              {isFormOpen ? 'Cancel Form' : 'New Visit (F3)'}
            </button>
          </div>
        </div>
      </div>

      {/* Subview: Family Due Breakdown */}
      {subView === 'family-due' && (
        <div className="cms-card" style={{ marginBottom: '20px', background: 'var(--surface-alt)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 2px', color: 'var(--text)' }}>
                Household Family Ledger: {activeFamily.headName}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                All enrolled members and outstanding case balances
              </p>
            </div>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setSubView('case')}>
              <i className="fa-solid fa-xmark"></i> Close Ledger
            </button>
          </div>

          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Relation</th>
                  <th>Age/Sex</th>
                  <th>Total Visits</th>
                  <th>Outstanding Due</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(activeFamily.patients || {}).map((m) => {
                  const mDue = (m.visits || []).reduce((sum, v) => sum + (Number(v.due) || 0), 0);
                  return (
                    <tr key={m.id || m.patId} style={{ background: (m.id || m.patId) === (activePatient.id || activePatient.patId) ? 'rgba(9,92,84,0.06)' : 'transparent' }}>
                      <td>
                        <strong>{m.name}</strong>
                        {(m.id || m.patId) === (activePatient.id || activePatient.patId) && (
                          <span className="cms-pill" style={{ marginLeft: '6px', fontSize: '10px', background: 'var(--primary)', color: '#fff' }}>Active</span>
                        )}
                      </td>
                      <td>{m.relation || 'Member'}</td>
                      <td>{m.age ? `${m.age} Y` : '-'} · {m.gender || '-'}</td>
                      <td>{(m.visits || []).length} visits</td>
                      <td>
                        {mDue > 0 ? (
                          <span className="cms-pill cms-badge-due font-mono">{fmtMoney(mDue)}</span>
                        ) : (
                          <span className="cms-pill cms-badge-paid">Clear</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          onClick={() => {
                            setPatientId(m.id || m.patId);
                            setSubView('case');
                          }}
                          style={{ fontSize: '11.5px', padding: '4px 8px' }}
                        >
                          <i className="fa-solid fa-folder-open"></i> Switch to Member
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Visit / Case Entry Form Card */}
      {isFormOpen && (
        <div className="cms-card cms-visit-form-card" style={{ marginBottom: '24px', border: '2px solid var(--primary)' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveVisit(false); }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1.5px solid var(--border)',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 2px', color: 'var(--primary)' }}>
                <i className="fa-solid fa-file-medical" style={{ marginRight: '8px' }}></i>
                {editingCaseId ? `Edit Consultation Case #${editingCaseId}` : 'New Clinical Consultation Entry'}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                OPD visit vitals, diagnosis, clinical procedures and prescription
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                className="cms-input"
                style={{ width: '140px', height: '34px', fontSize: '12.5px' }}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
              <input
                type="text"
                className="cms-input"
                style={{ width: '100px', height: '34px', fontSize: '12.5px' }}
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
              />
            </div>
          </div>

          {/* Vitals Ribbon */}
          <div
            style={{
              padding: '12px',
              background: 'var(--surface-alt, #f8fafc)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Weight (Kg)
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="e.g. 72"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Blood Pressure (mmHg)
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="120/80"
                value={bp}
                onChange={(e) => setBp(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Blood Sugar (mg/dL)
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="110"
                value={sugar}
                onChange={(e) => setSugar(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Pulse (bpm)
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="76"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Referred By
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="Self / Dr. Shah"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          {/* Clinical Findings: Complaint, Diagnosis, Investigations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Chief Complaints &amp; Symptoms
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="e.g. Fever, Cough, Headache"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                list="complaints-list"
              />
              <datalist id="complaints-list">
                {complaintsMaster.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Provisional Diagnosis
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="e.g. Acute Viral Bronchitis, URTI"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Advised Investigations / Labs
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="e.g. CBC, Lipid Profile, Chest X-Ray"
                value={investigation}
                onChange={(e) => setInvestigation(e.target.value)}
                list="investigations-list"
              />
              <datalist id="investigations-list">
                {investigationsMaster.map((inv) => (
                  <option key={inv.id} value={inv.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Section: Treatment & In-Clinic Procedures */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #334155)', textTransform: 'uppercase' }}>
                <i className="fa-solid fa-syringe" style={{ marginRight: '6px', color: 'var(--primary)' }}></i>
                Treatment &amp; In-Clinic Procedures
              </span>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setTreatment([...treatment, { name: '', qty: '1', cost: 0 }])}
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                + Add Procedure
              </button>
            </div>

            <table className="cms-table" style={{ background: '#ffffff' }}>
              <thead>
                <tr>
                  <th>Procedure / Treatment Item</th>
                  <th style={{ width: '90px' }}>Qty</th>
                  <th style={{ width: '130px' }}>Charge (₹)</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {treatment.map((tItem, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        className="cms-input"
                        placeholder="e.g. Clinical Consultation, Nebulization, Dressing"
                        value={tItem.name}
                        onChange={(e) => handleTreatmentChange(idx, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cms-input"
                        value={tItem.qty}
                        onChange={(e) => handleTreatmentChange(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="cms-input font-mono"
                        value={tItem.cost}
                        onChange={(e) => handleTreatmentChange(idx, 'cost', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveTreatment(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section: Prescription Medicines */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #334155)', textTransform: 'uppercase' }}>
                <i className="fa-solid fa-pills" style={{ marginRight: '6px', color: 'var(--primary)' }}></i>
                Prescription (Medicines)
              </span>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() =>
                  setPrescription([
                    ...prescription,
                    { name: '', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF', notes: '' },
                  ])
                }
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                + Add Medicine
              </button>
            </div>

            <table className="cms-table" style={{ background: '#ffffff' }}>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th style={{ width: '70px' }}>Qty</th>
                  <th style={{ width: '45px', textAlign: 'center' }}>M</th>
                  <th style={{ width: '45px', textAlign: 'center' }}>N</th>
                  <th style={{ width: '45px', textAlign: 'center' }}>E</th>
                  <th style={{ width: '45px', textAlign: 'center' }}>Nt</th>
                  <th style={{ width: '90px' }}>Timing</th>
                  <th>Notes</th>
                  <th style={{ width: '45px' }}></th>
                </tr>
              </thead>
              <tbody>
                {prescription.map((pItem, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        className="cms-input"
                        placeholder="Search medicine..."
                        value={pItem.name}
                        onChange={(e) => handlePrescriptionChange(idx, 'name', e.target.value)}
                        list="medicines-options"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cms-input"
                        value={pItem.qty}
                        onChange={(e) => handlePrescriptionChange(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cms-input"
                        style={{ textAlign: 'center' }}
                        value={pItem.mor}
                        onChange={(e) => handlePrescriptionChange(idx, 'mor', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cms-input"
                        style={{ textAlign: 'center' }}
                        value={pItem.noon}
                        onChange={(e) => handlePrescriptionChange(idx, 'noon', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cms-input"
                        style={{ textAlign: 'center' }}
                        value={pItem.eve}
                        onChange={(e) => handlePrescriptionChange(idx, 'eve', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cms-input"
                        style={{ textAlign: 'center' }}
                        value={pItem.ngt}
                        onChange={(e) => handlePrescriptionChange(idx, 'ngt', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="cms-input"
                        value={pItem.timing}
                        onChange={(e) => handlePrescriptionChange(idx, 'timing', e.target.value)}
                      >
                        <option value="AF">AF (After Food)</option>
                        <option value="BF">BF (Before Food)</option>
                        <option value="HS">HS (Bedtime)</option>
                        <option value="OD">OD (Once Daily)</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="cms-input"
                        placeholder="Instructions"
                        value={pItem.notes}
                        onChange={(e) => handlePrescriptionChange(idx, 'notes', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemovePrescription(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="medicines-options">
              {medicinesMaster.map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
          </div>

          {/* Financials & Submission Bar */}
          <div
            style={{
              padding: '16px',
              background: 'var(--surface-alt, #f8fafc)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Total Charge (₹)
                </label>
                <input
                  type="number"
                  className="cms-input font-mono"
                  style={{ width: '120px', fontWeight: 700 }}
                  value={charge}
                  onChange={(e) => handleChargeChange(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Received Amount (₹)
                </label>
                <input
                  type="number"
                  className="cms-input font-mono"
                  style={{ width: '120px', fontWeight: 700, color: '#059669' }}
                  value={received}
                  onChange={(e) => handleReceivedChange(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Due Balance (₹)
                </label>
                <span className={`cms-pill font-mono ${due > 0 ? 'cms-badge-due' : 'cms-badge-paid'}`} style={{ fontSize: '14px', fontWeight: 800 }}>
                  {fmtMoney(due)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="cms-btn cms-btn-outline" onClick={resetVisitForm}>
                Cancel
              </button>
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => handleSaveVisit(false)}>
                <i className="fa-solid fa-floppy-disk"></i> Save Only
              </button>
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => handleSaveVisit(true)}>
                <i className="fa-solid fa-print"></i> Save &amp; Print Rx
              </button>
            </div>
          </div>
        </form>
      </div>
      )}

      {/* Visit History Section */}
      <div className="cms-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px', color: 'var(--text)' }}>
              Consultation Case History ({historyVisits.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Chronological OPD medical records and prescriptions
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="date"
              className="cms-input"
              style={{ width: '140px', height: '34px', fontSize: '12px' }}
              value={historyDateFilter}
              onChange={(e) => setHistoryDateFilter(e.target.value)}
              title="Filter by visit date"
            />
            {historyDateFilter && (
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setHistoryDateFilter('')}
                style={{ fontSize: '12px' }}
              >
                Show All Dates
              </button>
            )}
          </div>
        </div>

        {historyVisits.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-notes-medical" style={{ fontSize: '32px', marginBottom: '10px', display: 'block', opacity: 0.4 }}></i>
            No consultation records match the active filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {historyVisits.map((v, idx) => (
              <div
                key={`${v.caseId}-${idx}`}
                className="cms-history-card"
                style={{
                  border: '1.5px solid var(--border)',
                  borderRadius: '10px',
                  padding: '18px',
                  background: 'var(--surface)',
                }}
              >
                {/* History Card Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="cms-pill font-mono" style={{ fontSize: '13px', fontWeight: 800, background: 'rgba(9,92,84,0.1)', color: 'var(--primary)' }}>
                        Case #{v.caseId}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        {fmtDate(v.date)} · {v.time || 'OPD'}
                      </span>
                      <span className="cms-pill" style={{ fontSize: '11px' }}>
                        Visit #{v.visitNum || idx + 1}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Referred: {v.reference || 'Self'}
                      {(v.bp || v.sugar || v.pulse || v.weight) && (
                        <span style={{ marginLeft: '10px', color: 'var(--text)' }}>
                          Vitals: {v.bp ? `BP: ${v.bp} ` : ''}
                          {v.sugar ? `Sugar: ${v.sugar} ` : ''}
                          {v.pulse ? `Pulse: ${v.pulse} ` : ''}
                          {v.weight ? `Wt: ${v.weight}kg` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financials & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right', marginRight: '6px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Charge: <strong>{fmtMoney(v.charge)}</strong> · Paid: <strong style={{ color: '#059669' }}>{fmtMoney(v.received)}</strong>
                      </div>
                      {Number(v.due) > 0 ? (
                        <span className="cms-pill cms-badge-due font-mono" style={{ fontSize: '11px' }}>Due: {fmtMoney(v.due)}</span>
                      ) : (
                        <span className="cms-pill cms-badge-paid font-mono" style={{ fontSize: '11px' }}>Paid</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="cms-btn cms-btn-primary"
                      onClick={() => setPrintingVisit(v)}
                      style={{ padding: '6px 10px', fontSize: '11.5px' }}
                      title="Print Prescription Letterhead"
                    >
                      <i className="fa-solid fa-print"></i> Print Rx
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => handleEditVisit(v)}
                      style={{ padding: '6px 10px', fontSize: '11.5px' }}
                      title="Edit this Visit"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost text-danger"
                      onClick={() => handleDeleteVisit(v.caseId)}
                      style={{ padding: '6px 10px', fontSize: '11.5px' }}
                      title="Delete Visit Entry"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>

                {/* Complaints & Diagnosis */}
                <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                  {v.complaint && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text-muted)' }}>Complaints: </strong>
                      <span style={{ color: 'var(--text)' }}>{v.complaint}</span>
                    </div>
                  )}
                  {v.diagnosis && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--primary)' }}>Diagnosis: </strong>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{v.diagnosis}</span>
                    </div>
                  )}
                  {v.investigation && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Investigations: </strong>
                      <span style={{ color: 'var(--text)' }}>{v.investigation}</span>
                    </div>
                  )}
                </div>

                {/* Prescription Items Capsules */}
                {v.prescription && v.prescription.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Prescription ({v.prescription.length} medicines)
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {v.prescription.map((rx, rIdx) => (
                        <div
                          key={rIdx}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'var(--surface-alt, #f8fafc)',
                            border: '1px solid var(--border)',
                            fontSize: '11.5px',
                            color: 'var(--text)',
                          }}
                        >
                          <strong>{rx.name}</strong> ({rx.qty}) · <span style={{ color: 'var(--primary)' }}>{rx.mor}-{rx.noon}-{rx.eve}-{rx.ngt} {rx.timing}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescription Print Modal */}
      {printingVisit && (
        <PrescriptionModal
          patient={activePatient}
          visit={printingVisit}
          onClose={() => setPrintingVisit(null)}
        />
      )}
    </div>
  );
}
