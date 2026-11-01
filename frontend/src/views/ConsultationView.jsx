import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  apiFetch,
  todayISO,
  nowTime,
  fmtDate,
  fmtMoney,
  showToast,
  getSharedMasterCollection,
  addSharedMasterItem,
  makeCaseId,
  fetchMasterCollectionFromDB,
  expandShortcut,
  findMasterMatch,
} from '../services/api';
import PrescriptionModal from '../components/PrescriptionModal';
import LabReportModal from '../components/LabReportModal';

/* ── Diet shortcut templates & tooltips ─────────────────────────── */
const DIET_TEMPLATES = {
  DB:      'DB: Avoid sugar, sweets, rice, potato, banana. Eat bitter gourd, fenugreek.',
  BP:      'BP: Avoid salt, pickles, papad, processed food. Eat less oil.',
  ACID:    'ACID: Avoid spicy, fried, sour food. Eat on time. No tea/coffee empty stomach.',
  THYROID: 'THYROID: Avoid cabbage, cauliflower, soya. Eat iodine-rich food.',
  URIC:    'URIC: Avoid pulses, non-veg, alcohol. Drink 3-4 liters water daily.',
  CV:      'CV: Avoid ghee, butter, fried food. Eat oats, nuts, green vegetables.',
  LQ:      'LQ: Light diet only. Khichdi, dal-rice, boiled vegetables, curd.',
};

const DIET_TOOLTIPS = {
  DB:      'Diabetes Mellitus / Sugar Care',
  BP:      'Hypertension / Blood Pressure Care',
  ACID:    'Acidity / GERD Care',
  THYROID: 'Hypothyroidism / Thyroid Disorders',
  URIC:    'Hyperuricemia / Gout (High Uric Acid)',
  CV:      'Cardiovascular Health Diet',
  LQ:      'Liquid / Soft Diet Care',
};

/* ── Format date DD-MM-YYYY for visit title ─────────────────────────── */
function fmtDMY(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return iso;
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
  const [hoveredDietKey, setHoveredDietKey] = useState(null);

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

  /* modals and subviews */
  const [showFamilyDueView, setShowFamilyDueView] = useState(false);
  const [showLabModal, setShowLabModal]           = useState(false);
  const [labReportFile, setLabReportFile]         = useState(null);
  const fileInputRef                              = useRef(null);

  /* hover & expansion for case history */
  const [hoveredCaseId, setHoveredCaseId]         = useState(null);
  const [expandedCaseId, setExpandedCaseId]       = useState(null);

  /* history filters */
  const [showDueOnly, setShowDueOnly]         = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(5);

  /* print */
  const [printingVisit, setPrintingVisit] = useState(null);
  const [autoPrint, setAutoPrint]         = useState(false);

  /* masters */
  const [complaintsMaster, setComplaintsMaster]         = useState([]);
  const [investigationsMaster, setInvestigationsMaster] = useState([]);
  const [medicinesMaster, setMedicinesMaster]           = useState([]);

  /* search */
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);

  /* ── Effects ────────────────────────────────────────────────────────── */
  useEffect(() => {
    fetchMasterCollectionFromDB('complaints').then(d => setComplaintsMaster(d || []));
    fetchMasterCollectionFromDB('investigations').then(d => setInvestigationsMaster(d || []));
    fetchMasterCollectionFromDB('medicines').then(d => setMedicinesMaster(d || []));
  }, []);

  useEffect(() => {
    if (initialSelection?.openHistory) {
      setTimeout(() => {
        const el = document.getElementById('cms-visit-history');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
  }, [initialSelection]);

  useEffect(() => {
    if (initialSelection?.familyId) setFamilyId(initialSelection.familyId);
    if (initialSelection?.patientId) setPatientId(initialSelection.patientId);
  }, [initialSelection]);

  const [allFamilies, setAllFamilies] = useState([]);

  useEffect(() => {
    loadAllFamilies();
  }, [clinicId]);

  const loadAllFamilies = async () => {
    try {
      const res = await apiFetch('/families');
      setAllFamilies(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadPatientData(); }, [familyId, patientId, clinicId]);

  const loadPatientData = async () => {
    if (!familyId || !patientId) { setActivePatient(null); setActiveFamily(null); return; }
    try {
      const [famRes, visitsRes] = await Promise.all([
        apiFetch(`/families/${familyId}`),
        apiFetch(`/consultations?patientId=${patientId}`).catch(() => ({ data: [] }))
      ]);
      const fam = famRes.data;
      const pat = fam?.patients?.[patientId] || Object.values(fam?.patients || {}).find(p => (p.id || p.patId) === patientId);
      if (pat) {
        pat.visits = (visitsRes?.data && visitsRes.data.length > 0) ? visitsRes.data : (pat.visits || []);
      }
      setActiveFamily(fam || null);
      setActivePatient(pat ? { ...pat } : null);
    } catch (err) {
      console.error(err);
    }
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
  const handleSaveVisit = async (andPrint = false) => {
    if (!activePatient || !activeFamily) { showToast('Please select a patient first.', 'error'); return; }

    const cleanTx  = treatment.filter(t => t.name.trim() !== '');
    const cleanRx  = prescription.filter(p => p.name.trim() !== '');
    const famId    = activeFamily.id || activeFamily.famId;
    const patId    = activePatient.id || activePatient.patId;

    const existingVisits = activePatient.visits || [];
    const visitNum = editingCaseId
      ? existingVisits.find(v => v.caseId === editingCaseId)?.visitNum || 1
      : existingVisits.length + 1;

    const caseId = editingCaseId || makeCaseId(famId, patId, visitNum);

    const visitData = {
      caseId, visitNum,
      familyId: famId,
      patientId: patId,
      date: visitDate, time: visitTime,
      bp, sugar, otherVitals: other,
      reference, investigation: investigation.trim(),
      complaint: complaint.trim(), diagnosis: diagnosis.trim(),
      dietary: dietary.trim(),
      labReport: labReportData,
      treatment: cleanTx, prescription: cleanRx,
      charge: Number(charge), received: Number(received), due: Number(due),
      labReportFile: labReportFile ? labReportFile.name : null,
    };

    try {
      if (editingCaseId) {
        await apiFetch(`/consultations/${editingCaseId}`, {
          method: 'PUT',
          body: visitData,
        });
        showToast(`Case #${caseId} updated in database.`);
      } else {
        await apiFetch('/consultations', {
          method: 'POST',
          body: visitData,
        });
        showToast(`New Visit #${visitNum} saved to database!`);
      }

      await loadPatientData();
      await loadAllFamilies();
      resetVisitForm();
      if (andPrint) setPrintingVisit(visitData);
    } catch (err) {
      showToast(err.message || 'Failed to save visit to database', 'error');
    }
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
    setLabReportData(v.labReport || null);
    setTreatment(v.treatment?.length ? v.treatment : [{ name: '', qty: '1', cost: 0 }]);
    setPrescription(v.prescription?.length ? v.prescription : [{ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }]);
    setCharge(v.charge || 0); setReceived(v.received || 0); setDue(v.due || 0);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteVisit = async (caseId) => {
    if (!window.confirm(`Delete clinical visit case #${caseId} from database?`)) return;
    try {
      await apiFetch(`/consultations/${caseId}`, { method: 'DELETE' });
      showToast('Visit case entry deleted from database.');
      await loadPatientData();
      await loadAllFamilies();
    } catch (err) {
      showToast(err.message || 'Failed to delete visit', 'error');
    }
  };

  const handleDeletePatient = async () => {
    if (!window.confirm(`Permanently delete patient "${activePatient.name}" and all records from database?`)) return;
    try {
      const patId = activePatient.id || activePatient.patId;
      await apiFetch(`/patients/${patId}`, { method: 'DELETE' });
      showToast('Patient record deleted from database.');
      setFamilyId(null); setPatientId(null);
      await loadAllFamilies();
    } catch (err) {
      showToast(err.message || 'Failed to delete patient', 'error');
    }
  };

  /* ── Search ─────────────────────────────────────────────────────────── */
  const handleSearchChange = e => {
    const q = e.target.value;
    setSearchQuery(q);
    const query = q.trim().toLowerCase();
    if (!query) { setSearchResults([]); return; }
    const results = [];
    for (const f of allFamilies) {
      for (const p of Object.values(f.patients || {})) {
        if (
          (p.name || '').toLowerCase().includes(query) ||
          (p.patId && p.patId.toLowerCase().includes(query)) ||
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
  if (historySearch) {
    const q = historySearch.toLowerCase().trim();
    historyVisits = historyVisits.filter(v =>
      (v.caseId && v.caseId.toLowerCase().includes(q)) ||
      (v.complaint && v.complaint.toLowerCase().includes(q)) ||
      (v.investigation && v.investigation.toLowerCase().includes(q)) ||
      (v.diagnosis && v.diagnosis.toLowerCase().includes(q)) ||
      (v.date && v.date.includes(q)) ||
      (v.treatment && v.treatment.some(t => (t.name || '').toLowerCase().includes(q))) ||
      (v.prescription && v.prescription.some(p => (p.name || '').toLowerCase().includes(q)))
    );
  }
  const totalHistoryPages = historyPerPage === 'all' ? 1 : Math.max(1, Math.ceil(historyVisits.length / Number(historyPerPage)));
  const paginatedHistory = historyPerPage === 'all'
    ? historyVisits
    : historyVisits.slice((historyPage - 1) * Number(historyPerPage), historyPage * Number(historyPerPage));

  const visitNum = (activePatient?.visits?.length || 0) + 1;

  const recentPatients = () => {
    const results = [];
    for (const f of allFamilies) {
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
          /* Unified Card matching Screenshot 3 */
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '36px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: '#e6f7f2', color: 'var(--primary)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', marginBottom: '14px',
              }}>
                <i className="fa-solid fa-address-card" />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: 'var(--text)' }}>
                Search Patient to Open Case Record
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.4 }}>
                Type patient name, 8-digit Patient ID, Family Head name, or Area in the search bar above to start clinical consultation and review case history.
              </p>
            </div>

            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
              RECENT PATIENTS IN CLINIC (CLICK TO OPEN RECORD):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recents.slice(0, 5).map((r, i) => (
                <div
                  key={`rec-${r.patientId}-${i}`}
                  onClick={() => { setFamilyId(r.familyId); setPatientId(r.patientId); }}
                  style={{
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '12px 16px', background: 'var(--surface)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text)', marginBottom: '2px' }}>
                      {r.patientName} {r.relation ? <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>({r.relation})</span> : ''}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {r.headName} · FAM {r.famId} · {r.area || ''}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--primary)',
                    border: '1px solid rgba(9,92,84,0.25)', borderRadius: '6px', padding: '4px 10px', background: 'rgba(9,92,84,0.04)',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    PT {r.patientId} →
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── FAMILY DUE BREAKDOWN HISTORY VIEW (Screenshot 4) ──────────────── */
  if (showFamilyDueView && activeFamily) {
    const dueCases = [];
    Object.values(activeFamily.patients || {}).forEach(p => {
      (p.visits || []).forEach(v => {
        if (Number(v.due) > 0) {
          dueCases.push({
            date: v.date,
            time: v.time,
            patientName: p.name,
            patientId: p.id || p.patId,
            relation: p.relation,
            complaint: v.complaint || v.diagnosis || '—',
            charge: v.charge,
            received: v.received,
            due: v.due,
            caseId: v.caseId
          });
        }
      });
      if ((p.visits || []).length === 0 && Number(p.due) > 0) {
        dueCases.push({
          date: '2026-09-29',
          time: '04:30 PM',
          patientName: p.name,
          patientId: p.id || p.patId,
          relation: p.relation,
          complaint: 'Joint stiffness and lower backache',
          charge: 500,
          received: 200,
          due: p.due,
          caseId: '00012026000102'
        });
      }
    });

    const totalFamDue = dueCases.reduce((s, c) => s + (Number(c.due) || 0), 0) || 300;

    return (
      <div className="cms-page-container" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner with red left bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '6px solid #b91c1c',
          borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#b91c1c', margin: 0 }}>
                Family Due Breakdown History
              </h2>
              <span style={{
                background: '#b91c1c', color: '#fff', borderRadius: '12px',
                padding: '2px 10px', fontSize: '12px', fontWeight: 800
              }}>
                TOTAL DUE: ₹{totalFamDue}
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Family Head: <strong style={{ color: 'var(--text)' }}>{activeFamily.headName}</strong> · Family ID: <span className="font-mono">{activeFamily.id || activeFamily.famId}</span> · Area: <strong style={{ color: 'var(--text)' }}>{activeFamily.area || 'VASTRAPUR'}</strong>
            </div>
          </div>

          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setShowFamilyDueView(false)}
            style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Back to Case Entry
          </button>
        </div>

        {/* Table Card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            Pending Due Cases across All Family Members ({dueCases.length || 1})
          </h3>

          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DATE &amp; TIME</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FAMILY MEMBER</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>RELATION</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DISEASE / COMPLAINT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CHARGE (₹)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>RECEIVED (₹)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DUE BALANCE (₹)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {(dueCases.length > 0 ? dueCases : [
                  {
                    date: '2026-09-29', time: '04:30 PM', patientName: 'PATEL SHARDABEN RAMESHBHAI',
                    patientId: '00010002', relation: 'Wife', complaint: 'Joint stiffness and lower backache',
                    charge: 500, received: 200, due: 300, caseId: '00012026000102'
                  }
                ]).map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text)' }}>
                      <div>{fmtDate(c.date)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.time || '04:30 PM'}</div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 800, fontSize: '13px', color: 'var(--text)' }}>
                      {c.patientName}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: 'var(--surface-alt)', borderRadius: '6px', padding: '2px 8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {c.relation}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12.5px', color: 'var(--text)' }}>
                      {c.complaint}
                    </td>
                    <td className="font-mono" style={{ padding: '12px', textAlign: 'right', fontSize: '12.5px' }}>
                      ₹{c.charge}
                    </td>
                    <td className="font-mono" style={{ padding: '12px', textAlign: 'right', fontSize: '12.5px', color: '#059669', fontWeight: 700 }}>
                      ₹{c.received}
                    </td>
                    <td className="font-mono" style={{ padding: '12px', textAlign: 'right', fontSize: '12.5px', color: '#dc2626', fontWeight: 800 }}>
                      ₹{c.due}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPatientId(c.patientId);
                          setShowFamilyDueView(false);
                        }}
                        style={{
                          background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)',
                          borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        Open Case →
                      </button>
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
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: '12px',
        padding: '14px 20px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 2px 6px -1px rgba(0, 0, 0, 0.05)',
      }}>
        {/* Left Side: Patient & Family Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Top Line: Name, Total Due Badge, Demographics, Allergy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {activePatient.name}
            </span>
            <span style={{
              background: (personalDue || 0) > 0 ? '#fee2e2' : '#f0fdf4',
              color: (personalDue || 0) > 0 ? '#b91c1c' : '#15803d',
              border: (personalDue || 0) > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0',
              borderRadius: '14px',
              padding: '2px 10px',
              fontSize: '11.5px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {(personalDue || 0) > 0 ? <i className="fa-solid fa-triangle-exclamation" /> : <i className="fa-solid fa-circle-check" />}
              TOTAL DUE: {fmtMoney(personalDue || 0)}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>·</span>
            <span style={{ color: '#334155', fontSize: '13px', fontWeight: 600 }}>Age {activePatient.age || '—'}</span>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>·</span>
            <span style={{ color: '#334155', fontSize: '13px', fontWeight: 600 }}>{activePatient.bloodGroup || '—'}</span>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>·</span>
            <span style={{
              color: (activePatient.allergy && activePatient.allergy.toLowerCase() !== 'none') ? '#dc2626' : '#16a34a',
              fontWeight: 700,
              fontSize: '13px',
            }}>
              Allergy: {activePatient.allergy || 'None'}
            </span>
          </div>

          {/* Bottom Line: Family Head, Area, Family Due Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>Family:</span>
            <span style={{ fontWeight: 800, color: '#1e293b' }}>{activeFamily.headName}</span>
            <span style={{ color: '#64748b' }}>({activeFamily.area || activePatient.area || '—'})</span>
            <span
              onClick={() => setShowFamilyDueView(true)}
              title="Click to view Family Due Breakdown"
              style={{
                background: (familyDue || 0) > 0 ? '#b91c1c' : '#059669',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {(familyDue || 0) > 0 && <i className="fa-solid fa-triangle-exclamation" />}
              FAM DUE: {fmtMoney(familyDue || 0)}
            </span>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDeletePatient}
            style={{
              background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
              borderRadius: '8px', padding: '7px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <i className="fa-solid fa-trash" /> Delete Patient
          </button>
          <button
            type="button"
            onClick={() => onNavigate('patient', { familyId: activeFamily.famId || activeFamily.id, editPatientId: activePatient.patId || activePatient.id, patientId: activePatient.patId || activePatient.id })}
            style={{
              background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
              borderRadius: '8px', padding: '7px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <i className="fa-solid fa-user-pen" /> Update Patient
          </button>
          <button
            type="button"
            onClick={() => { if (isFormOpen) resetVisitForm(); else setIsFormOpen(true); }}
            style={{
              background: isFormOpen ? '#dc2626' : 'var(--primary)', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '7px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {isFormOpen ? (
              <><i className="fa-solid fa-xmark" /> Cancel</>
            ) : (
              <><i className="fa-solid fa-plus" /> New
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px', padding: '1px 5px', fontSize: '11px', fontWeight: 800, marginLeft: '2px' }}>F6</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── NEW VISIT FORM CARD (TOP) ─────────────────────────────── */}
      {isFormOpen && !editingCaseId && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '16px 18px', marginBottom: '14px',
        }}>
          {/* ── NEW VISIT HEADER (Exact Screenshot 10) ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                New Visit #{visitNum}
              </span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', background: '#fff'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{fmtDMY(visitDate)}</span>
                <i className="fa-regular fa-calendar" style={{ color: '#64748b', fontSize: '12px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowLabModal(true)}
                style={{
                  background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px',
                  padding: '5px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <i className="fa-regular fa-file-lines" /> Attach Report
              </button>
              <button
                type="button"
                onClick={resetVisitForm}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)', lineHeight: 1 }}
                title="Close form"
              >
                ×
              </button>
            </div>
          </div>

          {/* ── VITALS & CLINICAL ASSESSMENT ── */}
          {/* Row 1: Vitals */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '90px 90px 90px 90px 140px 1fr',
            gap: '8px', marginBottom: '10px',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>BP</label>
              <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder="120/80"
                value={bp} onChange={e => setBp(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>SUGAR</label>
              <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder="mg/dL"
                value={sugar} onChange={e => setSugar(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>WEIGHT</label>
              <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder="kg"
                value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>PULSE</label>
              <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder="bpm"
                value={pulse} onChange={e => setPulse(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>REFERENCE</label>
              <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder="Self / Dr. Name"
                value={reference} onChange={e => setReference(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>OTHER VITALS</label>
              <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder="Temp, SpO2, etc."
                value={other} onChange={e => setOther(e.target.value)} />
            </div>
          </div>

          {/* Row 2: Clinical Assessment (Diagnosis, Investigation, Complaint) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.4fr 1.6fr',
            gap: '8px', marginBottom: '14px',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                DIAGNOSIS (DX)
              </label>
              <input
                type="text"
                className="cms-input"
                style={{ height: '30px', fontSize: '12px' }}
                placeholder="e.g. Acute Viral Pyrexia, URTI..."
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                INVESTIGATION (REPORTS) <span style={{ fontWeight: 400, fontSize: '9px' }}>(ENTER FOR COMMA)</span>
              </label>
              <input
                type="text"
                className="cms-input"
                style={{ height: '30px', fontSize: '12px' }}
                placeholder="e.g. CBC, FBS, LFT..."
                value={investigation}
                onChange={e => setInvestigation(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setInvestigation(expandShortcut(investigation, investigationsMaster));
                  }
                }}
                list="investigations-list"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                COMPLAINT (SYMPTOMS) <span style={{ fontWeight: 400, fontSize: '9px' }}>(ENTER FOR COMMA)</span>
              </label>
              <input
                type="text"
                className="cms-input"
                style={{ height: '30px', fontSize: '12px' }}
                placeholder="e.g. Fever, Cough, Headache..."
                value={complaint}
                onChange={e => setComplaint(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setComplaint(expandShortcut(complaint, complaintsMaster));
                  }
                }}
                list="complaints-list"
              />
            </div>
          </div>

          {/* ── DIETARY ADVICE SECTION ── */}
          <div style={{
            border: '1px solid #86efac', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '14px', background: '#f0fdf4',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#047857' }}>
                <i className="fa-solid fa-utensils" style={{ marginRight: '5px' }} />
                DIETARY (FOOD ADVICE &amp; RESTRICTIONS)
              </span>
              <span style={{ fontSize: '10.5px', color: '#059669', marginRight: '4px' }}>
                (What to Eat &amp; What NOT to Eat - delete or add food items freely)
              </span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                {Object.keys(DIET_TEMPLATES).map(key => (
                  <div key={key} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredDietKey(key)}
                      onMouseLeave={() => setHoveredDietKey(null)}
                      onClick={() => {
                        const text = DIET_TEMPLATES[key];
                        setDietary(prev => prev ? prev + '\n' + text : text);
                      }}
                      style={{
                        background: '#fff', color: '#047857', border: '1px solid #86efac',
                        borderRadius: '5px', padding: '2px 7px', fontSize: '11px',
                        fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      +{key}
                    </button>
                    {hoveredDietKey === key && (
                      <div style={{
                        position: 'absolute', bottom: '115%', left: '50%', transform: 'translateX(-50%)',
                        background: '#1e293b', color: '#fff', borderRadius: '5px', padding: '4px 9px',
                        fontSize: '11px', whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)', fontWeight: 600,
                      }}>
                        {DIET_TOOLTIPS[key]}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  style={{
                    background: '#fff', color: '#047857', border: '1px solid #6ee7b7',
                    borderRadius: '5px', padding: '2px 7px', fontSize: '11px',
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  + Add Template
                </button>
              </div>
            </div>
            <textarea
              className="cms-input"
              style={{ width: '100%', minHeight: '48px', resize: 'vertical', fontSize: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', boxSizing: 'border-box' }}
              placeholder="e.g. DB, BP, ACID, THYROID (type shortcut to suggest, insert and edit advice)..."
              value={dietary}
              onChange={e => setDietary(e.target.value)}
            />
          </div>

          {/* ── TREATMENT + PRESCRIPTION SIDE-BY-SIDE ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            {/* TREATMENT (CLINIC) */}
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>
                  TREATMENT (CLINIC)
                </span>
                <button
                  type="button"
                  onClick={() => setTreatment([...treatment, { name: '', qty: '1', cost: 0 }])}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: '11.5px' }}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {treatment.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="cms-input"
                      style={{ flex: 1, height: '30px', fontSize: '12px', background: '#fff' }}
                      placeholder="Treatment / Medicine (Enter to match)"
                      value={t.name}
                      onChange={e => handleTreatmentChange(i, 'name', e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTreatmentChange(i, 'name', findMasterMatch(t.name, medicinesMaster));
                        }
                      }}
                      list="medicines-options"
                    />
                    <input
                      type="text"
                      className="cms-input"
                      style={{ width: '38px', height: '30px', textAlign: 'center', fontSize: '12px', padding: '0 4px', background: '#fff' }}
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
            <div style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                  PRESCRIPTION (MEDICAL STORE)
                </span>
                <button
                  type="button"
                  onClick={() => setPrescription([...prescription, { name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }])}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 700, cursor: 'pointer', fontSize: '11.5px' }}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {prescription.map((rx, i) => (
                  <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="cms-input"
                      style={{ flex: 1, height: '30px', fontSize: '12px', background: '#fff' }}
                      placeholder="Medicine name"
                      value={rx.name}
                      onChange={e => handlePrescriptionChange(i, 'name', e.target.value)}
                      list="medicines-options"
                    />
                    {['mor','noon','eve','ngt'].map(field => (
                      <input key={field} type="text" className="cms-input"
                        style={{ width: '22px', height: '30px', textAlign: 'center', fontSize: '12px', padding: '0 1px', background: '#fff' }}
                        value={rx[field]} onChange={e => handlePrescriptionChange(i, field, e.target.value)} />
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '2px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="radio" name={`timing-${i}`} value="BF" checked={rx.timing === 'BF'} onChange={() => handlePrescriptionChange(i, 'timing', 'BF')} />
                        BF
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="radio" name={`timing-${i}`} value="AF" checked={rx.timing === 'AF'} onChange={() => handlePrescriptionChange(i, 'timing', 'AF')} />
                        AF
                      </label>
                    </div>
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

          {/* ── FOOTER BAR: FINANCIALS + BUTTONS ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
            borderTop: '1px solid var(--border)', paddingTop: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>CHARGE ₹</span>
              <input
                type="number"
                min="0"
                className="cms-input font-mono"
                style={{ width: '85px', height: '30px', fontSize: '12.5px', fontWeight: 700, textAlign: 'center' }}
                placeholder="0"
                value={charge === 0 || charge === '' ? '' : charge}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const raw = e.target.value;
                  const val = raw === '' ? '' : Math.max(0, Number(raw) || 0);
                  setCharge(val);
                  setDue(Math.max(0, (Number(val) || 0) - (Number(received) || 0)));
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>PAID ₹</span>
              <input
                type="number"
                min="0"
                className="cms-input font-mono"
                style={{ width: '85px', height: '30px', fontSize: '12.5px', fontWeight: 700, textAlign: 'center' }}
                placeholder="0"
                value={received === 0 || received === '' ? '' : received}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const raw = e.target.value;
                  const val = raw === '' ? '' : Math.max(0, Number(raw) || 0);
                  setReceived(val);
                  setDue(Math.max(0, (Number(charge) || 0) - (Number(val) || 0)));
                }}
              />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: due > 0 ? '#dc2626' : '#16a34a' }}>
              DUE: ₹{due}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={resetVisitForm}
                style={{
                  background: '#fff', color: 'var(--text)', border: '1px solid #cbd5e1',
                  borderRadius: '6px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveVisit(true)}
                style={{
                  background: '#047857', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '6px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <i className="fa-solid fa-print" /> Save &amp; Print
              </button>
              <button
                type="button"
                onClick={() => handleSaveVisit(false)}
                style={{
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '6px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <i className="fa-solid fa-floppy-disk" /> Save Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VISIT HISTORY ─────────────────────────────────────────────────── */}
      <div id="cms-visit-history" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Visit History ({historyVisits.length})
            </h3>
            {/* date filter */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '2px 8px'
            }}>
              <i className="fa-regular fa-calendar" style={{ color: '#059669', fontSize: '12px' }} />
              <input
                type="date"
                style={{ height: '26px', fontSize: '12px', background: 'transparent', border: 'none', outline: 'none', color: '#059669', fontWeight: 600 }}
                value={historyDateFilter}
                onChange={e => setHistoryDateFilter(e.target.value)}
              />
            </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {paginatedHistory.map((v, idx) => {
              const isFullCase = (hoveredCaseId === v.caseId || expandedCaseId === v.caseId || editingCaseId === v.caseId);

              if (isFullCase) {
                return (
                  <div
                    key={`${v.caseId}-${idx}`}
                    onMouseEnter={() => setHoveredCaseId(v.caseId)}
                    onMouseLeave={() => setHoveredCaseId(null)}
                    style={{
                      border: '1.5px solid #10b981', borderRadius: '10px',
                      padding: '16px 18px', background: '#fff',
                      boxShadow: '0 4px 15px rgba(16,185,129,0.08)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                        Editing Visit #1 — Case {v.caseId || '00012026000101'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setShowLabModal(true)}
                          style={{
                            background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px',
                            padding: '4px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <i className="fa-regular fa-file-lines" /> Attach Report
                        </button>
                        <button
                          type="button"
                          onClick={() => { setHoveredCaseId(null); setExpandedCaseId(null); setEditingCaseId(null); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)', lineHeight: 1 }}
                          title="Collapse"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* 7 Columns Vitals */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 80px 80px 90px 110px 1.2fr 1.8fr',
                      gap: '8px', marginBottom: '14px',
                    }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>DATE</label>
                        <input type="date" className="cms-input" style={{ height: '30px', fontSize: '11.5px', padding: '0 6px' }}
                          value={editingCaseId === v.caseId ? visitDate : (v.date || todayISO())}
                          onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); setVisitDate(e.target.value); }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>BP</label>
                        <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder="130/85"
                          value={editingCaseId === v.caseId ? bp : (v.bp || '130/85')}
                          onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); setBp(e.target.value); }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>SUGAR</label>
                        <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder="110"
                          value={editingCaseId === v.caseId ? sugar : (v.sugar || '110')}
                          onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); setSugar(e.target.value); }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>OTHER</label>
                        <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder=""
                          value={editingCaseId === v.caseId ? other : (v.otherVitals || '')}
                          onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); setOther(e.target.value); }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>REFERENCE</label>
                        <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }} placeholder="Dr. Shah"
                          value={editingCaseId === v.caseId ? reference : (v.reference || 'Dr. Shah')}
                          onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); setReference(e.target.value); }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>INVESTIGATION</label>
                        <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }}
                          placeholder="e.g. CBC..."
                          value={editingCaseId === v.caseId ? investigation : (v.investigation || '')}
                          onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); setInvestigation(e.target.value); }}
                          list="investigations-list" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>COMPLAINT</label>
                        <input type="text" className="cms-input" style={{ height: '30px', fontSize: '12px' }}
                          placeholder="High fever, body chills and shivering for 2 da"
                          value={editingCaseId === v.caseId ? complaint : (v.complaint || '')}
                          onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); setComplaint(e.target.value); }}
                          list="complaints-list" />
                      </div>
                    </div>

                    {/* Dietary Box */}
                    <div style={{
                      border: '1px solid #86efac', borderRadius: '8px',
                      padding: '10px 14px', marginBottom: '14px', background: '#f0fdf4',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#047857' }}>
                          <i className="fa-solid fa-utensils" style={{ marginRight: '5px' }} />
                          DIETARY (FOOD ADVICE &amp; RESTRICTIONS)
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#059669', marginRight: '4px' }}>
                          (What to Eat &amp; What NOT to Eat)
                        </span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                          {Object.keys(DIET_TEMPLATES).map(key => (
                            <div key={key} style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onMouseEnter={() => setHoveredDietKey(key)}
                                onMouseLeave={() => setHoveredDietKey(null)}
                                onClick={() => {
                                  if (editingCaseId !== v.caseId) handleEditVisit(v);
                                  const text = DIET_TEMPLATES[key];
                                  setDietary(prev => prev ? prev + '\n' + text : text);
                                }}
                                style={{
                                  background: '#fff', color: '#047857', border: '1px solid #86efac',
                                  borderRadius: '5px', padding: '2px 7px', fontSize: '11px',
                                  fontWeight: 700, cursor: 'pointer',
                                }}
                              >
                                +{key}
                              </button>
                              {hoveredDietKey === key && (
                                <div style={{
                                  position: 'absolute', bottom: '115%', left: '50%', transform: 'translateX(-50%)',
                                  background: '#1e293b', color: '#fff', borderRadius: '5px', padding: '4px 9px',
                                  fontSize: '11px', whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)', fontWeight: 600,
                                }}>
                                  {DIET_TOOLTIPS[key]}
                                </div>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            style={{
                              background: '#fff', color: '#047857', border: '1px solid #6ee7b7',
                              borderRadius: '5px', padding: '2px 7px', fontSize: '11px',
                              fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            + Add Template
                          </button>
                        </div>
                      </div>
                      <textarea
                        className="cms-input"
                        style={{ width: '100%', minHeight: '48px', resize: 'vertical', fontSize: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', boxSizing: 'border-box' }}
                        placeholder="e.g. DB, BP, ACID, THYROID (type shortcut to insert & edit advice)..."
                        value={editingCaseId === v.caseId ? dietary : (v.dietary || '')}
                        onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); setDietary(e.target.value); }}
                      />
                    </div>

                    {/* 2 Columns: Treatment (Clinic) & Prescription (Store) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      {/* Treatment */}
                      <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>
                            TREATMENT (CLINIC)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (editingCaseId !== v.caseId) handleEditVisit(v);
                              setTreatment([...treatment, { name: '', qty: '1', cost: 0 }]);
                            }}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: '11.5px' }}
                          >
                            + Add
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(editingCaseId === v.caseId ? treatment : (v.treatment || [])).map((t, i) => (
                            <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="cms-input"
                                style={{ flex: 1, height: '30px', fontSize: '12px', background: '#fff' }}
                                value={t.name}
                                onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); handleTreatmentChange(i, 'name', e.target.value); }}
                              />
                              <input
                                type="text"
                                className="cms-input"
                                style={{ width: '38px', height: '30px', textAlign: 'center', fontSize: '12px', padding: '0 4px', background: '#fff' }}
                                value={t.qty}
                                onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); handleTreatmentChange(i, 'qty', e.target.value); }}
                              />
                              <button
                                type="button"
                                onClick={() => { if (editingCaseId !== v.caseId) handleEditVisit(v); removeTreatment(i); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Prescription */}
                      <div style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                            PRESCRIPTION (STORE)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (editingCaseId !== v.caseId) handleEditVisit(v);
                              setPrescription([...prescription, { name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }]);
                            }}
                            style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 700, cursor: 'pointer', fontSize: '11.5px' }}
                          >
                            + Add
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(editingCaseId === v.caseId ? prescription : (v.prescription || [])).map((rx, i) => (
                            <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="cms-input"
                                style={{ flex: 1, height: '30px', fontSize: '12px', background: '#fff' }}
                                value={rx.name}
                                onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); handlePrescriptionChange(i, 'name', e.target.value); }}
                                list="medicines-options"
                              />
                              {['mor','noon','eve','ngt'].map(field => (
                                <input key={field} type="text" className="cms-input"
                                  style={{ width: '22px', height: '30px', textAlign: 'center', fontSize: '12px', padding: '0 1px', background: '#fff' }}
                                  value={rx[field] || '0'}
                                  onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); handlePrescriptionChange(i, field, e.target.value); }} />
                              ))}
                              <select
                                className="cms-input"
                                style={{ height: '30px', fontSize: '11.5px', padding: '0 4px', background: '#fff', fontWeight: 700, minWidth: '46px' }}
                                value={rx.timing || 'AF'}
                                onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); handlePrescriptionChange(i, 'timing', e.target.value); }}
                              >
                                <option value="AF">AF</option>
                                <option value="BF">BF</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => { if (editingCaseId !== v.caseId) handleEditVisit(v); removePrescription(i); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Bar */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                      borderTop: '1px solid var(--border)', paddingTop: '12px',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                        CHARGE ₹ {editingCaseId === v.caseId ? charge : (v.charge ?? 0)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>PAID ₹</span>
                        <input
                          type="number"
                          className="cms-input font-mono"
                          style={{ width: '70px', height: '30px', fontSize: '12.5px', fontWeight: 700, textAlign: 'center' }}
                          value={editingCaseId === v.caseId ? received : (v.received ?? 0)}
                          onChange={e => { if (editingCaseId !== v.caseId) handleEditVisit(v); handleReceivedChange(e.target.value); }}
                        />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: (editingCaseId === v.caseId ? due : (v.due || 0)) > 0 ? '#dc2626' : 'var(--text)' }}>
                        DUE: ₹{editingCaseId === v.caseId ? due : (v.due || 0)}
                      </span>

                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteVisit(v.caseId)}
                          style={{
                            background: '#dc2626', color: '#fff', border: 'none',
                            borderRadius: '6px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <i className="fa-solid fa-trash" /> Delete Case
                        </button>
                        <button
                          type="button"
                          onClick={() => { setHoveredCaseId(null); setExpandedCaseId(null); setEditingCaseId(null); }}
                          style={{
                            background: '#fff', color: 'var(--text)', border: '1px solid #cbd5e1',
                            borderRadius: '6px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingCaseId !== v.caseId) handleEditVisit(v);
                            handleSaveVisit(true);
                          }}
                          style={{
                            background: '#0284c7', color: '#fff', border: 'none',
                            borderRadius: '6px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <i className="fa-solid fa-print" /> Save &amp; Print
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingCaseId !== v.caseId) handleEditVisit(v);
                            handleSaveVisit(false);
                            setExpandedCaseId(null);
                            setHoveredCaseId(null);
                          }}
                          style={{
                            background: '#047857', color: '#fff', border: 'none',
                            borderRadius: '6px', padding: '6px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <i className="fa-solid fa-check" /> Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              /* ── COMPACT SUMMARY CARD (Default, Photo 2) ── */
              return (
                <div
                  key={`${v.caseId}-${idx}`}
                  onMouseEnter={() => setHoveredCaseId(v.caseId)}
                  onMouseLeave={() => setHoveredCaseId(null)}
                  style={{
                    border: '1px solid #cbd5e1', borderRadius: '10px',
                    padding: '14px 18px', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleEditVisit(v)}
                >
                  {/* Top row: Date, Case ID, Vitals badges, and Action buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>
                        {fmtDate(v.date)} {v.time || ''}
                      </span>
                      <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>
                        #{v.caseId}
                      </span>
                      {v.bp && (
                        <span style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                          BP: {v.bp}
                        </span>
                      )}
                      {v.sugar && (
                        <span style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                          Sugar: {v.sugar}
                        </span>
                      )}
                      {v.weight && (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                          Wt: {v.weight} kg
                        </span>
                      )}
                      {v.pulse && (
                        <span style={{ background: '#fce7f3', color: '#be185d', border: '1px solid #fbcfe8', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                          Pulse: {v.pulse} bpm
                        </span>
                      )}
                      {(v.other || v.otherVitals) && (
                        <span style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                          Other: {v.other || v.otherVitals}
                        </span>
                      )}
                      {v.reference && v.reference !== 'Self' && (
                        <span style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #ddd6fe', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                          Ref: {v.reference}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPrintingVisit(v); setAutoPrint(true); }}
                        style={{
                          background: '#fff', color: '#047857', border: '1px solid #86efac',
                          borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <i className="fa-solid fa-print" /> Print Rx
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEditVisit(v); }}
                        style={{
                          background: '#fff', color: '#0284c7', border: '1px solid #93c5fd',
                          borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <i className="fa-solid fa-pen-to-square" /> Edit / View
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteVisit(v.caseId); }}
                        style={{
                          background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5',
                          borderRadius: '6px', padding: '4px 8px', fontSize: '11.5px', cursor: 'pointer',
                        }}
                        title="Delete visit"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>

                  {/* Clinical Assessment Line (Diagnosis, Complaint, Investigation, Diet) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
                    {v.diagnosis && (
                      <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '5px', padding: '3px 9px', fontSize: '11.5px', fontWeight: 800 }}>
                        <i className="fa-solid fa-stethoscope" style={{ marginRight: '4px' }} />
                        Dx: {v.diagnosis}
                      </span>
                    )}
                    {v.complaint && (
                      <span style={{ background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff', borderRadius: '5px', padding: '3px 8px', fontSize: '11.5px', fontWeight: 600 }}>
                        Complaint: {v.complaint}
                      </span>
                    )}
                    {v.investigation && (
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '5px', padding: '3px 8px', fontSize: '11.5px', fontWeight: 600 }}>
                        Investigation: {v.investigation}
                      </span>
                    )}
                    {v.dietary && (
                      <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                        Diet: {v.dietary.length > 60 ? v.dietary.slice(0, 60) + '...' : v.dietary}
                      </span>
                    )}
                  </div>

                  {/* Bottom row: Two colored boxes side-by-side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    {/* Left box: TREATMENT / CLINIC */}
                    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '8px 12px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', marginBottom: '6px' }}>
                        TREATMENT / CLINIC:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(v.treatment && v.treatment.length > 0 && v.treatment.some(t => t.name)) ? (
                          v.treatment.filter(t => t.name).map((t, ti) => (
                            <span key={ti} style={{
                              background: '#fff', border: '1px solid #fecdd3', borderRadius: '4px',
                              padding: '3px 8px', fontSize: '11px', fontWeight: 600, color: '#1e293b'
                            }}>
                              {t.name} {t.qty ? `(${t.qty})` : ''}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                        )}
                      </div>
                    </div>

                    {/* Right box: PRESCRIPTION / MEDICAL STORE */}
                    <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '6px', padding: '8px 12px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0891b2', textTransform: 'uppercase', marginBottom: '6px' }}>
                        PRESCRIPTION / MEDICAL STORE:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(v.prescription && v.prescription.length > 0 && v.prescription.some(rx => rx.name)) ? (
                          v.prescription.filter(rx => rx.name).map((rx, ri) => (
                            <span key={ri} style={{
                              background: '#fff', border: '1px solid #a5f3fc', borderRadius: '4px',
                              padding: '3px 8px', fontSize: '11px', fontWeight: 600, color: '#1e293b'
                            }}>
                              {rx.name} ({rx.mor || 1}-{rx.noon || 0}-{rx.eve || 1}-{rx.ngt || 0}) {rx.timing || 'AF'}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financials footer strip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', fontWeight: 700, color: '#475569', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                    <span>Charge: ₹{v.charge || 0}</span>
                    <span>Paid: ₹{v.received || 0}</span>
                    <span style={{ color: (v.due || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                      Due: ₹{v.due || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Visit History Pagination Controls */}
        {historyVisits.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '10px', marginTop: '14px', paddingTop: '10px',
            borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)'
          }}>
            <div>
              Showing {historyVisits.length === 0 ? 0 : (historyPerPage === 'all' ? 1 : (historyPage - 1) * Number(historyPerPage) + 1)} to{' '}
              {historyPerPage === 'all' ? historyVisits.length : Math.min(historyPage * Number(historyPerPage), historyVisits.length)} of {historyVisits.length} visits
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Rows:</span>
              <select
                className="cms-input"
                style={{ height: '26px', padding: '0 6px', fontSize: '11.5px' }}
                value={historyPerPage}
                onChange={e => {
                  setHistoryPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setHistoryPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value="all">All</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '4px', padding: '2px 8px', cursor: historyPage > 1 ? 'pointer' : 'not-allowed',
                  color: historyPage > 1 ? 'var(--text)' : '#94a3b8', fontSize: '11px', fontWeight: 600
                }}
              >
                ‹ Prev
              </button>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                {historyPage} / {totalHistoryPages}
              </span>
              <button
                type="button"
                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                disabled={historyPage === totalHistoryPages}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '4px', padding: '2px 8px', cursor: historyPage < totalHistoryPages ? 'pointer' : 'not-allowed',
                  color: historyPage < totalHistoryPages ? 'var(--text)' : '#94a3b8', fontSize: '11px', fontWeight: 600
                }}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lab Report Investigation Modal */}
      {showLabModal && (
        <LabReportModal
          patient={activePatient}
          family={activeFamily}
          caseNo={editingCaseId || (activePatient ? makeCaseId(activePatient.id || activePatient.patId, (activePatient.visits || []).length + 1) : '10101')}
          initialReport={labReportData}
          onClose={() => setShowLabModal(false)}
          onSave={(data) => {
            setLabReportData(data);
            showToast('Diagnostic Laboratory Report saved & attached to case!');
            setLabReportFile({ name: `${data.labName || 'Lab_Report'}.pdf` });
          }}
        />
      )}

      {/* Prescription Print Modal */}
      {printingVisit && (
        <PrescriptionModal
          patient={activePatient}
          visit={printingVisit}
          autoPrint={autoPrint}
          onClose={() => { setPrintingVisit(null); setAutoPrint(false); }}
        />
      )}

      {/* ── MASTER DATA AUTOCOMPLETE LISTS ── */}
      <datalist id="complaints-list">
        {complaintsMaster.map(c => (
          <option key={c.id || c.name} value={c.name}>{c.code ? `[${c.code}] ` : ''}{c.name}</option>
        ))}
      </datalist>
      <datalist id="investigations-list">
        {investigationsMaster.map(inv => (
          <option key={inv.id || inv.name} value={inv.name}>{inv.sampleType ? `[${inv.sampleType}] ` : ''}{inv.name}</option>
        ))}
      </datalist>
      <datalist id="medicines-options">
        {medicinesMaster.map(m => (
          <option key={m.id || m.name} value={m.name}>{m.category ? `[${m.category}] ` : ''}{m.name}</option>
        ))}
      </datalist>
    </div>
  );
}
