import React, { useState, useEffect, useRef } from 'react';
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

/* ── Diet shortcut templates ─────────────────────────────────────────── */
const DIET_TEMPLATES = {
  DB:      'DB: Avoid sugar, sweets, rice, potato, banana. Eat bitter gourd, fenugreek.',
  BP:      'BP: Avoid salt, pickles, papad, processed food. Eat less oil.',
  ACID:    'ACID: Avoid spicy, fried, sour food. Eat on time. No tea/coffee empty stomach.',
  THYROID: 'THYROID: Avoid cabbage, cauliflower, soya. Eat iodine-rich food.',
  URIC:    'URIC: Avoid pulses, non-veg, alcohol. Drink 3-4 liters water daily.',
  CV:      'CV: Avoid ghee, butter, fried food. Eat oats, nuts, green vegetables.',
  LQ:      'LQ: Light diet only. Khichdi, dal-rice, boiled vegetables, curd.',
};

const URIC_TOOLTIP = 'Hyperuricemia / Gout (High Uric Acid)';

/* ── Format date DD-MM-YYYY for visit title ─────────────────────────── */
function fmtDMY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export default function ConsultationView({ initialSelection, onNavigate }) {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [familyId, setFamilyId]     = useState(initialSelection?.familyId || null);
  const [patientId, setPatientId]   = useState(initialSelection?.patientId || null);
  const [activePatient, setActivePatient] = useState(null);
  const [activeFamily, setActiveFamily]   = useState(null);

  /* visit form */
  const [isFormOpen, setIsFormOpen]       = useState(false);
  const [editingCaseId, setEditingCaseId] = useState(null);

  /* vitals */
  const [visitDate, setVisitDate]   = useState(todayISO());
  const [visitTime, setVisitTime]   = useState(nowTime());
  const [bp, setBp]                 = useState('');
  const [sugar, setSugar]           = useState('');
  const [other, setOther]           = useState('');
  const [reference, setReference]   = useState('');
  const [investigation, setInvestigation] = useState('');
  const [complaint, setComplaint]   = useState('');

  /* dietary */
  const [dietary, setDietary]       = useState('');
  const [uricTooltip, setUricTooltip] = useState(false);

  /* diagnosis (saved, not displayed in form per screenshot) */
  const [diagnosis, setDiagnosis]   = useState('');

  /* treatment */
  const [treatment, setTreatment]   = useState([
    { name: '', qty: '1', cost: 0 },
  ]);

  /* prescription */
  const [prescription, setPrescription] = useState([
    { name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' },
  ]);

  /* financials */
  const [charge, setCharge]     = useState(0);
  const [received, setReceived] = useState(0);
  const [due, setDue]           = useState(0);

  /* file */
  const [labReportFile, setLabReportFile]   = useState(null);
  const fileInputRef                        = useRef(null);

  /* history filters */
  const [showDueOnly, setShowDueOnly]         = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  /* print */
  const [printingVisit, setPrintingVisit] = useState(null);

  /* masters */
  const [complaintsMaster, setComplaintsMaster]         = useState([]);
  const [investigationsMaster, setInvestigationsMaster] = useState([]);
  const [medicinesMaster, setMedicinesMaster]           = useState([]);

  /* search */
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);

  /* ── Effects ────────────────────────────────────────────────────────── */
  useEffect(() => {
    setComplaintsMaster(getSharedMasterCollection('complaints'));
    setInvestigationsMaster(getSharedMasterCollection('investigations'));
    setMedicinesMaster(getSharedMasterCollection('medicines'));
  }, []);

  useEffect(() => {
    if (initialSelection?.familyId) setFamilyId(initialSelection.familyId);
    if (initialSelection?.patientId) setPatientId(initialSelection.patientId);
  }, [initialSelection]);

  useEffect(() => { loadPatientData(); }, [familyId, patientId, clinicId]);

  const loadPatientData = () => {
    if (!familyId || !patientId) { setActivePatient(null); setActiveFamily(null); return; }
    const db  = getLocalDB(clinicId);
    const fam = db.families?.[familyId] || Object.values(db.families || {}).find(f => f.id === familyId || f.famId === familyId);
    const pat = fam?.patients?.[patientId] || Object.values(fam?.patients || {}).find(p => p.id === patientId || p.patId === patientId);
    setActiveFamily(fam || null);
    setActivePatient(pat || null);
  };

  /* ── Treatment handlers ─────────────────────────────────────────────── */
  const handleTreatmentChange = (i, field, val) => {
    const list = [...treatment];
    list[i][field] = val;
    if (i === list.length - 1 && list[i].name.trim() !== '') list.push({ name: '', qty: '1', cost: 0 });
    setTreatment(list);
    recalc(list);
  };
  const removeTreatment = i => {
    if (treatment.length <= 1) return;
    const list = treatment.filter((_, j) => j !== i);
    setTreatment(list);
    recalc(list);
  };
  const recalc = list => {
    const total = list.reduce((s, t) => s + (Number(t.cost) || 0), 0);
    setCharge(total);
    setDue(Math.max(0, total - received));
  };

  /* ── Prescription handlers ──────────────────────────────────────────── */
  const handlePrescriptionChange = (i, field, val) => {
    const list = [...prescription];
    list[i][field] = val;
    if (i === list.length - 1 && list[i].name.trim() !== '') {
      list.push({ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' });
    }
    setPrescription(list);
  };
  const removePrescription = i => {
    if (prescription.length <= 1) return;
    setPrescription(prescription.filter((_, j) => j !== i));
  };

  /* ── Financial ─────────────────────────────────────────────────────── */
  const handleReceivedChange = val => {
    const rec = Number(val) || 0;
    setReceived(rec);
    setDue(Math.max(0, charge - rec));
  };

  /* ── Save ───────────────────────────────────────────────────────────── */
  const handleSaveVisit = (andPrint = false) => {
    if (!activePatient || !activeFamily) { showToast('Please select a patient first.', 'error'); return; }

    const cleanTx  = treatment.filter(t => t.name.trim() !== '');
    const cleanRx  = prescription.filter(p => p.name.trim() !== '');
    const db       = getLocalDB(clinicId);
    const fam      = db.families[activeFamily.id || activeFamily.famId];
    const pat      = fam.patients[activePatient.id || activePatient.patId];
    if (!pat.visits) pat.visits = [];

    const visitNum = editingCaseId
      ? pat.visits.find(v => v.caseId === editingCaseId)?.visitNum || 1
      : pat.visits.length + 1;

    const caseId = editingCaseId || makeCaseId(activeFamily.id || activeFamily.famId, activePatient.id || activePatient.patId, visitNum);

    const visitData = {
      caseId, visitNum,
      date: visitDate, time: visitTime,
      bp, sugar, otherVitals: other,
      reference, investigation: investigation.trim(),
      complaint: complaint.trim(), diagnosis: diagnosis.trim(),
      dietary: dietary.trim(),
      treatment: cleanTx, prescription: cleanRx,
      charge: Number(charge), received: Number(received), due: Number(due),
      labReportFile: labReportFile ? labReportFile.name : null,
    };

    if (editingCaseId) {
      const idx = pat.visits.findIndex(v => v.caseId === editingCaseId);
      if (idx !== -1) pat.visits[idx] = visitData;
      showToast(`Case #${caseId} updated successfully.`);
    } else {
      pat.visits.unshift(visitData);
      showToast(`New Visit #${visitNum} recorded successfully!`);
      if (complaint.trim()) addSharedMasterItem('complaints', { name: complaint.trim(), category: 'General' });
      if (investigation.trim()) addSharedMasterItem('investigations', { name: investigation.trim(), category: 'General' });
    }

    saveLocalDB(clinicId, db);
    loadPatientData();

    apiFetch('/consultations', {
      method: editingCaseId ? 'PUT' : 'POST',
      body: { ...visitData, familyId: activeFamily.id || activeFamily.famId, patientId: activePatient.id || activePatient.patId },
    }).catch(() => {});

    resetVisitForm();
    if (andPrint) setPrintingVisit(visitData);
  };

  const resetVisitForm = () => {
    setIsFormOpen(false);
    setEditingCaseId(null);
    setVisitDate(todayISO()); setVisitTime(nowTime());
    setBp(''); setSugar(''); setOther(''); setReference(''); setInvestigation(''); setComplaint('');
    setDietary(''); setDiagnosis('');
    setTreatment([{ name: '', qty: '1', cost: 0 }]);
    setPrescription([{ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }]);
    setCharge(0); setReceived(0); setDue(0);
    setLabReportFile(null);
  };

  const handleEditVisit = v => {
    setEditingCaseId(v.caseId);
    setVisitDate(v.date || todayISO()); setVisitTime(v.time || nowTime());
    setBp(v.bp || ''); setSugar(v.sugar || ''); setOther(v.otherVitals || '');
    setReference(v.reference || ''); setInvestigation(v.investigation || '');
    setComplaint(v.complaint || ''); setDiagnosis(v.diagnosis || '');
    setDietary(v.dietary || '');
    setTreatment(v.treatment?.length ? v.treatment : [{ name: '', qty: '1', cost: 0 }]);
    setPrescription(v.prescription?.length ? v.prescription : [{ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }]);
    setCharge(v.charge || 0); setReceived(v.received || 0); setDue(v.due || 0);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteVisit = caseId => {
    if (!window.confirm(`Delete clinical visit case #${caseId}?`)) return;
    const db  = getLocalDB(clinicId);
    const fam = db.families[activeFamily.id || activeFamily.famId];
    const pat = fam.patients[activePatient.id || activePatient.patId];
    pat.visits = pat.visits.filter(v => v.caseId !== caseId);
    saveLocalDB(clinicId, db);
    showToast('Visit case entry deleted.');
    loadPatientData();
    apiFetch(`/consultations/${caseId}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleDeletePatient = () => {
    if (!window.confirm(`Permanently delete patient "${activePatient.name}" and all their visit records?`)) return;
    const db  = getLocalDB(clinicId);
    const fam = db.families[activeFamily.id || activeFamily.famId];
    delete fam.patients[activePatient.id || activePatient.patId];
    saveLocalDB(clinicId, db);
    showToast('Patient record deleted.');
    setFamilyId(null); setPatientId(null);
  };

  /* ── Search ─────────────────────────────────────────────────────────── */
  const handleSearchChange = e => {
    const q = e.target.value;
    setSearchQuery(q);
    const query = q.trim().toLowerCase();
    if (!query) { setSearchResults([]); return; }
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
            familyId: f.id || f.famId, patientId: p.id || p.patId,
            patientName: p.name, headName: f.headName,
            relation: p.relation, phone: p.phone || f.phone,
            area: p.area || f.area, famId: f.id || f.famId,
          });
        }
      }
    }
    setSearchResults(results);
  };

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const personalDue = (activePatient?.visits || []).reduce((s, v) => s + (Number(v.due) || 0), 0);
  const familyDue   = activeFamily
    ? Object.values(activeFamily.patients || {}).reduce((fa, p) =>
        fa + (p.visits || []).reduce((pa, v) => pa + (Number(v.due) || 0), 0), 0)
    : 0;

  let historyVisits = activePatient?.visits || [];
  if (showDueOnly) historyVisits = historyVisits.filter(v => Number(v.due) > 0);
  if (historyDateFilter) historyVisits = historyVisits.filter(v => v.date === historyDateFilter);

  const visitNum = (activePatient?.visits?.length || 0) + 1;

  const recentPatients = () => {
    const db = getLocalDB(clinicId);
    const results = [];
    for (const f of Object.values(db.families || {})) {
      for (const p of Object.values(f.patients || {})) {
        results.push({
          familyId: f.id || f.famId, patientId: p.id || p.patId,
          patientName: p.name, headName: f.headName, relation: p.relation,
          famId: f.id || f.famId, area: f.area || p.area,
        });
      }
    }
    return results.slice(0, 8);
  };

  /* ── SEARCH / EMPTY STATE VIEW ───────────────────────────────────────── */
  if (!activePatient || !activeFamily) {
    const recents = recentPatients();
    return (
      <div className="cms-page-container" style={{ padding: '16px 20px' }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <i className="fa-solid fa-magnifying-glass"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '15px' }} />
          <input
            type="text"
            className="cms-input"
            style={{ width: '100%', paddingLeft: '42px', height: '44px', fontSize: '14px', borderRadius: '10px', boxSizing: 'border-box' }}
            placeholder="Find Patient by Name, Patient ID, or Family Head..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
          />
        </div>

        {/* Results */}
        {searchResults.length > 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
            {searchResults.slice(0, 8).map((r, i) => (
              <div
                key={`${r.patientId}-${i}`}
                onClick={() => { setFamilyId(r.familyId); setPatientId(r.patientId); }}
                style={{
                  padding: '14px 18px', borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                    {r.patientName}
                    {r.relation && <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>({r.relation})</span>}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {r.headName} · FAM {r.famId} · {r.area || ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="font-mono" style={{ background: 'var(--surface-alt)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                    PT {r.patientId}
                  </span>
                  <i className="fa-solid fa-arrow-right" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '50px 20px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(9,92,84,0.08)', color: 'var(--primary)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', marginBottom: '16px',
            }}>
              <i className="fa-solid fa-user-group" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' }}>
              Search Patient to Open Case Record
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
              Type patient name, 8-digit Patient ID, Family Head name, or Area in the search bar above to start clinical consultation and review case history.
            </p>
          </div>
        )}

        {/* Recent patients */}
        {!searchQuery && recents.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recent Patients in Clinic (Click to open record):
            </div>
            {recents.map((r, i) => (
              <div
                key={`rec-${r.patientId}-${i}`}
                onClick={() => { setFamilyId(r.familyId); setPatientId(r.patientId); }}
                style={{
                  padding: '14px 18px', borderBottom: i < recents.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                    {r.patientName}
                    {r.relation && <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '6px' }}>({r.relation})</span>}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {r.headName} · FAM {r.famId} · {r.area || ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="font-mono" style={{ background: 'var(--primary)', color: '#fff', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                    PT {r.patientId}
                  </span>
                  <i className="fa-solid fa-arrow-right" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── PATIENT RECORD VIEW ─────────────────────────────────────────────── */
  return (
    <div className="cms-page-container" style={{ padding: '12px 16px' }}>

      {/* Top search bar (persists when patient selected) */}
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <i className="fa-solid fa-magnifying-glass"
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }} />
        <input
          type="text"
          className="cms-input"
          style={{ width: '100%', paddingLeft: '40px', height: '40px', fontSize: '13px', borderRadius: '8px', boxSizing: 'border-box' }}
          placeholder="Find Patient by Name, Patient ID, or Family Head..."
          value={searchQuery}
          onChange={e => {
            handleSearchChange(e);
            if (e.target.value) { setFamilyId(null); setPatientId(null); }
          }}
        />
      </div>

      {/* ── PATIENT HEADER BANNER ─────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '14px 18px', marginBottom: '14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
      }}>
        {/* Left: name + badges */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {activePatient.name}
            </span>
            {personalDue > 0 && (
              <span style={{
                background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5',
                borderRadius: '6px', padding: '2px 10px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <i className="fa-solid fa-triangle-exclamation" /> TOTAL DUE: {fmtMoney(personalDue)}
              </span>
            )}
            {personalDue === 0 && (
              <span style={{
                background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5',
                borderRadius: '6px', padding: '2px 10px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <i className="fa-solid fa-triangle-exclamation" /> TOTAL DUE: ₹0
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Family:</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{activeFamily.headName}</span>
            <span style={{ color: 'var(--text-muted)' }}>({activeFamily.area || activePatient.area || '—'})</span>
            {familyDue > 0 && (
              <span style={{
                background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                borderRadius: '5px', padding: '1px 8px', fontSize: '11.5px', fontWeight: 700,
              }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '3px' }} />
                FAM DUE: {fmtMoney(familyDue)}
              </span>
            )}
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: 'var(--text)' }}>Age {activePatient.age || '—'}</span>
            {activePatient.bloodGroup && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span style={{ color: 'var(--text)' }}>{activePatient.bloodGroup}</span>
              </>
            )}
            {activePatient.allergy && activePatient.allergy.toLowerCase() !== 'none' && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>Allergy: {activePatient.allergy}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDeletePatient}
            style={{
              background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5',
              borderRadius: '7px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Delete Patient
          </button>
          <button
            type="button"
            onClick={() => onNavigate('patient', { familyId: activeFamily.id || activeFamily.famId, editPatientId: activePatient.id || activePatient.patId })}
            style={{
              background: 'transparent', color: 'var(--text)', border: '1.5px solid var(--border)',
              borderRadius: '7px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Edit Patient
          </button>
          <button
            type="button"
            onClick={() => { if (isFormOpen) resetVisitForm(); else setIsFormOpen(true); }}
            style={{
              background: isFormOpen ? '#dc2626' : 'var(--primary)', color: '#fff', border: 'none',
              borderRadius: '7px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {isFormOpen ? (
              <><i className="fa-solid fa-xmark" /> Cancel</>
            ) : (
              <><i className="fa-solid fa-plus" /> + New Visit
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px', padding: '1px 5px', fontSize: '11px', fontWeight: 800, marginLeft: '2px' }}>F6</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── NEW VISIT FORM CARD ───────────────────────────────────────────── */}
      {isFormOpen && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '16px 18px', marginBottom: '14px',
        }}>
          {/* Form title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
              {editingCaseId ? `Edit Visit #${editingCaseId}` : `New Visit #${visitNum}`}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {fmtDMY(visitDate)}
            </span>
            <input
              type="date"
              className="cms-input"
              style={{ width: '130px', height: '30px', fontSize: '12px' }}
              value={visitDate}
              onChange={e => setVisitDate(e.target.value)}
              title="Change visit date"
            />
            {/* Attach report button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: labReportFile ? 'var(--primary)' : 'rgba(9,92,84,0.08)',
                color: labReportFile ? '#fff' : 'var(--primary)',
                border: '1.5px solid var(--primary)', borderRadius: '6px',
                padding: '4px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              <i className="fa-solid fa-paperclip" />
              {labReportFile ? labReportFile.name.slice(0, 14) + '…' : 'Attach Report'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={e => setLabReportFile(e.target.files[0] || null)}
            />
            <button
              type="button"
              onClick={resetVisitForm}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)', lineHeight: 1 }}
              title="Close form"
            >
              ×
            </button>
          </div>

          {/* ── Vitals row (all inline, 6 columns) ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr 2fr 2fr',
            gap: '10px', marginBottom: '14px',
          }}>
            {/* BP */}
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>BP</label>
              <input type="text" className="cms-input" style={{ height: '32px', fontSize: '13px' }} placeholder="120/80"
                value={bp} onChange={e => setBp(e.target.value)} />
            </div>
            {/* SUGAR */}
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>SUGAR</label>
              <input type="text" className="cms-input" style={{ height: '32px', fontSize: '13px' }} placeholder=""
                value={sugar} onChange={e => setSugar(e.target.value)} />
            </div>
            {/* OTHER */}
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>OTHER</label>
              <input type="text" className="cms-input" style={{ height: '32px', fontSize: '13px' }} placeholder=""
                value={other} onChange={e => setOther(e.target.value)} />
            </div>
            {/* REFERENCE */}
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>REFERENCE</label>
              <input type="text" className="cms-input" style={{ height: '32px', fontSize: '13px' }} placeholder=""
                value={reference} onChange={e => setReference(e.target.value)} />
            </div>
            {/* INVESTIGATION */}
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                INVESTIGATION (REPORTS) <span style={{ fontWeight: 400, fontSize: '9.5px' }}>(COMMA-SEPARATED)</span>
              </label>
              <input type="text" className="cms-input" style={{ height: '32px', fontSize: '12px' }}
                placeholder="e.g. CBC, I ipd Profile, Urine R/M"
                value={investigation} onChange={e => setInvestigation(e.target.value)}
                list="investigations-list" />
              <datalist id="investigations-list">
                {investigationsMaster.map(inv => <option key={inv.id} value={inv.name} />)}
              </datalist>
            </div>
            {/* COMPLAINT */}
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                COMPLAINT (SYMPTOMS) <span style={{ fontWeight: 400, fontSize: '9.5px' }}>(COMMA-SEPARATED)</span>
              </label>
              <input type="text" className="cms-input" style={{ height: '32px', fontSize: '12px' }}
                placeholder="e.g. Fever, Cough, Headache"
                value={complaint} onChange={e => setComplaint(e.target.value)}
                list="complaints-list" />
              <datalist id="complaints-list">
                {complaintsMaster.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
          </div>

          {/* ── Dietary section (amber border) ── */}
          <div style={{
            border: '1.5px solid #f59e0b', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '14px', background: '#fffbeb',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#92400e', fontStyle: 'italic' }}>
                <i className="fa-solid fa-bolt" style={{ marginRight: '5px' }} />
                DIETARY (FOOD ADVICE &amp; RESTRICTIONS)
              </span>
              <span style={{ fontSize: '10.5px', color: '#b45309', fontStyle: 'italic', marginRight: '4px' }}>
                (What to Eat &amp; What NOT to Eat – delete or add food items freely)
              </span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                {Object.keys(DIET_TEMPLATES).map(key => (
                  <div key={key} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onMouseEnter={() => key === 'URIC' && setUricTooltip(true)}
                      onMouseLeave={() => key === 'URIC' && setUricTooltip(false)}
                      onClick={() => {
                        const text = DIET_TEMPLATES[key];
                        setDietary(prev => prev ? prev + '\n' + text : text);
                      }}
                      style={{
                        background: '#fff', color: '#92400e', border: '1px solid #f59e0b',
                        borderRadius: '5px', padding: '2px 7px', fontSize: '11.5px',
                        fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      +{key}
                    </button>
                    {key === 'URIC' && uricTooltip && (
                      <div style={{
                        position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                        background: '#1e293b', color: '#fff', borderRadius: '6px', padding: '5px 10px',
                        fontSize: '11px', whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      }}>
                        {URIC_TOOLTIP}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  style={{
                    background: '#fff', color: '#047857', border: '1px solid #6ee7b7',
                    borderRadius: '5px', padding: '2px 7px', fontSize: '11.5px',
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  + Add Template
                </button>
              </div>
            </div>
            <textarea
              className="cms-input"
              style={{ width: '100%', minHeight: '52px', resize: 'vertical', fontSize: '12.5px', background: '#fffbeb', border: '1px solid #fde68a', boxSizing: 'border-box' }}
              placeholder="e.g. DB, BP, ACID, THYROID (type shortcut to suggest, insert and edit advice)..."
              value={dietary}
              onChange={e => setDietary(e.target.value)}
            />
          </div>

          {/* ── Treatment + Prescription (two columns) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

            {/* TREATMENT (CLINIC) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>
                  Treatment (Clinic)
                </span>
                <button
                  type="button"
                  onClick={() => setTreatment([...treatment, { name: '', qty: '1', cost: 0 }])}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {treatment.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="cms-input"
                      style={{ flex: 1, height: '32px', fontSize: '12.5px' }}
                      placeholder="Treatment / Procedure name"
                      value={t.name}
                      onChange={e => handleTreatmentChange(i, 'name', e.target.value)}
                    />
                    <input
                      type="text"
                      className="cms-input"
                      style={{ width: '38px', height: '32px', textAlign: 'center', fontSize: '12.5px', padding: '0 4px' }}
                      value={t.qty}
                      onChange={e => handleTreatmentChange(i, 'qty', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeTreatment(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* PRESCRIPTION (MEDICAL STORE) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>
                  Prescription (Medical Store)
                </span>
                <button
                  type="button"
                  onClick={() => setPrescription([...prescription, { name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }])}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {prescription.map((rx, i) => (
                  <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="cms-input"
                      style={{ flex: 1, height: '32px', fontSize: '12px' }}
                      placeholder="Medicine name"
                      value={rx.name}
                      onChange={e => handlePrescriptionChange(i, 'name', e.target.value)}
                      list="medicines-options"
                    />
                    {/* qty */}
                    <input type="text" className="cms-input"
                      style={{ width: '30px', height: '32px', textAlign: 'center', fontSize: '12px', padding: '0 3px' }}
                      value={rx.qty} onChange={e => handlePrescriptionChange(i, 'qty', e.target.value)} />
                    {/* doses */}
                    {['mor','noon','eve','ngt'].map(field => (
                      <input key={field} type="text" className="cms-input"
                        style={{ width: '24px', height: '32px', textAlign: 'center', fontSize: '12px', padding: '0 2px' }}
                        value={rx[field]} onChange={e => handlePrescriptionChange(i, field, e.target.value)} />
                    ))}
                    {/* BF / AF radio */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="radio" name={`timing-${i}`} value="BF" checked={rx.timing === 'BF'} onChange={() => handlePrescriptionChange(i, 'timing', 'BF')} />
                      BF
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="radio" name={`timing-${i}`} value="AF" checked={rx.timing === 'AF'} onChange={() => handlePrescriptionChange(i, 'timing', 'AF')} />
                      AF
                    </label>
                    <button type="button" onClick={() => removePrescription(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <datalist id="medicines-options">
                {medicinesMaster.map(m => <option key={m.id} value={m.name} />)}
              </datalist>
            </div>
          </div>

          {/* ── Footer: financials + buttons ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
            borderTop: '1px solid var(--border)', paddingTop: '12px',
          }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
              CHARGE ₹ {charge}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>PAID ₹</span>
              <input
                type="number"
                className="cms-input font-mono"
                style={{ width: '80px', height: '32px', fontSize: '13px', fontWeight: 700, textAlign: 'center' }}
                value={received}
                onChange={e => handleReceivedChange(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: due > 0 ? '#dc2626' : 'var(--text)' }}>
              DUE: ₹{due}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={resetVisitForm}
                style={{
                  background: 'transparent', color: 'var(--text)', border: '1.5px solid var(--border)',
                  borderRadius: '7px', padding: '6px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveVisit(true)}
                style={{
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  borderRadius: '7px', padding: '6px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <i className="fa-solid fa-floppy-disk" /> Save &amp; Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VISIT HISTORY ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Visit History ({historyVisits.length})
            </h3>
            {/* date filter */}
            <input
              type="date"
              className="cms-input"
              style={{ height: '30px', fontSize: '12px', width: '130px' }}
              value={historyDateFilter}
              onChange={e => setHistoryDateFilter(e.target.value)}
              title="Filter by date"
            />
            {historyDateFilter && (
              <button
                type="button"
                onClick={() => setHistoryDateFilter('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', fontWeight: 700 }}
              >
                Clear
              </button>
            )}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showDueOnly} onChange={() => setShowDueOnly(!showDueOnly)} />
            Show Due Only
          </label>
        </div>

        {historyVisits.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-notes-medical" style={{ fontSize: '30px', marginBottom: '10px', display: 'block', opacity: 0.4 }} />
            No consultation records{showDueOnly ? ' with due balance' : ''}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {historyVisits.map((v, idx) => (
              <div
                key={`${v.caseId}-${idx}`}
                style={{
                  border: '1.5px solid var(--border)', borderRadius: '10px',
                  padding: '14px 16px', background: 'var(--surface)',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="font-mono" style={{
                        background: 'rgba(9,92,84,0.1)', color: 'var(--primary)',
                        borderRadius: '5px', padding: '2px 8px', fontSize: '12px', fontWeight: 800,
                      }}>
                        Case #{v.caseId}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        {fmtDate(v.date)} · {v.time || 'OPD'}
                      </span>
                      <span style={{
                        background: 'var(--surface-alt)', borderRadius: '5px',
                        padding: '2px 7px', fontSize: '11.5px', color: 'var(--text-muted)',
                      }}>
                        Visit #{v.visitNum || idx + 1}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Referred: {v.reference || 'Self'}
                      {(v.bp || v.sugar || v.otherVitals) && (
                        <span style={{ marginLeft: '10px', color: 'var(--text)' }}>
                          {v.bp ? `BP: ${v.bp} ` : ''}
                          {v.sugar ? `Sugar: ${v.sugar} ` : ''}
                          {v.otherVitals ? `Other: ${v.otherVitals}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right', marginRight: '4px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Charge: <strong>{fmtMoney(v.charge)}</strong> · Paid: <strong style={{ color: '#059669' }}>{fmtMoney(v.received)}</strong>
                      </div>
                      {Number(v.due) > 0 ? (
                        <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '5px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                          Due: {fmtMoney(v.due)}
                        </span>
                      ) : (
                        <span style={{ background: '#d1fae5', color: '#047857', borderRadius: '5px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                          Paid
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrintingVisit(v)}
                      style={{
                        background: 'var(--primary)', color: '#fff', border: 'none',
                        borderRadius: '6px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      <i className="fa-solid fa-print" /> Print Rx
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditVisit(v)}
                      style={{
                        background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)',
                        borderRadius: '6px', padding: '5px 9px', fontSize: '11.5px', cursor: 'pointer',
                      }}
                    >
                      <i className="fa-solid fa-pen-to-square" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVisit(v.caseId)}
                      style={{
                        background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5',
                        borderRadius: '6px', padding: '5px 9px', fontSize: '11.5px', cursor: 'pointer',
                      }}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>

                {/* Complaints / Diagnosis */}
                <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                  {v.complaint && (
                    <div style={{ marginBottom: '3px' }}>
                      <strong style={{ color: 'var(--text-muted)' }}>Complaints: </strong>
                      <span>{v.complaint}</span>
                    </div>
                  )}
                  {v.diagnosis && (
                    <div style={{ marginBottom: '3px' }}>
                      <strong style={{ color: 'var(--primary)' }}>Diagnosis: </strong>
                      <span style={{ fontWeight: 700 }}>{v.diagnosis}</span>
                    </div>
                  )}
                  {v.investigation && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Investigations: </strong>
                      <span>{v.investigation}</span>
                    </div>
                  )}
                  {v.dietary && (
                    <div style={{ marginTop: '3px' }}>
                      <strong style={{ color: '#92400e' }}>Dietary: </strong>
                      <span style={{ color: '#92400e' }}>{v.dietary}</span>
                    </div>
                  )}
                </div>

                {/* Prescription pills */}
                {v.prescription && v.prescription.length > 0 && (
                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                      Prescription ({v.prescription.length} medicines)
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {v.prescription.map((rx, ri) => (
                        <div key={ri} style={{
                          padding: '3px 8px', borderRadius: '5px',
                          background: 'var(--surface-alt)', border: '1px solid var(--border)',
                          fontSize: '11.5px', color: 'var(--text)',
                        }}>
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
