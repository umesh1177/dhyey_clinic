/**
 * =========================================================
 * CASE ENTRY & CLINICAL CONSULTATION CONTROLLER
 * Full Clinical Workflow matching Screenshots 1 & 2:
 * 1) Top Patient Search & Clean Initial Search View
 * 2) Patient Header Banner with Personal Due & Family Due Buttons
 * 3) New Visit / Case Entry Form (Compact BP/Sugar/Other/Ref, Wide Investigation/Complaint)
 * 4) Comma-separated Multi-token Autocomplete for Complaint & Investigation with Auto-learn
 * 5) Zero Default Due Balance on New Visit Form (Charge & Paid default to empty/0)
 * 6) Auto-Add Row on typing in Treatment (Clinic) & Prescription (Medical Store)
 * 7) Visit History Date Filter with Show All Dates revert
 * 8) In-Page Modal for "View Detail" on history cards and "Open Case" on Family Due page
 * 9) Delete Particular Case Entry Button on each visit
 * 10) Total Due Click -> Moves & highlights due cases to the TOP with cancel/revert
 * 11) Edit Patient Button -> Preserves in-progress consultation draft
 * =========================================================
 */

import { apiFetch, getLocalDB, saveLocalDB, getAuthSession, pad, todayISO, nowTime, fmtDate, fmtMoney, uid, showToast, getSharedMasterCollection, addSharedMasterItem } from './api.js';
import { openPrescriptionModal, DIETARY_TRANSLATIONS } from './prescription.js';
import { openLabReportModal } from './history.js';

export function renderConsultationView(container, selection, onSelectPatient, onPrintRequested, onOpenLabReports, onEditPatient) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';
  const db = getLocalDB(clinicId);

  // Determine active clinic services
  const activeClinicObj = (session?.profile?.clinics || []).find(c => c.id === clinicId) || session?.profile?.clinics?.[0];
  let clinicServices = activeClinicObj?.services || session?.profile?.services;
  if (!clinicServices || !Array.isArray(clinicServices)) {
    clinicServices = ['digitalPrescription', 'certificates', 'billing'];
  }

  const hasDigitalRx = clinicServices.includes('digitalPrescription');
  const hasCertificates = clinicServices.includes('certificates');
  const hasBilling = clinicServices.includes('billing');

  let { familyId, patientId } = selection || {};
  let family = familyId ? (db.families[familyId] || Object.values(db.families || {}).find(f => (f.famId === familyId || f.id === familyId))) : null;
  let patient = family && patientId ? (family.patients?.[patientId] || Object.values(family.patients || {}).find(p => (p.patId === patientId || p.id === patientId))) : null;

  // Views state: 'case' | 'family-due'
  let currentSubView = 'case';

  // Due filter state: true if showing due cases on top
  let showDueCasesOnTop = false;

  // Date filter state: specific date string YYYY-MM-DD or empty
  let filterDate = '';

  // New Visit Form State
  let isNewVisitOpen = false;
  let editingVisitId = null;

  // Attached Lab Report State (Photos 1 & 2)
  let attachedLabReport = null;

  // Inline Editable History Card State (Matching User Photo)
  let inlineEditingVisitId = null;
  let inlineEditingTreatments = [];
  let inlineEditingPrescriptions = [];

  // Form row models
  let treatmentRows = [{ name: '', qty: '1' }];
  let prescriptionRows = [{ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }];

  // Restore draft case if returning from Edit Patient
  try {
    const savedDraftRaw = sessionStorage.getItem('cms_active_case_draft');
    if (savedDraftRaw) {
      const savedDraft = JSON.parse(savedDraftRaw);
      if (savedDraft && savedDraft.patientId === patient?.id && savedDraft.draft) {
        const d = savedDraft.draft;
        isNewVisitOpen = d.isNewVisitOpen !== undefined ? d.isNewVisitOpen : true;
        editingVisitId = d.editingVisitId || null;
        if (d.attachedLabReport) attachedLabReport = d.attachedLabReport;
        if (d.treatmentRows && d.treatmentRows.length > 0) treatmentRows = d.treatmentRows;
        if (d.prescriptionRows && d.prescriptionRows.length > 0) prescriptionRows = d.prescriptionRows;
        sessionStorage.removeItem('cms_active_case_draft');
        setTimeout(() => {
          showToast('✨ Restored your in-progress case entry draft!');
        }, 150);
      }
    }
  } catch (e) {}

  // Calculate Personal & Family Dues
  function computeDues() {
    let personalDue = 0;
    if (patient && patient.visits) {
      personalDue = patient.visits.reduce((acc, v) => acc + (Number(v.due) || 0), 0);
    }

    let familyDue = 0;
    if (family && family.patients) {
      Object.values(family.patients).forEach((p) => {
        (p.visits || []).forEach((v) => {
          familyDue += Number(v.due) || 0;
        });
      });
    }

    return { personalDue, familyDue };
  }

  function renderView() {
    if (currentSubView === 'family-due') {
      renderFamilyDueView();
      return;
    }

    const { personalDue, familyDue } = computeDues();
    let rawVisits = (patient?.visits || []).slice().reverse();

    // Filter by Date if filterDate is active
    let visits = rawVisits;
    if (filterDate) {
      visits = visits.filter(v => (v.date || '').startsWith(filterDate));
    }

    // Sort / Filter if showDueCasesOnTop is true
    if (showDueCasesOnTop) {
      const dueVisits = visits.filter(v => Number(v.due) > 0);
      const paidVisits = visits.filter(v => Number(v.due) <= 0);
      visits = [...dueVisits, ...paidVisits];
    }

    container.innerHTML = `
      <div class="cms-case-container">
        
        <!-- Top Search Bar -->
        <div class="cms-card" style="padding: 10px 16px; border-radius: 12px;">
          <div style="position: relative;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 14px;"></i>
            <input type="text" id="case-search-input" class="cms-input" style="padding-left: 38px; border-radius: 9999px; height: 42px; font-size: 13.5px;" placeholder="Find Patient by Name, Patient ID, or Family Head..." ${!patient ? 'autofocus' : ''} />
            <div id="case-search-results" class="cms-card" style="position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 100; max-height: 280px; overflow-y: auto; display: none; padding: 6px; box-shadow: var(--shadow-lg);"></div>
          </div>
        </div>

        ${
          patient
            ? `
          <!-- Patient Header Banner (Matching Screenshot 1) -->
          <div class="cms-patient-header-banner" id="patient-banner-box">
            
            <!-- Line 1: Patient Name, Total Due, Actions -->
            <div class="cms-patient-header-row-top">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span class="cms-patient-header-title">${patient.name}</span>
                <button type="button" id="btn-personal-due" class="cms-due-pill-btn" title="Click to show all due cases on top of history">
                  <i class="fa-solid fa-triangle-exclamation" style="font-size: 10px;"></i>
                  <span>TOTAL DUE: ₹${personalDue}</span>
                </button>
              </div>

              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button type="button" id="btn-delete-patient" class="cms-btn-del-patient">
                  Delete Patient
                </button>
                <button type="button" id="btn-edit-patient-info" class="cms-btn-edit-patient">
                  Edit Patient
                </button>
                <button type="button" id="btn-toggle-visit-form" class="cms-btn-new-visit">
                  <span>+ New Visit</span>
                  <span class="cms-kbd" style="background: rgba(255,255,255,0.25); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px;">F6</span>
                </button>
              </div>
            </div>

            <!-- Line 2: Family Meta, Family Due, Age, Blood Group, Allergy -->
            <div class="cms-patient-header-row-bottom">
              <span>Family: <b>${family?.headName || '—'}</b> (${family?.area || 'VASTRAPUR'})</span>
              
              <button type="button" id="btn-family-due-breakdown" class="cms-fam-due-btn" title="Click to open family due breakdown">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 9px;"></i>
                <span>FAM DUE: ₹${familyDue}</span>
              </button>

              <span>&bull; Age ${patient.age || '—'}</span>
              <span>&bull; ${patient.bloodGroup || 'O+'}</span>
              <span>&bull;</span>
              <span style="background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 11.5px;">
                Allergy: ${patient.allergy && patient.allergy !== 'None' ? patient.allergy : 'None'}
              </span>
            </div>
          </div>

          <!-- New Visit / Case Entry Form Box (Matching Screenshot 1) -->
          <div id="visit-form-drawer" style="display: ${isNewVisitOpen ? 'block' : 'none'};">
            <form id="form-case-entry" class="cms-visit-form-box">
              
              <!-- Form Top Bar -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 8px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <span class="font-display" style="font-weight: 800; font-size: 16px; color: #0f5132;" id="visit-form-title">
                    ${editingVisitId ? `Case #${editingVisitId} (Editing)` : `New Visit #${(patient.visits || []).length + 1}`}
                  </span>
                  <input type="date" id="visit-date-input" style="border: 1px solid var(--border); border-radius: 6px; padding: 3px 8px; font-size: 13px; font-weight: 700; color: var(--text); background: var(--surface);" value="${todayISO()}" required />
                  
                  <!-- Attach Report Button (Photos 1 & 2) -->
                  <button type="button" id="btn-attach-report" class="cms-btn cms-btn-sm" style="background: #0284c7; color: #ffffff; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 6px; border: none; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 1px 3px rgba(2,132,199,0.3); transition: all 0.15s ease;" title="Attach or Edit Laboratory Investigation & Radiology Reports">
                    <i class="fa-solid fa-file-medical"></i>
                    <span>${attachedLabReport ? 'Edit Attached Report' : 'Attach Report'}</span>
                  </button>

                  ${
                    attachedLabReport
                      ? `
                    <span class="cms-pill" id="badge-report-attached" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">
                      <i class="fa-solid fa-check"></i> Report Attached (${(attachedLabReport.summaryTags || []).length || '1'} tests)
                    </span>
                  `
                      : ''
                  }
                </div>
                <button type="button" id="btn-close-visit" class="cms-btn-ghost" style="padding: 4px 8px; font-size: 16px; color: var(--text-muted);" title="Close form">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <!-- Row 1: Vitals & Observations (Narrow BP, Sugar, Other, Ref; Wide Investigation, Complaint) -->
              <div class="cms-visit-vitals-row">
                <div class="cms-vital-input-col">
                  <label for="input-bp">BP</label>
                  <input type="text" id="input-bp" placeholder="120/80" list="dl-bp-list" />
                </div>

                <div class="cms-vital-input-col">
                  <label for="input-sugar">SUGAR</label>
                  <input type="text" id="input-sugar" placeholder="" />
                </div>

                <div class="cms-vital-input-col">
                  <label for="input-other">OTHER</label>
                  <input type="text" id="input-other" placeholder="" />
                </div>

                <div class="cms-vital-input-col">
                  <label for="input-reference">REFERENCE</label>
                  <input type="text" id="input-reference" placeholder="" list="dl-refdr-list" />
                </div>

                <div class="cms-vital-input-col cms-col-wide" style="position: relative;">
                  <label for="input-investigation">
                    INVESTIGATION (REPORTS)
                    <span style="font-size: 9.5px; font-weight: normal; color: var(--text-muted);">(comma-separated)</span>
                  </label>
                  <input type="text" id="input-investigation" placeholder="e.g. CBC, Lipid Profile, Urine R/M..." autocomplete="off" />
                </div>

                <div class="cms-vital-input-col cms-col-wide" style="position: relative;">
                  <label for="input-complaint">
                    COMPLAINT (SYMPTOMS)
                    <span style="font-size: 9.5px; font-weight: normal; color: var(--text-muted);">(comma-separated)</span>
                  </label>
                  <input type="text" id="input-complaint" placeholder="e.g. Fever, Cough, Headache..." autocomplete="off" />
                </div>
              </div>

              <!-- Row 1.5: Dietary Advice & Shortcut Expansions with + Add New Template -->
              <div class="cms-visit-dietary-row" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <label for="input-dietary" style="margin-bottom: 0; font-size: 11.5px; font-weight: 800; color: #0f5132; display: flex; align-items: center; gap: 6px;">
                      <i class="fa-solid fa-utensils"></i>
                      <span>DIETARY (FOOD ADVICE &amp; RESTRICTIONS)</span>
                    </label>
                    <span style="font-size: 10px; color: var(--text-muted);">(What to Eat &amp; What NOT to Eat - delete or add food items freely)</span>
                  </div>

                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <!-- Quick Shortcut Chips (Rendered dynamically from clinic db.dietary) -->
                    <div style="display: flex; gap: 3px; flex-wrap: wrap;" class="form-dietary-chips">
                      ${renderDietaryChipsHTML(db, 'form')}
                    </div>

                    <button type="button" id="btn-quick-add-dietary" class="cms-btn cms-btn-ghost cms-btn-sm" style="padding: 2px 8px; font-size: 11px; color: #0f5132; border: 1px solid #86efac; background: #fff; font-weight: 700; border-radius: 4px;" title="Create new Dietary Template into Masters">
                      <i class="fa-solid fa-plus"></i> Add Template
                    </button>
                  </div>
                </div>

                <div style="position: relative; width: 100%;">
                  <input type="text" id="input-dietary" class="cms-input" placeholder="e.g. DB, BP, ACID, THYROID (type shortcut to suggest, insert and edit advice)..." autocomplete="off" style="background: #ffffff; border-color: #86efac; font-size: 12.5px; padding: 6px 10px;" />
                </div>
              </div>

              <!-- Row 2: Split Panels for Treatment & Prescription (Adapted to clinic services) -->
              <div class="cms-visit-split-row" style="${!hasDigitalRx ? 'grid-template-columns: 1fr;' : ''}">
                
                <!-- Left: Treatment (Clinic) -->
                <div class="cms-treatment-panel">
                  <div class="cms-treatment-panel-title">
                    <span>TREATMENT (CLINIC)</span>
                    <button type="button" id="btn-add-treatment-item" class="cms-btn cms-btn-ghost" style="padding: 2px 6px; font-size: 11px; color: #dc2626;">
                      <i class="fa-solid fa-plus"></i> Add
                    </button>
                  </div>
                  <div id="treatment-items-container" style="display: flex; flex-direction: column; gap: 6px;"></div>
                </div>

                ${
                  hasDigitalRx
                    ? `
                <!-- Right: Prescription (Medical Store) -->
                <div class="cms-prescription-panel">
                  <div class="cms-prescription-panel-title">
                    <span>PRESCRIPTION (MEDICAL STORE)</span>
                    <button type="button" id="btn-add-prescription-item" class="cms-btn cms-btn-ghost" style="padding: 2px 6px; font-size: 11px; color: #0d9488;">
                      <i class="fa-solid fa-plus"></i> Add
                    </button>
                  </div>
                  <div id="prescription-items-container" style="display: flex; flex-direction: column; gap: 6px;"></div>
                </div>
                `
                    : ''
                }
              </div>

              <!-- Row 3: Financials (Charge, Paid, Due) & Action Buttons (Defaults to 0) -->
              <div class="cms-financial-row">
                <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-weight: 800; font-size: 12px; color: var(--text);">CHARGE ₹</label>
                    <input type="number" id="input-charge" style="width: 85px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 6px; font-weight: 800; font-family: var(--font-mono);" value="" placeholder="0" min="0" step="10" />
                  </div>

                  <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-weight: 800; font-size: 12px; color: var(--text);">PAID ₹</label>
                    <input type="number" id="input-paid" style="width: 85px; padding: 5px 8px; border: 1px solid #0f5132; border-radius: 6px; font-weight: 800; font-family: var(--font-mono);" value="" placeholder="0" min="0" step="10" />
                  </div>

                  <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 13px;">
                    <span>DUE:</span>
                    <span id="label-computed-due" style="font-size: 14px; font-weight: 800; font-family: var(--font-mono); color: #15803d;">₹0</span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                  ${
                    editingVisitId
                      ? `
                    <button type="button" id="btn-delete-editing-visit" class="cms-btn-danger" data-visitid="${editingVisitId}" style="padding: 7px 16px; border-radius: 6px; font-weight: 700; border: none; display: inline-flex; align-items: center; gap: 6px; background: #dc2626; color: #fff; cursor: pointer;" title="Delete this Case #${editingVisitId}">
                      <i class="fa-solid fa-trash-can"></i>
                      <span>Delete Case</span>
                    </button>
                  `
                      : ''
                  }
                  <button type="button" id="btn-cancel-visit" class="cms-btn cms-btn-ghost" style="padding: 7px 18px; border: 1px solid var(--border); font-weight: 700;">
                    Cancel
                  </button>
                  <button type="submit" class="cms-btn" style="background: #0f5132; color: #fff; padding: 7px 24px; border-radius: 6px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-floppy-disk"></i>
                    <span id="btn-submit-case-text">${editingVisitId ? (hasDigitalRx ? 'Update & Print' : 'Update Visit') : (hasDigitalRx ? 'Save & Print' : 'Save Visit')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <!-- Visit History Section (Matching Screenshot 2) -->
          <div class="cms-card" id="visit-history-section" style="padding: 16px 20px; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                <div style="font-family: var(--font-display); font-weight: 800; font-size: 16px; color: var(--text);">
                  Visit History (${visits.length}${rawVisits.length !== visits.length ? ` of ${rawVisits.length}` : ''})
                </div>

                <!-- Date Filter Control -->
                <div style="display: flex; align-items: center; gap: 6px; background: var(--surface-alt); padding: 3px 8px; border-radius: 8px; border: 1px solid var(--border);">
                  <label for="history-date-filter" style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    <i class="fa-solid fa-calendar-day" style="color: var(--primary);"></i> Date:
                  </label>
                  <input type="date" id="history-date-filter" class="cms-input" style="padding: 2px 6px; font-size: 12px; border-radius: 4px; width: 130px; height: 26px;" value="${filterDate || ''}" />
                  ${
                    filterDate
                      ? `
                    <button type="button" id="btn-clear-date-filter" class="cms-btn cms-btn-ghost cms-btn-sm" style="padding: 2px 6px; font-size: 11px; border: 1px solid var(--border); background: #fff;" title="Show all dates">
                      <i class="fa-solid fa-xmark"></i> Clear
                    </button>
                  `
                      : ''
                  }
                </div>
              </div>

              ${
                showDueCasesOnTop
                  ? `
                <div class="cms-due-alert-banner" style="margin-top: 4px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-triangle-exclamation" style="color: #dc2626; font-size: 13px;"></i>
                    <span style="font-weight: 800; font-size: 12px; color: #b91c1c;">
                      Pending Due Cases Highlighted with Red Border (${rawVisits.filter(v => Number(v.due) > 0).length} Cases Pending Settlement)
                    </span>
                  </div>
                  <button type="button" id="btn-clear-due-filter" class="cms-btn cms-btn-ghost cms-btn-sm" style="font-size: 11px; padding: 3px 8px; border: 1px solid #fca5a5; background: #fff; color: #b91c1c; font-weight: 700;">
                    <i class="fa-solid fa-arrow-rotate-left"></i> Revert Order
                  </button>
                </div>
              `
                  : ''
              }
            </div>

            <div id="visit-history-list" style="display: flex; flex-direction: column;">
              ${
                visits.length === 0
                  ? `<div style="padding: 35px 20px; text-align: center; color: var(--text-muted);">
                      <i class="fa-solid fa-calendar-xmark" style="font-size: 24px; margin-bottom: 8px; opacity: 0.7;"></i>
                      <div>${filterDate ? `No visits recorded on <b>${fmtDate(filterDate)}</b>.` : 'No visits recorded yet.'}</div>
                      ${filterDate ? `<button type="button" id="btn-show-all-dates-empty" class="cms-btn cms-btn-ghost cms-btn-sm" style="margin-top: 8px; border: 1px solid var(--border);"><i class="fa-solid fa-arrow-rotate-left"></i> Show All Visits</button>` : ''}
                    </div>`
                  : visits
                      .map((v, idx) => {
                        const visitKey = v.id || v.caseId;
                        // If this card is currently opened in inline editable mode (Matching user photo)
                        if (inlineEditingVisitId && (inlineEditingVisitId === visitKey || inlineEditingVisitId === v.caseId || inlineEditingVisitId === v.id)) {
                          return renderHistoryCardEditableHTML(v);
                        }
                        // Latest 2 entries: Full Card View (unless due filter is active, where all due are full cards)
                        if (idx < 2 || (showDueCasesOnTop && Number(v.due) > 0)) {
                          return renderHistoryCardFullHTML(v);
                        }
                        // Older entries: Compact Row View with Hover Expand
                        return renderHistoryRowCompactHTML(v);
                      })
                      .join('')
              }
            </div>
          </div>
        `
            : `
          <!-- Initial Search Prompt View when directly clicking Patient Record -->
          <div class="cms-card" style="padding: 40px 24px; text-align: center; color: var(--text-muted); border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 14px;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--primary-soft, rgba(37,99,235,0.1)); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 26px;">
              <i class="fa-solid fa-hospital-user"></i>
            </div>
            <div>
              <div class="font-display" style="font-size: 18px; font-weight: 800; color: var(--text);">Search Patient to Open Case Record</div>
              <div style="font-size: 13px; margin-top: 4px; max-width: 500px; line-height: 1.5;">Type patient name, 8-digit Patient ID, Family Head name, or Area in the search bar above to start clinical consultation and review case history.</div>
            </div>
            
            <!-- Quick Select List of Recent Patients -->
            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 520px; margin-top: 6px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; text-align: left; letter-spacing: 0.5px;">
                Recent Patients in Clinic (Click to Open Record):
              </div>
              ${
                getRecentPatients(db).map(({ fam, pat }) => `
                  <div class="cms-card cms-clickable quick-select-pat-item" data-famid="${fam.id}" data-patid="${pat.id}" style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); border-radius: 8px; text-align: left; transition: all 0.15s ease;">
                    <div>
                      <b style="font-size: 13.5px; color: var(--text);">${pat.name}</b>
                      <span style="font-size: 12px; color: var(--text-muted);">(${pat.relation || 'Head'})</span>
                      <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                        ${fam.headName} &middot; FAM ${fam.id} &middot; ${fam.area || '—'}
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cms-kbd font-mono" style="font-size: 11px;">PT ${pat.id}</span>
                      <i class="fa-solid fa-arrow-right" style="color: var(--primary);"></i>
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        `
        }

        <!-- Global In-Page Case Details Modal Mount Point -->
        <div id="case-modal-overlay"></div>
      </div>
    `;

    attachEventHandlers();
  }

  // ==========================================
  // FULL HISTORY CARD (Matching Screenshot 2)
  // ==========================================
  function renderHistoryCardFullHTML(v) {
    const treatments = (v.treatment || []).filter(t => t.name && t.name.trim());
    const prescriptions = (v.prescription || []).filter(p => p.name && p.name.trim());
    const isDueHighlighted = showDueCasesOnTop && Number(v.due) > 0;
    const visitKey = v.id || v.caseId;

    return `
      <div class="cms-history-card-full ${isDueHighlighted ? 'cms-card-has-due' : ''}" data-caseid="${v.caseId}" data-visitid="${visitKey}" id="history-card-${visitKey}" title="Click card to open & edit Case #${v.caseId} in form">
        
        <!-- Line 1: Date & Time, Due Badge, Actions -->
        <div class="cms-history-header-line">
          <div class="cms-history-date-text">
            <span>${fmtDate(v.date)} ${v.time || '10:00'}</span>
            ${Number(v.due) > 0 ? `<span class="cms-due-pill-btn" style="cursor: pointer; padding: 2px 8px; font-size: 10px;">DUE: ₹${v.due}</span>` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            ${v.labReport ? `<button type="button" class="cms-btn cms-btn-ghost btn-card-view-lab" data-visitid="${visitKey}" style="padding: 2px 8px; font-size: 11px; color: #0284c7; border: 1px solid #bae6fd; background: #f0fdf4; font-weight: 700; border-radius: 4px;" title="View / Print Attached Lab Report"><i class="fa-solid fa-flask-vial"></i> Lab Report</button>` : ''}
            ${hasDigitalRx ? `
            <button type="button" class="cms-btn cms-btn-ghost btn-card-print-rx" data-visitid="${visitKey}" style="padding: 2px 8px; font-size: 11px; color: #0f5132; border: 1px solid #86efac; background: #f0fdf4; font-weight: 700; border-radius: 4px;" title="Print Prescription for Case #${v.caseId}">
              <i class="fa-solid fa-print"></i> Print Rx
            </button>` : ''}
            <a class="cms-link-view-detail btn-view-detail" data-visitid="${visitKey}" title="Open Case #${v.caseId} in editable form">
              <i class="fa-solid fa-pen-to-square" style="font-size: 11px;"></i>
              <span>Edit / View</span>
            </a>
            <button type="button" class="cms-btn-danger btn-delete-visit" data-visitid="${visitKey}" data-casenum="${v.caseId || v.id}" title="Delete Case #${v.caseId}" style="padding: 3px 7px; font-size: 11px; z-index: 10; position: relative;">
              <i class="fa-solid fa-trash-can" style="pointer-events: none;"></i>
            </button>
          </div>
        </div>

        <!-- Line 2: Vitals & Observation Pills -->
        <div class="cms-history-pills-row">
          ${v.bp ? `<div class="cms-pill-bp">BP: ${v.bp}</div>` : ''}
          ${v.reference || v.refDr ? `<div class="cms-pill-ref">Ref: ${v.reference || v.refDr}</div>` : ''}
          ${v.complaint ? `<div class="cms-pill-complaint">Complaint: ${v.complaint}</div>` : ''}
          ${v.dietary ? `<div class="cms-pill-dietary" title="Dietary Advice"><i class="fa-solid fa-utensils"></i> Diet: ${v.dietary}</div>` : ''}
          ${v.sugar ? `<div class="cms-pill-sugar">Sugar: ${v.sugar}</div>` : ''}
          ${v.investigation ? `<div class="cms-pill-investigation">Investigation: ${v.investigation}</div>` : ''}
          ${v.other ? `<div class="cms-pill-other">Other: ${v.other}</div>` : ''}
        </div>

          <!-- Line 3: Split Boxes for Treatment & Prescription (Adapted to services) -->
        <div style="display: grid; grid-template-columns: ${hasDigitalRx ? '1fr 1.15fr' : '1fr'}; gap: 12px; margin-top: 4px;">
          <!-- Treatment / Clinic -->
          <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 6px; padding: 6px 12px;">
            <div style="font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase; margin-bottom: 4px;">Treatment / Clinic:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${
                treatments.length === 0
                  ? `<span style="color: var(--text-muted); font-size: 12px;">-</span>`
                  : treatments
                      .map(
                        (t) => `
                      <span style="background: #ffffff; border: 1px solid #fecaca; border-radius: 4px; padding: 2px 8px; font-size: 11.5px; font-weight: 700; color: var(--text);">
                        ${t.name} ${t.qty > 1 ? `(x${t.qty})` : ''}
                      </span>
                    `
                      )
                      .join('')
              }
            </div>
          </div>

          ${
            hasDigitalRx
              ? `
          <!-- Prescription / Medical Store -->
          <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 6px 12px;">
            <div style="font-size: 11px; font-weight: 800; color: #0d9488; text-transform: uppercase; margin-bottom: 4px;">Prescription / Medical Store:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${
                prescriptions.length === 0
                  ? `<span style="color: var(--text-muted); font-size: 12px;">-</span>`
                  : prescriptions
                      .map(
                        (p) => `
                      <span style="background: #ffffff; border: 1px solid #99f6e4; border-radius: 4px; padding: 2px 8px; font-size: 11.5px; font-weight: 700; color: var(--text);">
                        ${p.name} (${p.mor || '1'}-${p.noon || '0'}-${p.eve || '1'}${p.ngt ? `-${p.ngt}` : ''}) ${p.timing || 'AF'}
                      </span>
                    `
                      )
                      .join('')
              }
            </div>
          </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  // ==========================================
  // COMPACT ROW (Older entries, hover to expand)
  // ==========================================
  function renderHistoryRowCompactHTML(v) {
    const treatments = (v.treatment || []).filter(t => t.name && t.name.trim());
    const prescriptions = (v.prescription || []).filter(p => p.name && p.name.trim());
    const isDueHighlighted = showDueCasesOnTop && Number(v.due) > 0;
    const visitKey = v.id || v.caseId;

    return `
      <div class="cms-history-row-compact ${isDueHighlighted ? 'cms-card-has-due' : ''}" data-caseid="${v.caseId}" data-visitid="${visitKey}" id="history-card-${visitKey}" title="Click card to open & edit Case #${v.caseId} in form">
        <!-- Top Compact Line -->
        <div class="cms-compact-line">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span class="font-mono" style="font-weight: 800; font-size: 13px; color: var(--text);">${fmtDate(v.date)} ${v.time || '10:00'}</span>
            ${Number(v.due) > 0 ? `<span class="cms-due-pill-btn" style="cursor: pointer; padding: 1px 7px; font-size: 10px;">DUE: ₹${v.due}</span>` : ''}
            ${v.complaint ? `<span class="cms-pill-complaint" style="padding: 1px 8px; font-size: 11px;">Complaint: ${v.complaint}</span>` : ''}
            ${v.dietary ? `<span class="cms-pill-dietary" style="padding: 1px 8px; font-size: 11px;">Diet: ${v.dietary}</span>` : ''}
            ${v.bp ? `<span class="cms-pill-bp" style="padding: 1px 8px; font-size: 11px;">BP: ${v.bp}</span>` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            ${v.labReport ? `<button type="button" class="cms-btn cms-btn-ghost btn-card-view-lab" data-visitid="${visitKey}" style="padding: 1px 6px; font-size: 10px; color: #0284c7; border: 1px solid #bae6fd; background: #f0f9ff; font-weight: 700; border-radius: 4px;" title="View / Print Attached Lab Report"><i class="fa-solid fa-flask-vial"></i> Lab</button>` : ''}
            ${hasDigitalRx ? `
            <button type="button" class="cms-btn cms-btn-ghost btn-card-print-rx" data-visitid="${visitKey}" style="padding: 1px 6px; font-size: 10px; color: #0f5132; border: 1px solid #86efac; background: #f0fdf4; font-weight: 700; border-radius: 4px;" title="Print Prescription for Case #${v.caseId}">
              <i class="fa-solid fa-print"></i> Rx
            </button>` : ''}
            <a class="cms-link-view-detail btn-view-detail" data-visitid="${visitKey}" title="Open Case #${v.caseId} in editable form">
              <i class="fa-solid fa-pen-to-square" style="font-size: 11px;"></i>
              <span>Edit / View</span>
            </a>
            <button type="button" class="cms-btn-danger btn-delete-visit" data-visitid="${visitKey}" data-casenum="${v.caseId || v.id}" title="Delete Case #${v.caseId}" style="padding: 2px 6px; font-size: 10.5px; z-index: 10; position: relative;">
              <i class="fa-solid fa-trash-can" style="pointer-events: none;"></i>
            </button>
          </div>
        </div>

        <!-- Expanded Details (Revealed on Hover) -->
        <div class="cms-expanded-details">
          <div class="cms-history-pills-row">
            ${v.reference || v.refDr ? `<div class="cms-pill-ref">Ref: ${v.reference || v.refDr}</div>` : ''}
            ${v.dietary ? `<div class="cms-pill-dietary"><i class="fa-solid fa-utensils"></i> Diet: ${v.dietary}</div>` : ''}
            ${v.sugar ? `<div class="cms-pill-sugar">Sugar: ${v.sugar}</div>` : ''}
            ${v.investigation ? `<div class="cms-pill-investigation">Investigation: ${v.investigation}</div>` : ''}
            ${v.other ? `<div class="cms-pill-other">Other: ${v.other}</div>` : ''}
          </div>

          <div style="display: grid; grid-template-columns: ${hasDigitalRx ? '1fr 1.15fr' : '1fr'}; gap: 12px; margin-top: 2px;">
            <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 6px; padding: 6px 12px;">
              <div style="font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase; margin-bottom: 4px;">Treatment / Clinic:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${treatments.length === 0 ? `<span style="color: var(--text-muted); font-size: 12px;">-</span>` : treatments.map(t => `<span style="background: #ffffff; border: 1px solid #fecaca; border-radius: 4px; padding: 2px 8px; font-size: 11.5px; font-weight: 700;">${t.name} (x${t.qty})</span>`).join('')}
              </div>
            </div>

            ${
              hasDigitalRx
                ? `
            <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 6px 12px;">
              <div style="font-size: 11px; font-weight: 800; color: #0d9488; text-transform: uppercase; margin-bottom: 4px;">Prescription / Medical Store:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${prescriptions.length === 0 ? `<span style="color: var(--text-muted); font-size: 12px;">-</span>` : prescriptions.map(p => `<span style="background: #ffffff; border: 1px solid #99f6e4; border-radius: 4px; padding: 2px 8px; font-size: 11.5px; font-weight: 700;">${p.name} (${p.mor || '1'}-${p.noon || '0'}-${p.eve || '1'}) ${p.timing || 'AF'}</span>`).join('')}
              </div>
            </div>
            `
                : ''
            }
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // INLINE EDITABLE HISTORY CARD (Matching User Photo)
  // ==========================================
  function renderHistoryCardEditableHTML(v) {
    const visitKey = v.id || v.caseId;
    const visitNum = v.visitNum || (patient?.visits ? (patient.visits.findIndex(x => x.id === v.id || x.caseId === v.caseId) + 1) : 1);

    if (!inlineEditingTreatments || inlineEditingTreatments.length === 0) {
      inlineEditingTreatments = (v.treatment && v.treatment.length > 0)
        ? JSON.parse(JSON.stringify(v.treatment))
        : [{ name: '', qty: '1' }];
    }
    if (!inlineEditingPrescriptions || inlineEditingPrescriptions.length === 0) {
      inlineEditingPrescriptions = (v.prescription && v.prescription.length > 0)
        ? JSON.parse(JSON.stringify(v.prescription))
        : [{ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }];
    }

    return `
      <div class="cms-history-card-editable" id="history-edit-box-${visitKey}" data-visitid="${visitKey}">
        <form id="form-inline-edit-visit" data-visitid="${visitKey}" style="display: flex; flex-direction: column; gap: 10px;">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 6px; flex-wrap: wrap; gap: 8px;">
            <div style="font-family: var(--font-display); font-weight: 800; font-size: 15px; color: #0f5132;">
              Editing Visit #${visitNum} &mdash; Case ${v.caseId}
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px;">
              ${
                v.labReport
                  ? `
                <button type="button" class="cms-btn cms-btn-sm btn-inline-edit-lab" data-visitid="${visitKey}" style="background: #0284c7; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 4px; border: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="View / Edit Attached Lab Report">
                  <i class="fa-solid fa-flask-vial"></i> Lab Report Attached
                </button>
              `
                  : `
                <button type="button" class="cms-btn cms-btn-sm btn-inline-edit-lab" data-visitid="${visitKey}" style="background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-file-medical"></i> Attach Report
                </button>
              `
              }
              <button type="button" class="cms-btn-ghost btn-inline-cancel-edit" data-visitid="${visitKey}" style="color: var(--text-muted); font-size: 15px; padding: 2px 6px;" title="Close Editor">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <!-- Row 1: Vitals (Matching User Photo: DATE, BP, SUGAR, OTHER, REFERENCE, INVESTIGATION, COMPLAINT) -->
          <div class="cms-inline-edit-vitals-row">
            <div class="cms-vital-input-col" style="min-width: 125px; flex: 1.1;">
              <label for="inline-edit-date-${visitKey}">DATE</label>
              <input type="date" id="inline-edit-date-${visitKey}" class="cms-input inline-edit-date" value="${v.date || todayISO()}" required />
            </div>

            <div class="cms-vital-input-col" style="width: 75px; flex: none;">
              <label for="inline-edit-bp-${visitKey}">BP</label>
              <input type="text" id="inline-edit-bp-${visitKey}" class="cms-input inline-edit-bp" value="${v.bp || ''}" placeholder="120/80" />
            </div>

            <div class="cms-vital-input-col" style="width: 75px; flex: none;">
              <label for="inline-edit-sugar-${visitKey}">SUGAR</label>
              <input type="text" id="inline-edit-sugar-${visitKey}" class="cms-input inline-edit-sugar" value="${v.sugar || ''}" placeholder="" />
            </div>

            <div class="cms-vital-input-col" style="width: 80px; flex: none;">
              <label for="inline-edit-other-${visitKey}">OTHER</label>
              <input type="text" id="inline-edit-other-${visitKey}" class="cms-input inline-edit-other" value="${v.other || ''}" placeholder="" />
            </div>

            <div class="cms-vital-input-col" style="width: 95px; flex: none;">
              <label for="inline-edit-ref-${visitKey}">REFERENCE</label>
              <input type="text" id="inline-edit-ref-${visitKey}" class="cms-input inline-edit-ref" value="${v.reference || v.refDr || ''}" placeholder="Self" />
            </div>

            <div class="cms-vital-input-col cms-col-wide" style="position: relative; flex: 1.3;">
              <label for="inline-edit-inv-${visitKey}">INVESTIGATION</label>
              <input type="text" id="inline-edit-inv-${visitKey}" class="cms-input inline-edit-investigation" value="${v.investigation || ''}" placeholder="e.g. CBC..." autocomplete="off" />
            </div>

            <div class="cms-vital-input-col cms-col-wide" style="position: relative; flex: 1.3;">
              <label for="inline-edit-comp-${visitKey}">COMPLAINT</label>
              <input type="text" id="inline-edit-comp-${visitKey}" class="cms-input inline-edit-complaint" value="${v.complaint || ''}" placeholder="e.g. Fever..." autocomplete="off" />
            </div>
          </div>

          <!-- Row 1.5: Inline Dietary Advice Input with + Add New Template -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 6px 10px; margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <label for="inline-edit-diet-${visitKey}" style="font-size: 11px; font-weight: 800; color: #0f5132; margin-bottom: 0; display: flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-utensils"></i> DIETARY ADVICE (FOOD CARE &amp; RESTRICTIONS)
                </label>
                <span style="font-size: 9.5px; color: var(--text-muted);">(What to Eat &amp; What NOT to Eat)</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                <div style="display: flex; gap: 3px; flex-wrap: wrap;" class="inline-dietary-chips">
                  ${renderDietaryChipsHTML(db, 'inline')}
                </div>
                <button type="button" class="cms-btn cms-btn-ghost btn-inline-add-diet-tpl" data-visitid="${visitKey}" style="padding: 1px 6px; font-size: 10.5px; color: #0f5132; font-weight: 700;">
                  <i class="fa-solid fa-plus"></i> Add Template
                </button>
              </div>
            </div>
            <div style="position: relative; width: 100%;">
              <input type="text" id="inline-edit-diet-${visitKey}" class="cms-input inline-edit-dietary" value="${v.dietary || ''}" placeholder="e.g. DB, BP, ACID, THYROID (type shortcut to insert & edit advice)..." autocomplete="off" style="background: #fff; border-color: #86efac; font-size: 12.5px; padding: 4px 8px;" />
            </div>
          </div>

          <!-- Row 2: Split Treatment & Prescription (Adapted to services) -->
          <div style="display: grid; grid-template-columns: ${hasDigitalRx ? '1fr 1.15fr' : '1fr'}; gap: 12px; margin-top: 4px;">
            
            <!-- Left: Treatment (Clinic) Pink Box -->
            <div style="background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
              <div style="font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
                <span>TREATMENT (CLINIC)</span>
                <button type="button" class="cms-btn cms-btn-ghost btn-inline-add-tr" style="padding: 1px 6px; font-size: 10.5px; color: #dc2626; font-weight: 700;">
                  <i class="fa-solid fa-plus"></i> Add
                </button>
              </div>
              <div class="inline-treatment-container" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>

            ${
              hasDigitalRx
                ? `
            <!-- Right: Prescription (Store) Cyan Box -->
            <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
              <div style="font-size: 11px; font-weight: 800; color: #0d9488; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
                <span>PRESCRIPTION (STORE)</span>
                <button type="button" class="cms-btn cms-btn-ghost btn-inline-add-rx" style="padding: 1px 6px; font-size: 10.5px; color: #0d9488; font-weight: 700;">
                  <i class="fa-solid fa-plus"></i> Add
                </button>
              </div>
              <div class="inline-prescription-container" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>
            `
                : ''
            }
          </div>

          <!-- Row 3: Financials & Actions (Matching User Photo: CHARGE, PAID, DUE, Cancel, Save Changes, Print) -->
          <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 8px 14px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <label style="font-weight: 800; font-size: 12px; color: var(--text);">CHARGE ₹</label>
                <input type="number" class="cms-input inline-edit-charge" style="width: 80px; padding: 4px 8px; font-weight: 800; font-family: var(--font-mono); background: #fff;" value="${v.charge !== undefined && v.charge !== null ? v.charge : ''}" placeholder="0" min="0" step="10" />
              </div>

              <div style="display: flex; align-items: center; gap: 6px;">
                <label style="font-weight: 800; font-size: 12px; color: var(--text);">PAID ₹</label>
                <input type="number" class="cms-input inline-edit-paid" style="width: 80px; padding: 4px 8px; font-weight: 800; font-family: var(--font-mono); background: #fff; border-color: #0f5132;" value="${v.received !== undefined && v.received !== null ? v.received : ''}" placeholder="0" min="0" step="10" />
              </div>

              <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 12px;">
                <span>DUE:</span>
                <span class="inline-edit-due-label font-mono" style="font-size: 13px; font-weight: 800; color: ${Number(v.due) > 0 ? '#b91c1c' : '#15803d'};">₹${Number(v.due) || 0}</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="cms-btn-danger btn-inline-delete-case" data-visitid="${visitKey}" data-casenum="${v.caseId || v.id}" style="padding: 6px 14px; border-radius: 6px; font-weight: 700; border: none; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: #dc2626; color: #fff;" title="Delete this Case #${v.caseId}">
                <i class="fa-solid fa-trash-can"></i>
                <span>Delete Case</span>
              </button>
              <button type="button" class="cms-btn cms-btn-ghost btn-inline-cancel-edit" data-visitid="${visitKey}" style="padding: 6px 14px; border: 1px solid var(--border); font-weight: 700; border-radius: 6px;">
                Cancel
              </button>
              ${
                hasDigitalRx
                  ? `
              <button type="button" class="cms-btn btn-inline-save-print" data-visitid="${visitKey}" style="background: #0284c7; color: #fff; padding: 6px 16px; border-radius: 6px; font-weight: 800; border: none; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;" title="Save and immediately print prescription">
                <i class="fa-solid fa-print"></i>
                <span>Save &amp; Print</span>
              </button>
              `
                  : ''
              }
              <button type="submit" class="cms-btn" style="background: #0f5132; color: #fff; padding: 6px 18px; border-radius: 6px; font-weight: 800; border: none; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                <i class="fa-solid fa-check"></i>
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  // Render Treatment inputs inside the inline pink split box (with real-time autocomplete & auto-add row)
  function renderInlineTreatmentInputs(restoreFocusIdx = null) {
    const mount = container.querySelector('.inline-treatment-container');
    if (!mount) return;

    mount.innerHTML = inlineEditingTreatments
      .map(
        (t, idx) => `
      <div style="display: flex; gap: 6px; align-items: center;">
        <div style="position: relative; flex: 1;">
          <input type="text" class="cms-input inline-tr-name" data-idx="${idx}" value="${t.name || ''}" placeholder="Treatment / Procedure" autocomplete="off" style="width: 100%; padding: 4px 8px; font-size: 12.5px; background: #fff; border-radius: 6px;" />
        </div>
        <input type="text" class="cms-input inline-tr-qty" data-idx="${idx}" value="${t.qty || '1'}" placeholder="1" style="width: 45px; text-align: center; padding: 4px 6px; font-size: 12.5px; background: #fff; border-radius: 6px;" />
        <button type="button" class="cms-btn-ghost btn-inline-remove-tr" data-idx="${idx}" style="color: #dc2626; padding: 2px 4px; font-size: 12px;"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `
      )
      .join('');

    mount.querySelectorAll('.inline-tr-name').forEach((el) => {
      const idx = Number(el.dataset.idx);
      setupTreatmentAutocomplete(el, db, (chosen) => {
        inlineEditingTreatments[idx].name = chosen.name;
        inlineEditingTreatments[idx].qty = chosen.defaultQty || '1';
        if (idx === inlineEditingTreatments.length - 1) {
          inlineEditingTreatments.push({ name: '', qty: '1' });
        }
        renderInlineTreatmentInputs();
        setTimeout(() => {
          const qtyInput = mount.querySelector(`.inline-tr-qty[data-idx="${idx}"]`);
          if (qtyInput) {
            qtyInput.focus();
            qtyInput.select();
          }
        }, 30);
      });

      el.addEventListener('input', (e) => {
        inlineEditingTreatments[idx].name = e.target.value;
        if (idx === inlineEditingTreatments.length - 1 && e.target.value.trim().length > 0) {
          inlineEditingTreatments.push({ name: '', qty: '1' });
          renderInlineTreatmentInputs(idx);
        }
      });
    });

    mount.querySelectorAll('.inline-tr-qty').forEach((el) => {
      el.addEventListener('input', (e) => {
        const idx = Number(el.dataset.idx);
        inlineEditingTreatments[idx].qty = e.target.value;
      });
    });

    mount.querySelectorAll('.btn-inline-remove-tr').forEach((el) => {
      el.addEventListener('click', () => {
        inlineEditingTreatments.splice(Number(el.dataset.idx), 1);
        if (inlineEditingTreatments.length === 0) inlineEditingTreatments.push({ name: '', qty: '1' });
        renderInlineTreatmentInputs();
      });
    });

    if (restoreFocusIdx !== null) {
      const activeInput = mount.querySelector(`.inline-tr-name[data-idx="${restoreFocusIdx}"]`);
      if (activeInput) {
        activeInput.focus();
        const len = activeInput.value.length;
        activeInput.setSelectionRange(len, len);
      }
    }
  }

  // Render Prescription inputs inside the inline cyan split box (with real-time autocomplete & auto-add row)
  function renderInlinePrescriptionInputs(restoreFocusIdx = null) {
    const mount = container.querySelector('.inline-prescription-container');
    if (!mount) return;

    mount.innerHTML = inlineEditingPrescriptions
      .map(
        (p, idx) => `
      <div style="display: flex; gap: 5px; align-items: center; background: #fff; padding: 4px 6px; border-radius: 6px; border: 1px solid #ccfbf1;">
        <div style="position: relative; flex: 1; min-width: 110px;">
          <input type="text" class="cms-input inline-rx-name" data-idx="${idx}" value="${p.name || ''}" placeholder="Medicine" autocomplete="off" style="width: 100%; padding: 4px 6px; font-size: 12.5px;" />
        </div>
        <input type="text" class="cms-input cms-dose-num-input inline-rx-mor" data-idx="${idx}" value="${p.mor !== undefined ? p.mor : '1'}" placeholder="1" title="Morning" style="width: 28px !important; text-align: center; padding: 3px 1px !important; font-size: 12px !important; font-weight: 700;" />
        <input type="text" class="cms-input cms-dose-num-input inline-rx-noon" data-idx="${idx}" value="${p.noon !== undefined ? p.noon : '0'}" placeholder="0" title="Noon" style="width: 28px !important; text-align: center; padding: 3px 1px !important; font-size: 12px !important; font-weight: 700;" />
        <input type="text" class="cms-input cms-dose-num-input inline-rx-eve" data-idx="${idx}" value="${p.eve !== undefined ? p.eve : '1'}" placeholder="1" title="Evening" style="width: 28px !important; text-align: center; padding: 3px 1px !important; font-size: 12px !important; font-weight: 700;" />
        <input type="text" class="cms-input cms-dose-num-input inline-rx-ngt" data-idx="${idx}" value="${p.ngt !== undefined ? p.ngt : '0'}" placeholder="0" title="Night" style="width: 28px !important; text-align: center; padding: 3px 1px !important; font-size: 12px !important; font-weight: 700;" />
        <select class="cms-input inline-rx-timing" data-idx="${idx}" style="padding: 2px 4px; font-size: 11px; font-weight: 700; width: 55px; border-radius: 4px;">
          <option value="AF" ${p.timing !== 'BF' ? 'selected' : ''}>AF</option>
          <option value="BF" ${p.timing === 'BF' ? 'selected' : ''}>BF</option>
        </select>
        <button type="button" class="cms-btn-ghost btn-inline-remove-rx" data-idx="${idx}" style="color: #dc2626; padding: 2px 4px; font-size: 12px;"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `
      )
      .join('');

    mount.querySelectorAll('.inline-rx-name').forEach((el) => {
      const idx = Number(el.dataset.idx);
      setupMedicineAutocomplete(el, db, (chosen) => {
        inlineEditingPrescriptions[idx].name = chosen.name;
        if (chosen.defaultDosage) {
          const parsed = parseDosageString(chosen.defaultDosage);
          inlineEditingPrescriptions[idx].mor = parsed.mor;
          inlineEditingPrescriptions[idx].noon = parsed.noon;
          inlineEditingPrescriptions[idx].eve = parsed.eve;
          inlineEditingPrescriptions[idx].ngt = parsed.ngt;
          inlineEditingPrescriptions[idx].timing = parsed.timing;
        }
        if (idx === inlineEditingPrescriptions.length - 1) {
          inlineEditingPrescriptions.push({ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' });
        }
        renderInlinePrescriptionInputs();
        setTimeout(() => {
          const morInput = mount.querySelector(`.inline-rx-mor[data-idx="${idx}"]`);
          if (morInput) {
            morInput.focus();
            morInput.select();
          }
        }, 30);
      });

      el.addEventListener('input', (e) => {
        inlineEditingPrescriptions[idx].name = e.target.value;
        if (idx === inlineEditingPrescriptions.length - 1 && e.target.value.trim().length > 0) {
          inlineEditingPrescriptions.push({ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' });
          renderInlinePrescriptionInputs(idx);
        }
      });
    });

    mount.querySelectorAll('.inline-rx-mor').forEach((el) => {
      el.addEventListener('input', (e) => (inlineEditingPrescriptions[el.dataset.idx].mor = e.target.value));
    });
    mount.querySelectorAll('.inline-rx-noon').forEach((el) => {
      el.addEventListener('input', (e) => (inlineEditingPrescriptions[el.dataset.idx].noon = e.target.value));
    });
    mount.querySelectorAll('.inline-rx-eve').forEach((el) => {
      el.addEventListener('input', (e) => (inlineEditingPrescriptions[el.dataset.idx].eve = e.target.value));
    });
    mount.querySelectorAll('.inline-rx-ngt').forEach((el) => {
      el.addEventListener('input', (e) => (inlineEditingPrescriptions[el.dataset.idx].ngt = e.target.value));
    });
    mount.querySelectorAll('.inline-rx-timing').forEach((el) => {
      el.addEventListener('change', (e) => (inlineEditingPrescriptions[el.dataset.idx].timing = e.target.value));
    });
    mount.querySelectorAll('.btn-inline-remove-rx').forEach((el) => {
      el.addEventListener('click', () => {
        inlineEditingPrescriptions.splice(Number(el.dataset.idx), 1);
        if (inlineEditingPrescriptions.length === 0) inlineEditingPrescriptions.push({ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' });
        renderInlinePrescriptionInputs();
      });
    });

    if (restoreFocusIdx !== null) {
      const activeInput = mount.querySelector(`.inline-rx-name[data-idx="${restoreFocusIdx}"]`);
      if (activeInput) {
        activeInput.focus();
        const len = activeInput.value.length;
        activeInput.setSelectionRange(len, len);
      }
    }
  }

  // ==========================================
  // FAMILY DUE BREAKDOWN VIEW (Dedicated Sub-tab)
  // ==========================================
  function renderFamilyDueView() {
    const { familyDue } = computeDues();
    const allFamilyDueVisits = [];

    if (family && family.patients) {
      Object.values(family.patients).forEach((p) => {
        (p.visits || []).forEach((v) => {
          if (Number(v.due) > 0) {
            allFamilyDueVisits.push({
              patientName: p.name,
              relation: p.relation || 'Member',
              patId: p.id,
              date: v.date,
              time: v.time,
              caseId: v.caseId,
              complaint: v.complaint || v.diagnosis || 'Clinical Consultation',
              charge: Number(v.charge) || 0,
              received: Number(v.received) || 0,
              due: Number(v.due) || 0,
              rawVisit: v,
            });
          }
        });
      });
    }

    container.innerHTML = `
      <div class="cms-case-container">
        
        <!-- Top Banner with Back Button -->
        <div class="cms-card" style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-left: 7px solid #b91c1c;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-family: var(--font-display); font-weight: 800; font-size: 18px; color: #b91c1c;">
                Family Due Breakdown History
              </span>
              <span class="cms-due-pill-btn" style="font-size: 12px; padding: 4px 14px;">
                TOTAL DUE: ₹${familyDue}
              </span>
            </div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
              Family Head: <b>${family?.headName || '—'}</b> &middot; Family ID: <b class="font-mono">${family?.id || '—'}</b> &middot; Area: <b>${family?.area || '—'}</b>
            </div>
          </div>

          <button type="button" id="btn-back-to-case" class="cms-btn cms-btn-primary" style="background: #0f5132; padding: 8px 18px;">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Back to Case Entry</span>
          </button>
        </div>

        <!-- Dues Table Card -->
        <div class="cms-card" style="padding: 16px 20px;">
          <div class="cms-card-header" style="margin-bottom: 12px;">
            <div class="cms-card-title">Pending Due Cases across All Family Members (${allFamilyDueVisits.length})</div>
          </div>

          <div class="cms-table-wrapper">
            <table class="cms-table">
              <thead>
                <tr>
                  <th style="width: 120px;">Date &amp; Time</th>
                  <th>Family Member</th>
                  <th>Relation</th>
                  <th>Disease / Complaint</th>
                  <th style="text-align: right;">Charge (₹)</th>
                  <th style="text-align: right;">Received (₹)</th>
                  <th style="text-align: right; color: #b91c1c;">Due Balance (₹)</th>
                  <th style="width: 120px; text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${
                  allFamilyDueVisits.length === 0
                    ? `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px;">No pending dues found for this family! All visits are paid in full.</td></tr>`
                    : allFamilyDueVisits
                        .map(
                          (d) => `
                        <tr>
                          <td class="font-mono" style="font-size: 12px;">${fmtDate(d.date)} ${d.time || ''}</td>
                          <td><b>${d.patientName}</b></td>
                          <td><span class="cms-pill cms-badge-neutral">${d.relation}</span></td>
                          <td>${d.complaint}</td>
                          <td class="font-mono" style="text-align: right;">${fmtMoney(d.charge)}</td>
                          <td class="font-mono" style="text-align: right; color: #15803d;">${fmtMoney(d.received)}</td>
                          <td class="font-mono" style="text-align: right; font-weight: 800; color: #b91c1c;">${fmtMoney(d.due)}</td>
                          <td style="text-align: center;">
                            <button type="button" class="cms-btn cms-btn-ghost btn-open-case-modal" data-patid="${d.patId}" data-caseid="${d.caseId}" style="padding: 4px 10px; font-size: 12px; font-weight: 700; color: #0f5132; border: 1px solid var(--border);">
                              Open Case &rarr;
                            </button>
                          </td>
                        </tr>
                      `
                        )
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Case Details Modal Mount Point on same page -->
        <div id="case-modal-overlay"></div>
      </div>
    `;

    // Back to case button
    const backBtn = container.querySelector('#btn-back-to-case');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        currentSubView = 'case';
        renderView();
      });
    }

    // Open Case Modal on the same page
    container.querySelectorAll('.btn-open-case-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-patid');
        const cId = btn.getAttribute('data-caseid');
        const patObj = family?.patients?.[pId];
        const vObj = (patObj?.visits || []).find(v => v.caseId === cId || v.id === cId);
        if (patObj && vObj) {
          openCaseDetailsModal(vObj, patObj);
        }
      });
    });
  }

  // ==========================================
  // CASE DETAILS MODAL (Pop-up on same page)
  // ==========================================
  function openCaseDetailsModal(v, p) {
    let overlay = container.querySelector('#case-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'case-modal-overlay';
      container.appendChild(overlay);
    }

    const treatments = (v.treatment || []).filter(t => t.name && t.name.trim());
    const prescriptions = (v.prescription || []).filter(rx => rx.name && rx.name.trim());

    overlay.innerHTML = `
      <div class="cms-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div class="cms-card cms-modal" style="width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; box-shadow: var(--shadow-xl); border: 2px solid #0f5132; border-radius: 12px; background: var(--surface);">
          
          <!-- Modal Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid var(--border); padding-bottom: 10px;">
            <div>
              <div class="font-display" style="font-weight: 800; font-size: 16px; color: #0f5132;">
                Case #${v.caseId} Details &middot; ${p.name}
              </div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                ${p.relation || 'Member'} &middot; ${fmtDate(v.date)} at ${v.time || '10:00'}
              </div>
            </div>
            <button type="button" id="btn-close-case-modal" class="cms-btn-ghost" style="font-size: 18px; padding: 4px 8px; color: var(--text-muted);">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Vitals & Observations -->
          <div class="cms-history-pills-row">
            ${v.bp ? `<div class="cms-pill-bp">BP: ${v.bp}</div>` : ''}
            ${v.reference || v.refDr ? `<div class="cms-pill-ref">Ref: ${v.reference || v.refDr}</div>` : ''}
            ${v.complaint ? `<div class="cms-pill-complaint">Complaint: ${v.complaint}</div>` : ''}
            ${v.dietary ? `<div class="cms-pill-dietary"><i class="fa-solid fa-utensils"></i> Diet: ${v.dietary}</div>` : ''}
            ${v.diagnosis ? `<div class="cms-pill-sugar">Diagnosis: ${v.diagnosis}</div>` : ''}
            ${v.sugar ? `<div class="cms-pill-sugar">Sugar: ${v.sugar}</div>` : ''}
            ${v.investigation ? `<div class="cms-pill-investigation">Investigation: ${v.investigation}</div>` : ''}
            ${v.other ? `<div class="cms-pill-other">Other: ${v.other}</div>` : ''}
          </div>

          <!-- Split Treatment & Prescription Boxes -->
          <div style="display: grid; grid-template-columns: ${hasDigitalRx ? '1fr 1.15fr' : '1fr'}; gap: 12px;">
            <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 10px 12px;">
              <div style="font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase; margin-bottom: 6px;">Treatment / Clinic:</div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${treatments.length === 0 ? `<span style="color: var(--text-muted); font-size: 12px;">No clinic treatments recorded</span>` : treatments.map(t => `<div style="background: #fff; border: 1px solid #fecaca; border-radius: 4px; padding: 3px 8px; font-size: 12px; font-weight: 700;">• ${t.name} (x${t.qty})</div>`).join('')}
              </div>
            </div>

            ${
              hasDigitalRx
                ? `
            <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 10px 12px;">
              <div style="font-size: 11px; font-weight: 800; color: #0d9488; text-transform: uppercase; margin-bottom: 6px;">Prescription / Medical Store:</div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${prescriptions.length === 0 ? `<span style="color: var(--text-muted); font-size: 12px;">No pharmacy medicines prescribed</span>` : prescriptions.map(rx => `<div style="background: #fff; border: 1px solid #99f6e4; border-radius: 4px; padding: 3px 8px; font-size: 12px; font-weight: 700;">• ${rx.name} [Qty ${rx.qty}] (${rx.mor || '1'}-${rx.noon || '0'}-${rx.eve || '1'}) ${rx.timing || 'AF'}</div>`).join('')}
              </div>
            </div>
            `
                : ''
            }
          </div>

          <!-- Financial Summary -->
          <div style="background: var(--surface-alt); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; gap: 16px;">
              <span>Total Charge: <b class="font-mono">${fmtMoney(v.charge)}</b></span>
              <span>Amount Received: <b class="font-mono" style="color: #15803d;">${fmtMoney(v.received)}</b></span>
            </div>
            <span class="cms-due-pill-btn" style="font-size: 12px; padding: 4px 12px;">
              DUE BALANCE: ${fmtMoney(v.due)}
            </span>
          </div>

          <!-- Modal Footer Actions -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button type="button" id="btn-edit-case-from-modal" class="cms-btn cms-btn-ghost" style="border: 1px solid var(--border); color: #0f5132; font-weight: 700;">
                <i class="fa-solid fa-pen-to-square"></i> Edit Case in Form
              </button>
              <button type="button" id="btn-delete-case-from-modal" class="cms-btn-danger" style="padding: 7px 14px; border-radius: 6px; font-weight: 700; border: none; display: inline-flex; align-items: center; gap: 6px; background: #dc2626; color: #fff; cursor: pointer;" title="Delete this Case #${v.caseId}">
                <i class="fa-solid fa-trash-can"></i> Delete Case
              </button>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${
                v.labReport
                  ? `
                <button type="button" id="btn-modal-view-lab" class="cms-btn cms-btn-ghost" style="border: 1.5px solid #0284c7; color: #0284c7; font-weight: 700;">
                  <i class="fa-solid fa-flask-vial"></i> View Lab Report
                </button>
              `
                  : ''
              }
              ${
                hasDigitalRx
                  ? `
              <button type="button" id="btn-print-case-modal" class="cms-btn cms-btn-ghost" style="border: 1px solid var(--border);">
                <i class="fa-solid fa-print"></i> Print Prescription
              </button>
              `
                  : ''
              }
              <button type="button" id="btn-dismiss-case-modal" class="cms-btn cms-btn-primary" style="background: #0f5132; padding: 8px 20px;">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => {
      overlay.innerHTML = '';
    };

    overlay.querySelector('#btn-close-case-modal')?.addEventListener('click', closeModal);
    overlay.querySelector('#btn-dismiss-case-modal')?.addEventListener('click', closeModal);
    overlay.querySelector('#btn-delete-case-from-modal')?.addEventListener('click', async () => {
      closeModal();
      await performDeleteCase(v.id || v.caseId, v.caseId || v.id);
    });
    overlay.querySelector('#btn-modal-view-lab')?.addEventListener('click', () => {
      openLabReportModal(p, family, v, v.labReport, (savedData) => {
        v.labReport = savedData;
        saveLocalDB(db, clinicId);
        showToast('Lab report updated');
      });
    });
    overlay.querySelector('#btn-print-case-modal')?.addEventListener('click', () => {
      if (onPrintRequested) onPrintRequested(p, v);
      else openPrescriptionModal(p, v);
    });
    overlay.querySelector('#btn-edit-case-from-modal')?.addEventListener('click', () => {
      closeModal();
      if (currentSubView === 'family-due') {
        currentSubView = 'case';
        renderView();
      }
      loadVisitIntoForm(v.id || v.caseId);
    });
  }

  // ==========================================
  // DELETE CASE / VISIT CORE LOGIC
  // ==========================================
  async function performDeleteCase(vId, caseNum) {
    if (!vId) return false;
    const targetCaseNum = caseNum || vId;

    if (!confirm(`Are you sure you want to delete Case #${targetCaseNum}? This action cannot be undone.`)) {
      return false;
    }

    // 1. Remove from local patient.visits array
    if (patient && Array.isArray(patient.visits)) {
      patient.visits = patient.visits.filter(
        (v) =>
          String(v.id) !== String(vId) &&
          String(v.caseId) !== String(vId) &&
          String(v.id) !== String(targetCaseNum) &&
          String(v.caseId) !== String(targetCaseNum)
      );
    }

    // 2. Ensure patient object in family.patients is updated across all keys
    if (family && family.patients) {
      Object.values(family.patients).forEach((p) => {
        if (p === patient || p.id === patient?.id || p.patId === patient?.patId || p.id === patientId || p.patId === patientId) {
          p.visits = patient.visits;
        }
      });
      if (patient?.id && family.patients[patient.id]) {
        family.patients[patient.id].visits = patient.visits;
      }
      if (patient?.patId && family.patients[patient.patId]) {
        family.patients[patient.patId].visits = patient.visits;
      }
    }

    // 3. Ensure db.families has the updated visits array
    if (db.families) {
      Object.values(db.families).forEach((f) => {
        if (f === family || f.id === family?.id || f.famId === family?.famId || f.id === familyId || f.famId === familyId) {
          if (f.patients) {
            Object.values(f.patients).forEach((p) => {
              if (p === patient || p.id === patient?.id || p.patId === patient?.patId || p.id === patientId || p.patId === patientId) {
                p.visits = patient.visits;
              }
            });
          }
        }
      });
    }

    // 4. Also update flat db.patients if present
    if (db.patients) {
      if (patient?.id && db.patients[patient.id]) db.patients[patient.id].visits = patient.visits;
      if (patient?.patId && db.patients[patient.patId]) db.patients[patient.patId].visits = patient.visits;
    }

    // 5. Persist to local storage
    saveLocalDB(db, clinicId);

    // 6. Asynchronously notify backend API (if server is running)
    try {
      if (vId) await apiFetch(`/consultations/${vId}`, { method: 'DELETE' });
    } catch (err) {
      // Offline/LocalDB fallback
    }

    // 7. Clear active edit states if the deleted visit was currently being edited
    if (inlineEditingVisitId && (
      String(inlineEditingVisitId) === String(vId) ||
      String(inlineEditingVisitId) === String(targetCaseNum)
    )) {
      inlineEditingVisitId = null;
      inlineEditingTreatments = [];
      inlineEditingPrescriptions = [];
    }
    if (editingVisitId && (
      String(editingVisitId) === String(vId) ||
      String(editingVisitId) === String(targetCaseNum)
    )) {
      editingVisitId = null;
      isNewVisitOpen = false;
    }

    // 8. Show feedback toast
    showToast(`🗑️ Case #${targetCaseNum} deleted successfully!`, 'error');

    // 9. Re-render UI immediately
    renderView();
    return true;
  }

  // ==========================================
  // ATTACH DOM EVENT HANDLERS
  // ==========================================
  function attachEventHandlers() {
    setupPatientSearch(container, db, (fId, pId) => {
      familyId = fId;
      patientId = pId;
      family = db.families[fId];
      patient = family?.patients?.[pId];
      isNewVisitOpen = false;
      editingVisitId = null;
      showDueCasesOnTop = false;
      filterDate = '';
      renderView();
      if (onSelectPatient) onSelectPatient(fId, pId);
    });

    // Quick select recent patients in empty state
    container.querySelectorAll('.quick-select-pat-item').forEach((item) => {
      item.addEventListener('click', () => {
        const fId = item.getAttribute('data-famid');
        const pId = item.getAttribute('data-patid');
        familyId = fId;
        patientId = pId;
        family = db.families[fId];
        patient = family?.patients?.[pId];
        isNewVisitOpen = false;
        editingVisitId = null;
        showDueCasesOnTop = false;
        filterDate = '';
        renderView();
        if (onSelectPatient) onSelectPatient(fId, pId);
      });
    });

    if (!patient) return;

    // Date Filter input in Visit History
    const dateFilterInput = container.querySelector('#history-date-filter');
    if (dateFilterInput) {
      dateFilterInput.addEventListener('change', (e) => {
        filterDate = e.target.value;
        renderView();
      });
    }

    const clearDateFilterBtn = container.querySelector('#btn-clear-date-filter');
    if (clearDateFilterBtn) {
      clearDateFilterBtn.addEventListener('click', () => {
        filterDate = '';
        renderView();
      });
    }

    const showAllDatesEmptyBtn = container.querySelector('#btn-show-all-dates-empty');
    if (showAllDatesEmptyBtn) {
      showAllDatesEmptyBtn.addEventListener('click', () => {
        filterDate = '';
        renderView();
      });
    }

    // Button: Personal Due (Toggle show due cases on top)
    const personalDueBtn = container.querySelector('#btn-personal-due');
    if (personalDueBtn) {
      personalDueBtn.addEventListener('click', () => {
        const { personalDue } = computeDues();
        const dueCount = (patient?.visits || []).filter(v => Number(v.due) > 0).length;
        if (dueCount === 0 || personalDue <= 0) {
          showToast(`✅ No pending dues for ${patient.name}. All cases are fully settled!`, 'info');
          return;
        }
        showDueCasesOnTop = true;
        renderView();
        showToast(`⚠️ Showing ${dueCount} case(s) with pending dues (highlighted in red border)`, 'warning');
        const historySection = container.querySelector('#visit-history-section');
        if (historySection) {
          historySection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Button: Clear Due Filter
    const clearDueFilterBtn = container.querySelector('#btn-clear-due-filter');
    if (clearDueFilterBtn) {
      clearDueFilterBtn.addEventListener('click', () => {
        showDueCasesOnTop = false;
        renderView();
      });
    }

    // Button: Family Due Breakdown
    const famDueBtn = container.querySelector('#btn-family-due-breakdown');
    if (famDueBtn) {
      famDueBtn.addEventListener('click', () => {
        currentSubView = 'family-due';
        renderView();
      });
    }

    // Button: Delete Patient
    const delPatientBtn = container.querySelector('#btn-delete-patient');
    if (delPatientBtn) {
      delPatientBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete patient record for "${patient.name}"?`)) {
          delete family.patients[patient.id];
          saveLocalDB(db, clinicId);
          showToast(`Patient ${patient.name} deleted`, 'error');
          const nextPat = Object.values(family.patients || {})[0];
          patient = nextPat || null;
          patientId = nextPat ? nextPat.id : null;
          renderView();
        }
      });
    }

    // Button: Edit Patient Info (Preserves draft case & redirects to Add Member form in edit mode)
    const editPatientBtn = container.querySelector('#btn-edit-patient-info');
    if (editPatientBtn) {
      editPatientBtn.addEventListener('click', () => {
        // Grab current draft from form fields
        const bp = container.querySelector('#input-bp')?.value.trim() || '';
        const sugar = container.querySelector('#input-sugar')?.value.trim() || '';
        const other = container.querySelector('#input-other')?.value.trim() || '';
        const reference = container.querySelector('#input-reference')?.value.trim() || '';
        const investigation = container.querySelector('#input-investigation')?.value.trim() || '';
        const complaint = container.querySelector('#input-complaint')?.value.trim() || '';
        const dietary = container.querySelector('#input-dietary')?.value.trim() || '';
        const charge = container.querySelector('#input-charge')?.value || '';
        const paid = container.querySelector('#input-paid')?.value || '';

        const draftCase = {
          isNewVisitOpen,
          editingVisitId,
          attachedLabReport,
          bp,
          sugar,
          other,
          reference,
          investigation,
          complaint,
          dietary,
          treatmentRows,
          prescriptionRows,
          charge,
          paid,
        };

        sessionStorage.setItem('cms_active_case_draft', JSON.stringify({ patientId: patient.id, draft: draftCase }));

        if (onEditPatient) {
          onEditPatient(family.id, patient.id);
        }
      });
    }

    // Button: Toggle New Visit Form
    const toggleVisitBtn = container.querySelector('#btn-toggle-visit-form');
    if (toggleVisitBtn) {
      toggleVisitBtn.addEventListener('click', () => {
        isNewVisitOpen = !isNewVisitOpen;
        if (isNewVisitOpen && !editingVisitId) {
          resetFormFields();
        }
        const drawer = container.querySelector('#visit-form-drawer');
        if (drawer) {
          drawer.style.display = isNewVisitOpen ? 'block' : 'none';
          if (isNewVisitOpen) drawer.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Button: Close Visit Form
    const closeVisitBtn = container.querySelector('#btn-close-visit');
    if (closeVisitBtn) {
      closeVisitBtn.addEventListener('click', () => {
        isNewVisitOpen = false;
        editingVisitId = null;
        const drawer = container.querySelector('#visit-form-drawer');
        if (drawer) drawer.style.display = 'none';
      });
    }

    // Button: Attach Lab Report (Photos 1 & 2)
    const attachReportBtn = container.querySelector('#btn-attach-report');
    if (attachReportBtn) {
      attachReportBtn.addEventListener('click', () => {
        const visitDate = container.querySelector('#visit-date-input')?.value || todayISO();
        const currentCaseId = editingVisitId || `${patient.id}${pad((patient.visits || []).length + 1, 2)}`;
        const currentVisitContext = {
          caseId: currentCaseId,
          date: visitDate,
        };

        openLabReportModal(
          patient,
          family,
          currentVisitContext,
          attachedLabReport || {},
          (savedLabData) => {
            attachedLabReport = savedLabData;

            // Auto-append / sync summary tags to investigation field
            const invInput = container.querySelector('#input-investigation');
            if (invInput && savedLabData.summaryTags && savedLabData.summaryTags.length > 0) {
              const currentTokens = invInput.value.split(',').map(s => s.trim()).filter(Boolean);
              savedLabData.summaryTags.forEach(tag => {
                if (!currentTokens.some(ct => ct.toLowerCase() === tag.toLowerCase())) {
                  currentTokens.push(tag);
                }
              });
              invInput.value = currentTokens.join(', ') + (currentTokens.length > 0 ? ', ' : '');
            }

            renderView();
            isNewVisitOpen = true;
            const drawer = container.querySelector('#visit-form-drawer');
            if (drawer) drawer.style.display = 'block';
          }
        );
      });
    }

    // Button: Cancel Visit Form
    const cancelVisitBtn = container.querySelector('#btn-cancel-visit');
    if (cancelVisitBtn) {
      cancelVisitBtn.addEventListener('click', () => {
        isNewVisitOpen = false;
        editingVisitId = null;
        attachedLabReport = null;
        resetFormFields();
        renderView();
      });
    }

    // Treatment & Prescription Row Rendering in Form
    renderTreatmentInputs();
    renderPrescriptionInputs();

    // Setup Multi-Token Comma Autocomplete for Investigation & Complaint
    setupCommaMultiAutocomplete(
      container,
      '#input-complaint',
      () => {
        const sharedComplaints = getSharedMasterCollection('complaints');
        const masters = sharedComplaints.map(c => ({
          name: c.name,
          code: db.clinicShortcuts?.complaints?.[c.name] || db.clinicShortcuts?.complaints?.[c.id] || '',
          category: c.category || 'General'
        }));
        const customs = (db.customComplaints || []).map(c => ({ name: c, code: '', category: 'Custom' }));
        return [...masters, ...customs];
      }
    );

    setupCommaMultiAutocomplete(
      container,
      '#input-investigation',
      () => {
        const sharedInvs = getSharedMasterCollection('investigations');
        const masters = sharedInvs.map(inv => ({
          name: inv.name,
          code: db.clinicShortcuts?.investigations?.[inv.name] || db.clinicShortcuts?.investigations?.[inv.id] || '',
          category: inv.category || 'General'
        }));
        const customs = (db.customInvestigations || []).map(inv => ({ name: inv, code: '', category: 'Custom' }));
        return [...masters, ...customs];
      }
    );

    // Setup Dietary Comma Multi-Token Autocomplete with In-Place Editable Expansion
    setupDietaryAutocomplete(
      container,
      '#input-dietary',
      () => getDietaryMasterList(db)
    );

    // Quick Shortcut Chips in New Visit Form
    container.querySelectorAll('.form-diet-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const code = chip.getAttribute('data-code');
        if (!code) return;
        const allMasters = getDietaryMasterList(db);
        const item = allMasters.find((m) => m.code.toUpperCase() === code.toUpperCase());
        const formatted = item ? `${item.code}: Eat: ${item.eat} | Avoid: ${item.avoid}, ` : `${code}, `;
        const dietInput = container.querySelector('#input-dietary');
        if (dietInput) {
          const cur = dietInput.value.trim();
          dietInput.value = cur ? `${cur}, ${formatted}` : formatted;
          dietInput.focus();
        }
      });
    });

    // Quick Add Dietary Template (+ Add New Template)
    const quickAddDietBtn = container.querySelector('#btn-quick-add-dietary');
    if (quickAddDietBtn) {
      quickAddDietBtn.addEventListener('click', () => {
        openQuickAddDietaryModal(container, db, clinicId, (newTpl) => {
          const dietInput = container.querySelector('#input-dietary');
          if (dietInput) {
            const val = dietInput.value.trim();
            const formatted = `${newTpl.code}: Eat: ${newTpl.eat} | Avoid: ${newTpl.avoid}, `;
            dietInput.value = val ? `${val}, ${formatted}` : formatted;
            dietInput.focus();
          }
        });
      });
    }

    // Add Treatment Item Button
    const addTreatmentBtn = container.querySelector('#btn-add-treatment-item');
    if (addTreatmentBtn) {
      addTreatmentBtn.addEventListener('click', () => {
        treatmentRows.push({ name: '', qty: '1' });
        renderTreatmentInputs();
      });
    }

    // Add Prescription Item Button
    const addPrescriptionBtn = container.querySelector('#btn-add-prescription-item');
    if (addPrescriptionBtn) {
      addPrescriptionBtn.addEventListener('click', () => {
        prescriptionRows.push({ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' });
        renderPrescriptionInputs();
      });
    }

    // Dynamic Financial Calculations
    const chargeInput = container.querySelector('#input-charge');
    const paidInput = container.querySelector('#input-paid');
    const dueLabel = container.querySelector('#label-computed-due');

    const updateFinancials = () => {
      const charge = Number(chargeInput?.value || 0);
      const paid = Number(paidInput?.value || 0);
      const due = Math.max(0, charge - paid);
      if (dueLabel) {
        dueLabel.textContent = `₹${due}`;
        dueLabel.style.color = due > 0 ? '#b91c1c' : '#15803d';
      }
    };

    if (chargeInput) chargeInput.addEventListener('input', updateFinancials);
    if (paidInput) paidInput.addEventListener('input', updateFinancials);

    // Form Submit Handler
    const form = container.querySelector('#form-case-entry');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const visitDate = container.querySelector('#visit-date-input')?.value || todayISO();
        const bp = container.querySelector('#input-bp')?.value.trim() || '';
        const sugar = container.querySelector('#input-sugar')?.value.trim() || '';
        const other = container.querySelector('#input-other')?.value.trim() || '';
        const reference = container.querySelector('#input-reference')?.value.trim() || '';
        const investigation = container.querySelector('#input-investigation')?.value.trim() || '';
        const complaint = container.querySelector('#input-complaint')?.value.trim() || '';
        const dietary = container.querySelector('#input-dietary')?.value.trim() || '';

        const charge = Number(chargeInput?.value || 0);
        const received = Number(paidInput?.value || 0);
        const due = Math.max(0, charge - received);

        // Auto-learn newly typed complaints, investigations, and medicines into shared master catalogue
        if (complaint) {
          const complaintTokens = complaint.split(',').map(c => c.trim()).filter(Boolean);
          complaintTokens.forEach(cName => {
            if (cName.length > 1) {
              addSharedMasterItem('complaints', { id: `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`, name: cName, code: '', category: 'General', createdAt: todayISO() });
            }
          });
        }

        if (investigation) {
          const investigationTokens = investigation.split(',').map(i => i.trim()).filter(Boolean);
          investigationTokens.forEach(invName => {
            if (invName.length > 1) {
              addSharedMasterItem('investigations', { id: `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`, name: invName, code: '', category: 'General', createdAt: todayISO() });
            }
          });
        }

        const cleanPrescription = prescriptionRows.filter((p) => p.name && p.name.trim());
        cleanPrescription.forEach(p => {
          const mName = p.name.trim();
          if (mName.length > 1) {
            addSharedMasterItem('medicines', { id: `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`, name: mName, createdAt: todayISO() });
          }
        });

        if (!patient.visits) patient.visits = [];

        if (editingVisitId) {
          // Update existing visit
          const vIdx = patient.visits.findIndex((v) => (v.id === editingVisitId || v.caseId === editingVisitId));
          if (vIdx !== -1) {
            patient.visits[vIdx] = {
              ...patient.visits[vIdx],
              date: visitDate,
              bp,
              sugar,
              other,
              reference,
              investigation,
              complaint,
              dietary,
              treatment: treatmentRows.filter((t) => t.name && t.name.trim()),
              prescription: prescriptionRows.filter((p) => p.name && p.name.trim()),
              labReport: attachedLabReport,
              charge,
              received,
              due,
            };
            showToast(`✨ Case #${editingVisitId} updated successfully!`);
          }
        } else {
          // Create New Visit
          const nextVisitNum = patient.visits.length + 1;
          const newCaseId = `${patient.id}${pad(nextVisitNum, 2)}`;

          const newVisit = {
            id: `v_${Date.now()}`,
            caseId: newCaseId,
            visitNum: nextVisitNum,
            date: visitDate,
            time: nowTime(),
            bp,
            sugar,
            other,
            reference,
            investigation,
            complaint,
            dietary,
            treatment: treatmentRows.filter((t) => t.name && t.name.trim()),
            prescription: prescriptionRows.filter((p) => p.name && p.name.trim()),
            labReport: attachedLabReport,
            charge,
            received,
            due,
          };

          patient.visits.push(newVisit);
          showToast(`✨ Visit #${nextVisitNum} saved!`);

          // Open Prescription Print Preview only if Digital Prescription service is enabled
          if (hasDigitalRx) {
            if (onPrintRequested) {
              onPrintRequested(patient, newVisit);
            } else {
              openPrescriptionModal(patient, newVisit);
            }
          }
        }

        saveLocalDB(db, clinicId);
        isNewVisitOpen = false;
        editingVisitId = null;
        attachedLabReport = null;
        renderView();
      });
    }

    // History card / row click handlers -> directly open THAT CARD in inline editable mode (Matching user photo)
    container.querySelectorAll('.cms-history-card-full, .cms-history-row-compact').forEach((card) => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        // If clicked on delete button, lab report, print, or edit link, do not re-trigger card click
        if (
          e.target.closest('.btn-delete-visit') ||
          e.target.closest('.btn-inline-delete-case') ||
          e.target.closest('.btn-card-view-lab') ||
          e.target.closest('.btn-card-print-rx') ||
          e.target.closest('.btn-view-detail')
        ) {
          return;
        }
        const vId = card.getAttribute('data-visitid') || card.getAttribute('data-caseid');
        if (vId) {
          inlineEditingVisitId = vId;
          const v = (patient?.visits || []).find((item) => (item.id === vId || item.caseId === vId));
          if (v) {
            inlineEditingTreatments = (v.treatment && v.treatment.length > 0)
              ? JSON.parse(JSON.stringify(v.treatment))
              : [{ name: '', qty: '1' }];
            inlineEditingPrescriptions = (v.prescription && v.prescription.length > 0)
              ? JSON.parse(JSON.stringify(v.prescription))
              : [{ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }];
          }
          renderView();
          const editBox = container.querySelector(`#history-edit-box-${vId}`);
          if (editBox) {
            setTimeout(() => {
              editBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
          }
        }
      });
    });

    // View Detail click handlers on all history cards (also opens THAT CARD in inline editable form)
    container.querySelectorAll('.btn-view-detail').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const vId = btn.getAttribute('data-visitid');
        if (vId) {
          inlineEditingVisitId = vId;
          const v = (patient?.visits || []).find((item) => (item.id === vId || item.caseId === vId));
          if (v) {
            inlineEditingTreatments = (v.treatment && v.treatment.length > 0)
              ? JSON.parse(JSON.stringify(v.treatment))
              : [{ name: '', qty: '1' }];
            inlineEditingPrescriptions = (v.prescription && v.prescription.length > 0)
              ? JSON.parse(JSON.stringify(v.prescription))
              : [{ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }];
          }
          renderView();
          const editBox = container.querySelector(`#history-edit-box-${vId}`);
          if (editBox) {
            setTimeout(() => {
              editBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
          }
        }
      });
    });

    // ==========================================
    // INLINE EDITING EVENT HANDLERS (When a card is active)
    // ==========================================
    if (inlineEditingVisitId) {
      // Setup autocomplete on inline complaint & investigation (Enter key selects very first record)
      setupCommaMultiAutocomplete(
        container,
        '.inline-edit-complaint',
        () => {
          const sharedComplaints = getSharedMasterCollection('complaints');
          const masters = sharedComplaints.map(c => ({
            name: c.name,
            code: db.clinicShortcuts?.complaints?.[c.name] || db.clinicShortcuts?.complaints?.[c.id] || '',
            category: c.category || 'General'
          }));
          const customs = (db.customComplaints || []).map(c => ({ name: c, code: '', category: 'Custom' }));
          return [...masters, ...customs];
        }
      );

      setupCommaMultiAutocomplete(
        container,
        '.inline-edit-investigation',
        () => {
          const sharedInvs = getSharedMasterCollection('investigations');
          const masters = sharedInvs.map(inv => ({
            name: inv.name,
            code: db.clinicShortcuts?.investigations?.[inv.name] || db.clinicShortcuts?.investigations?.[inv.id] || '',
            category: inv.category || 'General'
          }));
          const customs = (db.customInvestigations || []).map(inv => ({ name: inv, code: '', category: 'Custom' }));
          return [...masters, ...customs];
        }
      );

      // Setup autocomplete on inline dietary advice
      setupDietaryAutocomplete(
        container,
        '.inline-edit-dietary',
        () => getDietaryMasterList(db)
      );

      // Inline Quick Add Dietary Template (+ Add New Template)
      container.querySelectorAll('.btn-inline-add-diet-tpl').forEach((btn) => {
        btn.addEventListener('click', () => {
          openQuickAddDietaryModal(container, db, clinicId, (newTpl) => {
            const dietInput = container.querySelector('.inline-edit-dietary');
            if (dietInput) {
              const val = dietInput.value.trim();
              const formatted = `${newTpl.code}: Eat: ${newTpl.eat} | Avoid: ${newTpl.avoid}, `;
              dietInput.value = val ? `${val}, ${formatted}` : formatted;
              dietInput.focus();
            }
          });
        });
      });

      // Render Treatment and Prescription sub-lists inside inline card
      renderInlineTreatmentInputs();
      renderInlinePrescriptionInputs();

      // Add treatment / prescription buttons in inline card
      container.querySelector('.btn-inline-add-tr')?.addEventListener('click', () => {
        inlineEditingTreatments.push({ name: '', qty: '1' });
        renderInlineTreatmentInputs();
      });

      container.querySelector('.btn-inline-add-rx')?.addEventListener('click', () => {
        inlineEditingPrescriptions.push({ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' });
        renderInlinePrescriptionInputs();
      });

      // Inline dynamic financial calculation
      const inlineChInput = container.querySelector('.inline-edit-charge');
      const inlinePdInput = container.querySelector('.inline-edit-paid');
      const inlineDueLbl = container.querySelector('.inline-edit-due-label');

      const updateInlineDue = () => {
        const c = Number(inlineChInput?.value || 0);
        const p = Number(inlinePdInput?.value || 0);
        const d = Math.max(0, c - p);
        if (inlineDueLbl) {
          inlineDueLbl.textContent = `₹${d}`;
          inlineDueLbl.style.color = d > 0 ? '#b91c1c' : '#15803d';
        }
      };

      if (inlineChInput) inlineChInput.addEventListener('input', updateInlineDue);
      if (inlinePdInput) inlinePdInput.addEventListener('input', updateInlineDue);

      // Inline Delete Case button handler
      container.querySelectorAll('.btn-inline-delete-case').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const vId = btn.getAttribute('data-visitid');
          const caseNum = btn.getAttribute('data-casenum') || vId;
          performDeleteCase(vId, caseNum);
        });
      });

      // Inline Cancel button & X button
      container.querySelectorAll('.btn-inline-cancel-edit').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          inlineEditingVisitId = null;
          renderView();
        });
      });

      // Inline Attached Lab Report button
      container.querySelectorAll('.btn-inline-edit-lab').forEach((btn) => {
        btn.addEventListener('click', () => {
          const v = (patient?.visits || []).find(item => item.id === inlineEditingVisitId || item.caseId === inlineEditingVisitId);
          if (v) {
            openLabReportModal(patient, family, v, v.labReport || {}, (savedLab) => {
              v.labReport = savedLab;
              saveLocalDB(db, clinicId);
              showToast('✨ Attached Lab Report updated');
              renderView();
            });
          }
        });
      });

      // Inline Form Submit -> Save Changes
      const inlineForm = container.querySelector('#form-inline-edit-visit');
      if (inlineForm) {
        inlineForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const v = (patient?.visits || []).find(item => item.id === inlineEditingVisitId || item.caseId === inlineEditingVisitId);
          if (!v) return;

          const date = container.querySelector('.inline-edit-date')?.value || todayISO();
          const bp = container.querySelector('.inline-edit-bp')?.value.trim() || '';
          const sugar = container.querySelector('.inline-edit-sugar')?.value.trim() || '';
          const other = container.querySelector('.inline-edit-other')?.value.trim() || '';
          const reference = container.querySelector('.inline-edit-ref')?.value.trim() || '';
          const investigation = container.querySelector('.inline-edit-investigation')?.value.trim() || '';
          const complaint = container.querySelector('.inline-edit-complaint')?.value.trim() || '';
          const dietary = container.querySelector('.inline-edit-dietary')?.value.trim() || '';
          const charge = Number(container.querySelector('.inline-edit-charge')?.value || 0);
          const received = Number(container.querySelector('.inline-edit-paid')?.value || 0);
          const due = Math.max(0, charge - received);

          // Update visit object
          v.date = date;
          v.bp = bp;
          v.sugar = sugar;
          v.other = other;
          v.reference = reference;
          v.refDr = reference;
          v.investigation = investigation;
          v.complaint = complaint;
          v.dietary = dietary;
          v.treatment = inlineEditingTreatments.filter(t => t.name && t.name.trim());
          v.prescription = inlineEditingPrescriptions.filter(p => p.name && p.name.trim());
          v.charge = charge;
          v.received = received;
          v.due = due;

          // Auto-learn newly typed complaints, investigations, and medicines into shared master catalogue
          if (complaint) {
            const complaintTokens = complaint.split(',').map(c => c.trim()).filter(Boolean);
            complaintTokens.forEach(cName => {
              if (cName.length > 1) {
                addSharedMasterItem('complaints', { id: `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`, name: cName, code: '', category: 'General', createdAt: todayISO() }, db);
              }
            });
          }

          if (investigation) {
            const investigationTokens = investigation.split(',').map(i => i.trim()).filter(Boolean);
            investigationTokens.forEach(invName => {
              if (invName.length > 1) {
                addSharedMasterItem('investigations', { id: `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`, name: invName, code: '', category: 'General', createdAt: todayISO() }, db);
              }
            });
          }

          const cleanInlinePrescription = inlineEditingPrescriptions.filter(p => p.name && p.name.trim());
          cleanInlinePrescription.forEach(p => {
            const mName = p.name.trim();
            if (mName.length > 1) {
              addSharedMasterItem('medicines', { id: `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`, name: mName, createdAt: todayISO() }, db);
            }
          });

          saveLocalDB(db, clinicId);
          showToast(`✨ Case #${v.caseId} updated successfully!`);
          inlineEditingVisitId = null;
          renderView();
        });
      }

      // Inline Save & Print Button Click Handler
      container.querySelectorAll('.btn-inline-save-print').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const v = (patient?.visits || []).find(item => item.id === inlineEditingVisitId || item.caseId === inlineEditingVisitId);
          if (!v) return;

          const date = container.querySelector('.inline-edit-date')?.value || todayISO();
          const bp = container.querySelector('.inline-edit-bp')?.value.trim() || '';
          const sugar = container.querySelector('.inline-edit-sugar')?.value.trim() || '';
          const other = container.querySelector('.inline-edit-other')?.value.trim() || '';
          const reference = container.querySelector('.inline-edit-ref')?.value.trim() || '';
          const investigation = container.querySelector('.inline-edit-investigation')?.value.trim() || '';
          const complaint = container.querySelector('.inline-edit-complaint')?.value.trim() || '';
          const dietary = container.querySelector('.inline-edit-dietary')?.value.trim() || '';
          const charge = Number(container.querySelector('.inline-edit-charge')?.value || 0);
          const received = Number(container.querySelector('.inline-edit-paid')?.value || 0);
          const due = Math.max(0, charge - received);

          // Update visit object
          v.date = date;
          v.bp = bp;
          v.sugar = sugar;
          v.other = other;
          v.reference = reference;
          v.refDr = reference;
          v.investigation = investigation;
          v.complaint = complaint;
          v.dietary = dietary;
          v.treatment = inlineEditingTreatments.filter(t => t.name && t.name.trim());
          v.prescription = inlineEditingPrescriptions.filter(p => p.name && p.name.trim());
          v.charge = charge;
          v.received = received;
          v.due = due;

          saveLocalDB(db, clinicId);
          showToast(`✨ Case #${v.caseId} saved! Opening prescription...`);
          inlineEditingVisitId = null;
          renderView();

          // Open Prescription Print Preview Modal
          if (onPrintRequested) onPrintRequested(patient, v);
          else openPrescriptionModal(patient, v);
        });
      });

      // Quick Shortcut Chips inside inline editor
      container.querySelectorAll('.inline-diet-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const code = chip.getAttribute('data-code');
          if (!code) return;
          const allMasters = getDietaryMasterList(db);
          const item = allMasters.find((m) => m.code.toUpperCase() === code.toUpperCase());
          const formatted = item ? `${item.code}: Eat: ${item.eat} | Avoid: ${item.avoid}, ` : `${code}, `;
          const dietInput = container.querySelector('.inline-edit-dietary');
          if (dietInput) {
            const cur = dietInput.value.trim();
            dietInput.value = cur ? `${cur}, ${formatted}` : formatted;
            dietInput.focus();
          }
        });
      });
    }

    // Print Rx click handlers on history cards & compact rows
    container.querySelectorAll('.btn-card-print-rx').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const vId = btn.getAttribute('data-visitid');
        const v = (patient?.visits || []).find((item) => (item.id === vId || item.caseId === vId));
        if (v) {
          if (onPrintRequested) onPrintRequested(patient, v);
          else openPrescriptionModal(patient, v);
        }
      });
    });

    // Delete Visit click handlers on history cards & compact rows
    container.querySelectorAll('.btn-delete-visit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const vId = btn.getAttribute('data-visitid');
        const caseNum = btn.getAttribute('data-casenum') || vId;
        performDeleteCase(vId, caseNum);
      });
    });

    // Delete Visit click handler when editing visit in top form drawer
    const delEditingVisitBtn = container.querySelector('#btn-delete-editing-visit');
    if (delEditingVisitBtn) {
      delEditingVisitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const vId = delEditingVisitBtn.getAttribute('data-visitid');
        performDeleteCase(vId, vId);
      });
    }
    // View Attached Lab Report click handlers on history cards
    container.querySelectorAll('.btn-card-view-lab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const vId = btn.getAttribute('data-visitid');
        const v = (patient?.visits || []).find((item) => item.id === vId || item.caseId === vId);
        if (v && v.labReport) {
          openLabReportModal(patient, family, v, v.labReport, (updatedLab) => {
            v.labReport = updatedLab;
            saveLocalDB(db, clinicId);
            renderView();
          });
        }
      });
    });
  }

  // ==========================================
  // POPULATE VISIT INTO FORM (Edit Mode)
  // ==========================================
  function loadVisitIntoForm(vId) {
    const v = (patient?.visits || []).find((item) => item.id === vId || item.caseId === vId);
    if (!v) return;

    editingVisitId = v.id || v.caseId;
    isNewVisitOpen = true;
    attachedLabReport = v.labReport ? JSON.parse(JSON.stringify(v.labReport)) : null;

    // Populate treatment rows & prescription rows
    treatmentRows = (v.treatment && v.treatment.length > 0)
      ? JSON.parse(JSON.stringify(v.treatment))
      : [{ name: '', qty: '1' }];

    prescriptionRows = (v.prescription && v.prescription.length > 0)
      ? JSON.parse(JSON.stringify(v.prescription))
      : [{ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }];

    renderView();

    // Populate inputs
    const drawer = container.querySelector('#visit-form-drawer');
    if (drawer) {
      drawer.style.display = 'block';
      setTimeout(() => {
        drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }

    const dateInput = container.querySelector('#visit-date-input');
    if (dateInput) dateInput.value = v.date || todayISO();

    const bpInput = container.querySelector('#input-bp');
    if (bpInput) bpInput.value = v.bp || '';

    const sugarInput = container.querySelector('#input-sugar');
    if (sugarInput) sugarInput.value = v.sugar || '';

    const otherInput = container.querySelector('#input-other');
    if (otherInput) otherInput.value = v.other || '';

    const refInput = container.querySelector('#input-reference');
    if (refInput) refInput.value = v.reference || v.refDr || '';

    const invInput = container.querySelector('#input-investigation');
    if (invInput) invInput.value = v.investigation || '';

    const compInput = container.querySelector('#input-complaint');
    if (compInput) compInput.value = v.complaint || '';

    const dietInput = container.querySelector('#input-dietary');
    if (dietInput) dietInput.value = v.dietary || '';

    const chInput = container.querySelector('#input-charge');
    if (chInput) chInput.value = v.charge !== undefined && v.charge !== null ? v.charge : '';

    const pdInput = container.querySelector('#input-paid');
    if (pdInput) pdInput.value = v.received !== undefined && v.received !== null ? v.received : '';

    const titleEl = container.querySelector('#visit-form-title');
    if (titleEl) {
      titleEl.innerHTML = `✏️ Case #${v.caseId} &middot; ${fmtDate(v.date)} (Editing Details)`;
    }

    const subText = container.querySelector('#btn-submit-case-text');
    if (subText) subText.textContent = hasDigitalRx ? 'Update & Print' : 'Update Visit';

    // Trigger financial update
    const c = Number(chInput?.value || 0);
    const p = Number(pdInput?.value || 0);
    const d = Math.max(0, c - p);
    const dueLabel = container.querySelector('#label-computed-due');
    if (dueLabel) {
      dueLabel.textContent = `₹${d}`;
      dueLabel.style.color = d > 0 ? '#b91c1c' : '#15803d';
    }
  }

  function resetFormFields() {
    editingVisitId = null;
    attachedLabReport = null;
    treatmentRows = [{ name: '', qty: '1' }];
    prescriptionRows = [{ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }];
    const dietInput = container.querySelector('#input-dietary');
    if (dietInput) dietInput.value = '';
    const chInput = container.querySelector('#input-charge');
    if (chInput) chInput.value = '';
    const pdInput = container.querySelector('#input-paid');
    if (pdInput) pdInput.value = '';
    const dueLabel = container.querySelector('#label-computed-due');
    if (dueLabel) {
      dueLabel.textContent = '₹0';
      dueLabel.style.color = '#15803d';
    }
  }

  // Render Treatment inputs inside the pink split box (with real-time autocomplete & auto-add row on typing)
  function renderTreatmentInputs(restoreFocusIdx = null) {
    const mount = container.querySelector('#treatment-items-container');
    if (!mount) return;

    mount.innerHTML = treatmentRows
      .map(
        (t, idx) => `
      <div style="display: flex; gap: 6px; align-items: center;">
        <div style="position: relative; flex: 3;">
          <input type="text" class="cms-input tr-input-name" data-idx="${idx}" value="${t.name || ''}" placeholder="Treatment / Procedure name" autocomplete="off" style="width: 100%; padding: 4px 8px; font-size: 13px; background: #fff;" />
        </div>
        <input type="text" class="cms-input tr-input-qty" data-idx="${idx}" value="${t.qty || '1'}" placeholder="1" style="width: 50px; text-align: center; padding: 4px 6px; font-size: 13px; background: #fff;" />
        <button type="button" class="cms-btn-ghost btn-remove-tr" data-idx="${idx}" style="color: #dc2626; padding: 2px 6px; font-size: 13px;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `
      )
      .join('');

    mount.querySelectorAll('.tr-input-name').forEach((el) => {
      const idx = Number(el.dataset.idx);
      setupTreatmentAutocomplete(el, db, (chosen) => {
        treatmentRows[idx].name = chosen.name;
        treatmentRows[idx].qty = chosen.defaultQty || '1';
        if (idx === treatmentRows.length - 1) {
          treatmentRows.push({ name: '', qty: '1' });
        }
        renderTreatmentInputs();
        setTimeout(() => {
          const qtyInput = mount.querySelector(`.tr-input-qty[data-idx="${idx}"]`);
          if (qtyInput) {
            qtyInput.focus();
            qtyInput.select();
          }
        }, 30);
      });

      el.addEventListener('input', (e) => {
        treatmentRows[idx].name = e.target.value;
        // Auto-add new row when typing in the last row
        if (idx === treatmentRows.length - 1 && e.target.value.trim().length > 0) {
          treatmentRows.push({ name: '', qty: '1' });
          renderTreatmentInputs(idx);
        }
      });
    });

    mount.querySelectorAll('.tr-input-qty').forEach((el) => {
      el.addEventListener('input', (e) => {
        const idx = Number(el.dataset.idx);
        treatmentRows[idx].qty = e.target.value;
      });
    });

    mount.querySelectorAll('.btn-remove-tr').forEach((el) => {
      el.addEventListener('click', () => {
        treatmentRows.splice(Number(el.dataset.idx), 1);
        if (treatmentRows.length === 0) treatmentRows.push({ name: '', qty: '1' });
        renderTreatmentInputs();
      });
    });

    if (restoreFocusIdx !== null) {
      const activeInput = mount.querySelector(`.tr-input-name[data-idx="${restoreFocusIdx}"]`);
      if (activeInput) {
        activeInput.focus();
        const len = activeInput.value.length;
        activeInput.setSelectionRange(len, len);
      }
    }
  }

  // Render Prescription inputs inside the cyan split box (with real-time autocomplete & auto-add row on typing)
  function renderPrescriptionInputs(restoreFocusIdx = null) {
    const mount = container.querySelector('#prescription-items-container');
    if (!mount) return;

    mount.innerHTML = prescriptionRows
      .map(
        (p, idx) => `
      <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap; background: #ffffff; padding: 6px 8px; border-radius: 6px; border: 1px solid #ccfbf1;">
        <div style="position: relative; flex: 2.5; min-width: 130px;">
          <input type="text" class="cms-input rx-input-name" data-idx="${idx}" value="${p.name || ''}" placeholder="Medicine name" autocomplete="off" style="width: 100%; padding: 4px 8px; font-size: 13px;" />
        </div>
        
        <!-- 4 Dosing Number Inputs (Morning, Noon, Evening, Night) -->
        <input type="text" class="cms-input cms-dose-num-input rx-input-mor" data-idx="${idx}" value="${p.mor !== undefined ? p.mor : '1'}" placeholder="1" title="Morning" />
        <input type="text" class="cms-input cms-dose-num-input rx-input-noon" data-idx="${idx}" value="${p.noon !== undefined ? p.noon : '0'}" placeholder="0" title="Noon" />
        <input type="text" class="cms-input cms-dose-num-input rx-input-eve" data-idx="${idx}" value="${p.eve !== undefined ? p.eve : '1'}" placeholder="1" title="Evening" />
        <input type="text" class="cms-input cms-dose-num-input rx-input-ngt" data-idx="${idx}" value="${p.ngt !== undefined ? p.ngt : '0'}" placeholder="0" title="Night" />

        <!-- BF / AF Timing Radio Pills -->
        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 6px; background: #f0fdf4; border-radius: 4px; font-size: 11px; font-weight: 700;">
          <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 2px;">
            <input type="radio" name="rx-timing-${idx}" value="BF" ${p.timing === 'BF' ? 'checked' : ''} class="rx-input-timing" data-idx="${idx}" /> BF
          </label>
          <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 2px;">
            <input type="radio" name="rx-timing-${idx}" value="AF" ${p.timing !== 'BF' ? 'checked' : ''} class="rx-input-timing" data-idx="${idx}" /> AF
          </label>
        </div>

        <button type="button" class="cms-btn-ghost btn-remove-rx" data-idx="${idx}" style="color: #dc2626; padding: 2px 6px; font-size: 13px;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `
      )
      .join('');

    mount.querySelectorAll('.rx-input-name').forEach((el) => {
      const idx = Number(el.dataset.idx);
      setupMedicineAutocomplete(el, db, (chosen) => {
        prescriptionRows[idx].name = chosen.name;
        if (chosen.defaultDosage) {
          const parsed = parseDosageString(chosen.defaultDosage);
          prescriptionRows[idx].mor = parsed.mor;
          prescriptionRows[idx].noon = parsed.noon;
          prescriptionRows[idx].eve = parsed.eve;
          prescriptionRows[idx].ngt = parsed.ngt;
          prescriptionRows[idx].timing = parsed.timing;
        }
        if (idx === prescriptionRows.length - 1) {
          prescriptionRows.push({ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' });
        }
        renderPrescriptionInputs();
        setTimeout(() => {
          const morInput = mount.querySelector(`.rx-input-mor[data-idx="${idx}"]`);
          if (morInput) {
            morInput.focus();
            morInput.select();
          }
        }, 30);
      });

      el.addEventListener('input', (e) => {
        prescriptionRows[idx].name = e.target.value;
        // Auto-add new row when typing in the last row
        if (idx === prescriptionRows.length - 1 && e.target.value.trim().length > 0) {
          prescriptionRows.push({ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' });
          renderPrescriptionInputs(idx);
        }
      });
    });

    mount.querySelectorAll('.rx-input-mor').forEach((el) => {
      el.addEventListener('input', (e) => (prescriptionRows[el.dataset.idx].mor = e.target.value));
    });
    mount.querySelectorAll('.rx-input-noon').forEach((el) => {
      el.addEventListener('input', (e) => (prescriptionRows[el.dataset.idx].noon = e.target.value));
    });
    mount.querySelectorAll('.rx-input-eve').forEach((el) => {
      el.addEventListener('input', (e) => (prescriptionRows[el.dataset.idx].eve = e.target.value));
    });
    mount.querySelectorAll('.rx-input-ngt').forEach((el) => {
      el.addEventListener('input', (e) => (prescriptionRows[el.dataset.idx].ngt = e.target.value));
    });
    mount.querySelectorAll('.rx-input-timing').forEach((el) => {
      el.addEventListener('change', (e) => (prescriptionRows[el.dataset.idx].timing = e.target.value));
    });
    mount.querySelectorAll('.btn-remove-rx').forEach((el) => {
      el.addEventListener('click', () => {
        prescriptionRows.splice(Number(el.dataset.idx), 1);
        if (prescriptionRows.length === 0) prescriptionRows.push({ name: '', qty: '1', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' });
        renderPrescriptionInputs();
      });
    });

    // Re-focus active input if needed
    if (restoreFocusIdx !== null) {
      const activeInput = mount.querySelector(`.rx-input-name[data-idx="${restoreFocusIdx}"]`);
      if (activeInput) {
        activeInput.focus();
        const len = activeInput.value.length;
        activeInput.setSelectionRange(len, len);
      }
    }
  }

  // Initial render
  renderView();
}

// Comma-separated multi-token autocomplete helper with instant shortcut expansion
function setupCommaMultiAutocomplete(container, inputSelector, getSuggestionsFn) {
  const input = container.querySelector(inputSelector);
  if (!input) return;

  const parent = input.parentElement;
  if (!parent) return;

  let box = parent.querySelector('.cms-multi-autocomplete-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'cms-multi-autocomplete-box';
    box.style.display = 'none';
    parent.appendChild(box);
  }

  let activeIndex = 0;
  let currentMatches = [];

  function updateActiveItemHighlight() {
    const items = box.querySelectorAll('.cms-multi-autocomplete-item');
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  function selectItem(chosenVal) {
    if (!chosenVal) return;
    const curTokens = input.value.split(',');
    curTokens[curTokens.length - 1] = ' ' + chosenVal;
    input.value = curTokens.map((t) => t.trim()).filter(Boolean).join(', ') + ', ';
    box.style.display = 'none';
    currentMatches = [];
    activeIndex = 0;
    input.focus();
  }

  // Expand all shortcut tokens in the input string
  function expandShortcuts(fullStr) {
    if (!fullStr) return fullStr;
    const allItems = getSuggestionsFn();
    const tokens = fullStr.split(',');
    let modified = false;

    const expanded = tokens.map((tok, idx) => {
      const clean = tok.trim();
      if (!clean) return tok;
      // Search for match by code (case-insensitive) or exact name
      const match = allItems.find((item) => {
        const code = (typeof item === 'object' && item.code ? item.code : '').trim().toLowerCase();
        return code && code === clean.toLowerCase();
      });
      if (match) {
        modified = true;
        const name = typeof match === 'string' ? match : match.name;
        return tok.startsWith(' ') ? ' ' + name : name;
      }
      return tok;
    });

    return modified ? expanded.join(',') : fullStr;
  }

  function renderSuggestions() {
    const val = input.value;
    const tokens = val.split(',');
    const currentToken = tokens[tokens.length - 1].trim().toLowerCase();

    const allItems = getSuggestionsFn();

    // Check if user just typed an exact shortcut code with trailing space or comma
    if (val.endsWith(' ') || val.endsWith(',')) {
      const expanded = expandShortcuts(val);
      if (expanded !== val) {
        input.value = expanded.endsWith(', ') ? expanded : expanded.trim() + ', ';
        box.style.display = 'none';
        return;
      }
    }

    const matches = allItems.filter((item) => {
      const name = (typeof item === 'string' ? item : item.name || '').toLowerCase();
      const code = (typeof item === 'object' && item.code ? item.code : '').toLowerCase();
      if (!currentToken) return true;
      return name.includes(currentToken) || code.includes(currentToken);
    });

    // Prioritize exact code matches
    matches.sort((a, b) => {
      const codeA = (typeof a === 'object' && a.code ? a.code : '').toLowerCase();
      const codeB = (typeof b === 'object' && b.code ? b.code : '').toLowerCase();
      if (codeA === currentToken) return -1;
      if (codeB === currentToken) return 1;
      return 0;
    });

    currentMatches = matches.slice(0, 10);
    activeIndex = 0; // Default to the very first record

    if (currentMatches.length === 0) {
      box.style.display = 'none';
      return;
    }

    box.innerHTML = currentMatches
      .map((item, idx) => {
        const name = typeof item === 'string' ? item : item.name;
        const code = typeof item === 'object' && item.code ? item.code : '';
        const category = typeof item === 'object' && item.category ? item.category : '';
        return `
        <div class="cms-multi-autocomplete-item ${idx === 0 ? 'active' : ''}" data-val="${name}" data-idx="${idx}">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${code ? `<span class="cms-kbd font-mono" style="font-size: 10px; padding: 1px 4px; background: #e6fffa; color: #0f766e; border: 1px solid #99f6e4;">${code}</span>` : ''}
            <span>${name}</span>
          </div>
          ${category ? `<span class="cms-pill" style="font-size: 9.5px; background: rgba(0,0,0,0.05);">${category}</span>` : ''}
        </div>
      `;
      })
      .join('');

    box.querySelectorAll('.cms-multi-autocomplete-item').forEach((itemEl) => {
      itemEl.addEventListener('mouseenter', () => {
        activeIndex = Number(itemEl.getAttribute('data-idx'));
        updateActiveItemHighlight();
      });

      itemEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const chosenVal = itemEl.getAttribute('data-val');
        selectItem(chosenVal);
      });
    });

    box.style.display = 'flex';
  }

  // Keydown handler: Automatically select very first record on Enter / Tab, expand shortcut on comma / space
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      const val = input.value;
      const tokens = val.split(',');
      const currentToken = tokens[tokens.length - 1].trim().toLowerCase();
      const allItems = getSuggestionsFn();

      // Check if current token is an exact shortcut code
      const exactCodeMatch = allItems.find((item) => {
        const code = (typeof item === 'object' && item.code ? item.code : '').toLowerCase();
        return code && code === currentToken;
      });

      if (exactCodeMatch) {
        e.preventDefault();
        e.stopPropagation();
        const chosenVal = typeof exactCodeMatch === 'string' ? exactCodeMatch : exactCodeMatch.name;
        selectItem(chosenVal);
        return;
      }

      if (box.style.display !== 'none' && currentMatches.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const itemToPick = currentMatches[activeIndex] || currentMatches[0];
        if (itemToPick) {
          const chosenVal = typeof itemToPick === 'string' ? itemToPick : itemToPick.name;
          selectItem(chosenVal);
        }
        return;
      } else if (currentToken) {
        const firstMatch = allItems.find((item) => {
          const name = (typeof item === 'string' ? item : item.name || '').toLowerCase();
          const code = (typeof item === 'object' && item.code ? item.code : '').toLowerCase();
          return name.includes(currentToken) || code.includes(currentToken);
        });
        if (firstMatch) {
          e.preventDefault();
          e.stopPropagation();
          const chosenVal = typeof firstMatch === 'string' ? firstMatch : firstMatch.name;
          selectItem(chosenVal);
          return;
        }
      }

      // If not matching but has text, prevent form submit and append comma for next item
      if (e.key === 'Enter' && input.value.trim().length > 0 && !input.value.trim().endsWith(',')) {
        e.preventDefault();
        e.stopPropagation();
        input.value = input.value.trim() + ', ';
        return;
      }
    }

    if (e.key === ',' || e.key === ' ') {
      // Check if token before comma/space is a shortcut code
      setTimeout(() => {
        const expanded = expandShortcuts(input.value);
        if (expanded !== input.value) {
          input.value = expanded;
        }
      }, 10);
    }

    if (box.style.display !== 'none' && currentMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        activeIndex = (activeIndex + 1) % currentMatches.length;
        updateActiveItemHighlight();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        activeIndex = (activeIndex - 1 + currentMatches.length) % currentMatches.length;
        updateActiveItemHighlight();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        box.style.display = 'none';
        return;
      }
    }
  });

  input.addEventListener('input', renderSuggestions);
  input.addEventListener('focus', renderSuggestions);
  input.addEventListener('blur', () => {
    // Expand any remaining shortcut tokens upon leaving focus
    const expanded = expandShortcuts(input.value);
    if (expanded !== input.value) {
      input.value = expanded;
    }
    setTimeout(() => {
      box.style.display = 'none';
    }, 200);
  });
}

// Search helper function
function setupPatientSearch(container, db, onSelect) {
  const input = container.querySelector('#case-search-input');
  const resultsBox = container.querySelector('#case-search-results');
  if (!input || !resultsBox) return;

  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      resultsBox.style.display = 'none';
      return;
    }

    const matched = [];
    Object.values(db.families || {}).forEach((fam) => {
      Object.values(fam.patients || {}).forEach((pat) => {
        if (
          pat.name.toLowerCase().includes(q) ||
          (pat.id || '').includes(q) ||
          fam.headName.toLowerCase().includes(q) ||
          (fam.id || '').includes(q) ||
          (fam.area || '').toLowerCase().includes(q)
        ) {
          matched.push({ fam, pat });
        }
      });
    });

    if (matched.length === 0) {
      resultsBox.innerHTML = `<div style="padding: 10px; color: var(--text-muted); font-size: 13px;">No patient records found for "${q}".</div>`;
    } else {
      resultsBox.innerHTML = matched
        .slice(0, 8)
        .map(
          ({ fam, pat }) => `
        <div class="cms-search-hit" data-famid="${fam.id}" data-patid="${pat.id}" style="padding: 8px 12px; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s;">
          <div>
            <b>${pat.name}</b> <span style="font-size: 12px; color: var(--text-muted);">(${pat.relation || 'Head'})</span>
            <div style="font-size: 11.5px; color: var(--text-muted);">${fam.headName} &middot; FAM ${fam.id} &middot; ${fam.area || '—'}</div>
          </div>
          <span class="cms-kbd font-mono" style="font-size: 11px;">PT ${pat.id}</span>
        </div>
      `
        )
        .join('');

      resultsBox.querySelectorAll('.cms-search-hit').forEach((hit) => {
        hit.addEventListener('mouseenter', () => (hit.style.background = 'var(--surface-alt)'));
        hit.addEventListener('mouseleave', () => (hit.style.background = 'transparent'));
        hit.addEventListener('click', () => {
          const fId = hit.getAttribute('data-famid');
          const pId = hit.getAttribute('data-patid');
          resultsBox.style.display = 'none';
          input.value = '';
          if (onSelect) onSelect(fId, pId);
        });
      });
    }
    resultsBox.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!resultsBox.contains(e.target) && e.target !== input) {
      resultsBox.style.display = 'none';
    }
  });
}

function getRecentPatients(db) {
  const list = [];
  Object.values(db.families || {}).forEach((fam) => {
    Object.values(fam.patients || {}).forEach((pat) => {
      list.push({ fam, pat });
    });
  });
  return list.slice(0, 5);
}

// ==========================================
// DIETARY MASTER AUTOCOMPLETE & MODAL HELPERS
// ==========================================

export function renderDietaryChipsHTML(db, prefix = 'form') {
  const tpls = Object.values(db?.dietary || {});
  if (tpls.length === 0) return '';
  return tpls.map(tpl => `
    <span class="cms-pill ${prefix === 'inline' ? 'inline-diet-chip' : 'form-diet-chip'}" data-code="${tpl.code}" style="font-size: ${prefix === 'inline' ? '9.5px' : '10px'}; padding: ${prefix === 'inline' ? '1px 5px' : '2px 6px'}; cursor: pointer; background: #e0f2fe; color: #0369a1; font-weight: 800;" title="${tpl.disease || tpl.name || tpl.code}">+ ${tpl.code}</span>
  `).join('');
}

function getDietaryMasterList(db) {
  // Only return templates created/saved by the active clinic doctor
  return Object.values(db?.dietary || {}).map((d) => ({
    code: (d.code || '').toUpperCase(),
    disease: d.disease || d.name || d.code,
    eat: d.eat || '',
    avoid: d.avoid || '',
    category: 'Clinic Template',
  }));
}

function setupDietaryAutocomplete(container, inputSelector, getSuggestionsFn) {
  const input = container.querySelector(inputSelector);
  if (!input) return;

  const parent = input.parentElement;
  if (!parent) return;

  let box = parent.querySelector('.cms-dietary-autocomplete-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'cms-dietary-autocomplete-box';
    box.style.display = 'none';
    parent.appendChild(box);
  }

  let activeIndex = 0;
  let currentMatches = [];

  function updateActiveItemHighlight() {
    const items = box.querySelectorAll('.cms-dietary-autocomplete-item');
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  function selectItem(item) {
    if (!item) return;
    // Format expanded editable dietary text
    const formatted = `${item.code}: Eat: ${item.eat} | Avoid: ${item.avoid}`;

    // Split input by comma to find active token being typed
    const curTokens = input.value.split(',');
    curTokens[curTokens.length - 1] = ' ' + formatted;

    // Join with comma + space so doctor can edit AND chain another shortcut after comma
    input.value = curTokens.map((t) => t.trim()).filter(Boolean).join(', ') + ', ';
    box.style.display = 'none';
    currentMatches = [];
    activeIndex = 0;
    input.focus();
  }

  function renderSuggestions() {
    const val = input.value;
    const tokens = val.split(',');
    const currentToken = tokens[tokens.length - 1].trim().toLowerCase();

    const allItems = getSuggestionsFn();
    const matches = allItems.filter((item) => {
      const code = (item.code || '').toLowerCase();
      const disease = (item.disease || '').toLowerCase();
      const eat = (item.eat || '').toLowerCase();
      const avoid = (item.avoid || '').toLowerCase();
      if (!currentToken) return true;
      return (
        code.includes(currentToken) ||
        disease.includes(currentToken) ||
        eat.includes(currentToken) ||
        avoid.includes(currentToken)
      );
    });

    currentMatches = matches.slice(0, 8);
    activeIndex = 0; // Default to first match

    if (currentMatches.length === 0) {
      box.style.display = 'none';
      return;
    }

    box.innerHTML = currentMatches
      .map(
        (item, idx) => `
        <div class="cms-dietary-autocomplete-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="cms-kbd font-mono" style="font-size: 11px; padding: 1px 6px; background: #0f5132; color: #fff; border-radius: 4px; font-weight: 800;">${item.code}</span>
              <b style="font-size: 12.5px; color: var(--text);">${item.disease}</b>
            </div>
            <span class="cms-pill" style="font-size: 9.5px; background: rgba(15, 81, 50, 0.08); color: #0f5132; font-weight: 700;">${item.category || 'Diet'}</span>
          </div>
          <div style="font-size: 11px; color: #047857; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            <span style="font-weight: 700;">Eat:</span> ${item.eat}
          </div>
          <div style="font-size: 11px; color: #b91c1c; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            <span style="font-weight: 700;">Avoid:</span> ${item.avoid}
          </div>
        </div>
      `
      )
      .join('');

    box.querySelectorAll('.cms-dietary-autocomplete-item').forEach((itemEl) => {
      itemEl.addEventListener('mouseenter', () => {
        activeIndex = Number(itemEl.getAttribute('data-idx'));
        updateActiveItemHighlight();
      });

      itemEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(itemEl.getAttribute('data-idx'));
        selectItem(currentMatches[idx]);
      });
    });

    box.style.display = 'flex';
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (box.style.display !== 'none' && currentMatches.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const itemToPick = currentMatches[activeIndex] || currentMatches[0];
        if (itemToPick) {
          selectItem(itemToPick);
        }
        return;
      } else {
        // If dropdown wasn't visible yet, check if typed token matches any shortcut
        const val = input.value;
        const tokens = val.split(',');
        const currentToken = tokens[tokens.length - 1].trim().toLowerCase();
        if (currentToken) {
          const allItems = getSuggestionsFn();
          const firstMatch = allItems.find((item) => {
            const code = (item.code || '').toLowerCase();
            const disease = (item.disease || '').toLowerCase();
            return code === currentToken || code.includes(currentToken) || disease.includes(currentToken);
          });
          if (firstMatch) {
            e.preventDefault();
            e.stopPropagation();
            selectItem(firstMatch);
            return;
          }
        }
      }
    }

    if (box.style.display !== 'none' && currentMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        activeIndex = (activeIndex + 1) % currentMatches.length;
        updateActiveItemHighlight();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        activeIndex = (activeIndex - 1 + currentMatches.length) % currentMatches.length;
        updateActiveItemHighlight();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        box.style.display = 'none';
        return;
      }
    }
  });

  input.addEventListener('input', renderSuggestions);
  input.addEventListener('focus', renderSuggestions);
  input.addEventListener('blur', () => {
    setTimeout(() => {
      box.style.display = 'none';
    }, 200);
  });
}

function openQuickAddDietaryModal(container, db, clinicId, onSuccess) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'cms-overlay';
  modalOverlay.style.zIndex = '99999';

  modalOverlay.innerHTML = `
    <div class="cms-modal" style="width: 520px; max-width: 95vw; padding: 20px 24px; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border-top: 4px solid #0f5132;" onclick="event.stopPropagation()">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 34px; height: 34px; border-radius: 8px; background: #0f5132; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px;">
            <i class="fa-solid fa-utensils"></i>
          </div>
          <div>
            <div class="font-display" style="font-size: 16px; font-weight: 800; color: var(--text);">Add New Dietary Template</div>
            <div style="font-size: 11.5px; color: var(--text-muted);">Save into Master Data for instant shortcut suggestion &amp; multi-language print</div>
          </div>
        </div>
        <button type="button" id="btn-close-quick-diet-modal" class="cms-btn-ghost" style="font-size: 16px; color: var(--text-muted); padding: 4px 8px;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form id="form-quick-add-dietary" style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 10px;">
          <div class="cms-master-field-group">
            <label style="font-size: 11.5px; font-weight: 800;">Shortcut Code *</label>
            <input type="text" id="quick-diet-code" class="cms-input" required placeholder="e.g. GERD" style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 800;" autofocus />
          </div>
          <div class="cms-master-field-group">
            <label style="font-size: 11.5px; font-weight: 800;">Clinical Condition / Disease *</label>
            <input type="text" id="quick-diet-disease" class="cms-input" required placeholder="e.g. Gastroesophageal Reflux Disease" />
          </div>
        </div>

        <div class="cms-master-field-group">
          <label style="font-size: 11.5px; font-weight: 800; color: #059669;">
            <i class="fa-solid fa-circle-check"></i> What to Eat (Recommended Foods) *
          </label>
          <textarea id="quick-diet-eat" class="cms-textarea" rows="2" required placeholder="e.g. Cold milk, coconut water, oatmeal, boiled vegetables, light meals..."></textarea>
        </div>

        <div class="cms-master-field-group">
          <label style="font-size: 11.5px; font-weight: 800; color: #dc2626;">
            <i class="fa-solid fa-ban"></i> What NOT to Eat (Restricted Foods) *
          </label>
          <textarea id="quick-diet-avoid" class="cms-textarea" rows="2" required placeholder="e.g. Spicy food, oily curries, citrus fruits, late night heavy dinners..."></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; border-top: 1px solid var(--border); padding-top: 12px;">
          <button type="button" id="btn-cancel-quick-diet" class="cms-btn cms-btn-ghost" style="border: 1px solid var(--border); padding: 7px 16px;">
            Cancel
          </button>
          <button type="submit" class="cms-btn cms-btn-primary" style="background: #0f5132; border-color: #0f5132; padding: 7px 20px; font-weight: 700;">
            <i class="fa-solid fa-plus"></i> Save &amp; Insert Template
          </button>
        </div>
      </form>
    </div>
  `;

  const closeModal = () => modalOverlay.remove();

  modalOverlay.querySelector('#btn-close-quick-diet-modal')?.addEventListener('click', closeModal);
  modalOverlay.querySelector('#btn-cancel-quick-diet')?.addEventListener('click', closeModal);

  const form = modalOverlay.querySelector('#form-quick-add-dietary');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = modalOverlay.querySelector('#quick-diet-code')?.value.trim().toUpperCase();
    const disease = modalOverlay.querySelector('#quick-diet-disease')?.value.trim();
    const eat = modalOverlay.querySelector('#quick-diet-eat')?.value.trim();
    const avoid = modalOverlay.querySelector('#quick-diet-avoid')?.value.trim();

    if (!code || !disease || !eat || !avoid) return;

    if (!db.dietary) db.dietary = {};
    const newEntry = {
      id: code,
      code,
      disease,
      eat,
      avoid,
      text: `${disease}: Eat: ${eat} | Avoid: ${avoid}`,
      createdAt: todayISO(),
    };

    db.dietary[code] = newEntry;
    saveLocalDB(db, clinicId);
    showToast(`✨ Dietary Template "${code}" saved to Master Data`);

    closeModal();
    if (onSuccess) onSuccess(newEntry);
  });

  document.body.appendChild(modalOverlay);
}

// ==========================================
// CLINICAL MEDICINE & TREATMENT CATALOGS & AUTOCOMPLETE
// ==========================================

export const CLINICAL_MEDICINES_CATALOG = [
  // Analgesics & Antipyretics
  { name: 'Paracetamol 650mg (Dolo 650 / Calpol)', category: 'Antipyretic / Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Paracetamol 500mg (Crocin)', category: 'Antipyretic / Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Ibuprofen 400mg (Brufen)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Combiflam (Ibuprofen + Paracetamol)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Zerodol-P (Aceclofenac 100mg + Paracetamol 325mg)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Zerodol-SP (Aceclo + Paracetamol + Serratiopeptidase)', category: 'Anti-inflammatory / Pain', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Voveran 50mg (Diclofenac Sodium)', category: 'NSAID / Joint Pain', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Meftal-Spas (Mefenamic Acid + Dicyclomine)', category: 'Antispasmodic / Cramps', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Cyclopam (Dicyclomine + Paracetamol)', category: 'Antispasmodic / Abdominal Pain', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Drotin-M (Drotaverine 80mg + Mefenamic Acid 250mg)', category: 'Antispasmodic / Colic', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Tramadol 50mg + Paracetamol (Ultracet)', category: 'Severe Pain / Opioid Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF' },

  // Antibiotics & Anti-infectives
  { name: 'Amoxicillin 500mg (Novamox 500)', category: 'Antibiotic (Penicillin)', form: 'Capsule', defaultDosage: '1-0-1 AF' },
  { name: 'Augmentin 625 (Amoxyclav 625 Duo)', category: 'Broad Spectrum Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Azithromycin 500mg (Azithral 500)', category: 'Macrolide Antibiotic (RTI)', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Azithromycin 250mg (Azithral 250)', category: 'Macrolide Antibiotic', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Cefixime 200mg (Taxim-O 200 / Zifi 200)', category: 'Cephalosporin Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Cefuroxime Axetil 500mg (Ceftum 500)', category: 'Cephalosporin Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Ciprofloxacin 500mg (Ciplox 500)', category: 'Fluoroquinolone Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Ofloxacin 200mg (Oflox 200)', category: 'Fluoroquinolone Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Norfloxacin + Tinidazole (Norflox-TZ)', category: 'Gastrointestinal Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Ofloxacin + Ornidazole (O2 / Zenflox-OZ)', category: 'GI Infection / Diarrhea', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Metronidazole 400mg (Metrogyl 400)', category: 'Antiprotozoal / Amoebiasis', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Levofloxacin 500mg (Levomac 500)', category: 'Respiratory Antibiotic', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Doxycycline 100mg (Doxicip 100)', category: 'Tetracycline Antibiotic', form: 'Capsule', defaultDosage: '1-0-1 AF' },
  { name: 'Clindamycin 300mg (Dalacin C)', category: 'Lincosamide Antibiotic', form: 'Capsule', defaultDosage: '1-0-1 AF' },

  // Antacids, PPIs, GERD & GI
  { name: 'Pantoprazole 40mg (Pan 40 / Pantocid)', category: 'Antacid / PPI', form: 'Tablet', defaultDosage: '1-0-0 BF' },
  { name: 'Pantoprazole + Domperidone (Pan-D / Pantop-D)', category: 'Antacid / PPI + Prokinetic', form: 'Capsule', defaultDosage: '1-0-0 BF' },
  { name: 'Rabeprazole 20mg (Razo 20 / Happi 20)', category: 'Antacid / PPI', form: 'Tablet', defaultDosage: '1-0-0 BF' },
  { name: 'Rabeprazole + Domperidone (Rablet-D / Rabekind-D)', category: 'Antacid / PPI + Prokinetic', form: 'Capsule', defaultDosage: '1-0-0 BF' },
  { name: 'Omeprazole 20mg (Ocid 20 / Omez)', category: 'Antacid / PPI', form: 'Capsule', defaultDosage: '1-0-0 BF' },
  { name: 'Omeprazole + Domperidone (Omez-D)', category: 'Antacid / PPI + Prokinetic', form: 'Capsule', defaultDosage: '1-0-0 BF' },
  { name: 'Esomeprazole 40mg (Nexpro 40)', category: 'Antacid / PPI', form: 'Tablet', defaultDosage: '1-0-0 BF' },
  { name: 'Ranitidine 150mg (Rantac 150 / Aciloc 150)', category: 'H2 Blocker / Acidity', form: 'Tablet', defaultDosage: '1-0-1 BF' },
  { name: 'Sucralfate Syrup 100ml (Sucrafil / Sucral)', category: 'Mucosal Protective / Ulcer', form: 'Syrup', defaultDosage: '2 Tsp BF' },
  { name: 'Gelusil MPS / Digene Gel (Antacid Syrup)', category: 'Antacid Gel', form: 'Syrup', defaultDosage: '2 Tsp AF' },
  { name: 'Ondansetron 4mg (Ondem 4 / Emeset)', category: 'Antiemetic / Nausea & Vomiting', form: 'Tablet', defaultDosage: '1-0-1 BF' },
  { name: 'Domperidone 10mg (Domstal / Vomistop)', category: 'Antiemetic / Prokinetic', form: 'Tablet', defaultDosage: '1-0-1 BF' },

  // Antihistamines, Cold, Cough & Respiratory
  { name: 'Cetirizine 10mg (Cetzine / Alerid)', category: 'Antihistamine / Allergy', form: 'Tablet', defaultDosage: '0-0-1 HS' },
  { name: 'Levocetirizine 5mg (Levocet / 1-AL)', category: 'Antihistamine / Allergy', form: 'Tablet', defaultDosage: '0-0-1 HS' },
  { name: 'Montair-LC (Levocetirizine 5mg + Montelukast 10mg)', category: 'Allergic Rhinitis / Asthma', form: 'Tablet', defaultDosage: '0-0-1 HS' },
  { name: 'Allegra 120mg (Fexofenadine)', category: 'Non-sedating Antihistamine', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Allegra 180mg (Fexofenadine)', category: 'Allergy / Chronic Urticaria', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Sinarest (Paracetamol + Phenylephrine + CPM)', category: 'Cold, Sinus & Fever', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Cheston Cold (Cetirizine + Phenylephrine + PCM)', category: 'Cold & Cough Relief', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Ascoril-LS Syrup (Levosalbutamol + Ambroxol + Guaiphenesin)', category: 'Wet Cough / Expectorant', form: 'Syrup', defaultDosage: '2 Tsp TDS' },
  { name: 'Ascoril-D Plus Syrup (Dextromethorphan + Phenylephrine)', category: 'Dry Cough Suppressant', form: 'Syrup', defaultDosage: '2 Tsp TDS' },
  { name: 'Grilinctus Syrup (Dextromethorphan + CPM)', category: 'Cough Relief Syrup', form: 'Syrup', defaultDosage: '2 Tsp TDS' },
  { name: 'Benadryl Cough Syrup (Diphenhydramine)', category: 'Allergic Cough Syrup', form: 'Syrup', defaultDosage: '2 Tsp TDS' },
  { name: 'Asthalin 2mg / 4mg (Salbutamol)', category: 'Bronchodilator / Asthma', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Asthalin Inhaler (Salbutamol 100mcg)', category: 'Inhaler / Acute Bronchospasm', form: 'Inhaler', defaultDosage: '2 Puffs SOS' },
  { name: 'Budecort 200 Inhaler (Budesonide 200mcg)', category: 'Inhaled Corticosteroid', form: 'Inhaler', defaultDosage: '1 Puff BD' },
  { name: 'Deriphyllin Retard 150mg / 300mg', category: 'Bronchodilator / COPD', form: 'Tablet', defaultDosage: '1-0-1 AF' },

  // Antidiarrheal, Laxatives & Probiotics
  { name: 'Loperamide 2mg (Eldoper / Imodium)', category: 'Antidiarrheal', form: 'Capsule', defaultDosage: '1-0-1 SOS' },
  { name: 'Racecadotril 100mg (Redotil)', category: 'Antisecretory Antidiarrheal', form: 'Capsule', defaultDosage: '1-1-1 AF' },
  { name: 'Sporlac / Darolac (Lactic Acid Bacillus)', category: 'Probiotic / Gut Flora', form: 'Capsule', defaultDosage: '1-0-1 AF' },
  { name: 'Econorm Sachet (Saccharomyces boulardii)', category: 'Probiotic Sachet', form: 'Sachet', defaultDosage: '1 Sachet BD' },
  { name: 'Electral ORS Sachet (WHO Oral Rehydration Salt)', category: 'Electrolytes / Rehydration', form: 'Sachet', defaultDosage: '1 Sachet in 1L' },
  { name: 'Dulcolax 5mg (Bisacodyl)', category: 'Laxative / Constipation', form: 'Tablet', defaultDosage: '0-0-2 HS' },
  { name: 'Cremaffin / Cremaffin Plus Syrup', category: 'Laxative / Stool Softener', form: 'Syrup', defaultDosage: '2 Tsp HS' },
  { name: 'Isabgol Husk (Ispaghula 100g / 200g)', category: 'Bulk Forming Laxative', form: 'Powder', defaultDosage: '1-2 Tsp HS' },
  { name: 'Duphalac Syrup (Lactulose 100ml / 200ml)', category: 'Osmotic Laxative', form: 'Syrup', defaultDosage: '15ml HS' },

  // Vitamins, Minerals & Supplements
  { name: 'Becosules (Vitamin B-Complex + Vitamin C)', category: 'Multivitamin / Mouth Ulcers', form: 'Capsule', defaultDosage: '1-0-0 AF' },
  { name: 'Neurobion Forte (Vit B1, B6, B12)', category: 'Neuropathy / Nerve Health', form: 'Tablet', defaultDosage: '1-0-0 AF' },
  { name: 'Supradyn Daily Multivitamin + Minerals', category: 'General Multivitamin', form: 'Tablet', defaultDosage: '1-0-0 AF' },
  { name: 'Zincovit (Multivitamin with Zinc)', category: 'Immunity / Nutritional', form: 'Tablet', defaultDosage: '1-0-0 AF' },
  { name: 'Shelcal 500 (Calcium 500mg + Vitamin D3 250IU)', category: 'Calcium Supplement / Bone', form: 'Tablet', defaultDosage: '0-1-0 AF' },
  { name: 'Calcirol Sachet 60,000 IU (Cholecalciferol D3)', category: 'Vitamin D3 Deficiency', form: 'Sachet', defaultDosage: '1 Sachet Weekly' },
  { name: 'Limcee 500mg / Celin 500mg (Vitamin C)', category: 'Vitamin C / Antioxidant', form: 'Chewable', defaultDosage: '1-0-0 OD' },
  { name: 'Orofer-XT (Ferrous Ascorbate + Folic Acid)', category: 'Hematinic / Iron Deficiency', form: 'Tablet', defaultDosage: '0-1-0 AF' },
  { name: 'Folvite 5mg (Folic Acid)', category: 'Folic Acid / Pregnancy', form: 'Tablet', defaultDosage: '1-0-0 OD' },

  // Cardiovascular & Hypertension
  { name: 'Telmisartan 40mg (Telma 40 / Telpres 40)', category: 'Antihypertensive (ARB)', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Telma-AM (Telmisartan 40mg + Amlodipine 5mg)', category: 'Antihypertensive Combination', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Telma-H (Telmisartan 40mg + Hydrochlorothiazide 12.5mg)', category: 'Antihypertensive + Diuretic', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Amlodipine 5mg (Amlong 5 / Stamlo 5)', category: 'Calcium Channel Blocker', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Atenolol 50mg (Aten 50 / Betacard 50)', category: 'Beta Blocker', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Metoprolol Succinate 25mg / 50mg (Betaloc)', category: 'Beta Blocker / Angina', form: 'Tablet', defaultDosage: '1-0-0 OD' },
  { name: 'Atorvastatin 10mg / 20mg (Atorva 10 / Storvas)', category: 'Statin / Cholesterol', form: 'Tablet', defaultDosage: '0-0-1 HS' },
  { name: 'Rosuvastatin 10mg (Rosuvas 10 / Rozavel 10)', category: 'Statin / Cholesterol', form: 'Tablet', defaultDosage: '0-0-1 HS' },
  { name: 'Ecosprin 75mg / 150mg (Aspirin)', category: 'Antiplatelet / Blood Thinner', form: 'Tablet', defaultDosage: '0-1-0 AF' },
  { name: 'Clopidogrel 75mg (Clopilet 75)', category: 'Antiplatelet / CAD', form: 'Tablet', defaultDosage: '0-1-0 AF' },

  // Diabetes Mellitus
  { name: 'Metformin 500mg (Glycomet 500)', category: 'Antidiabetic (Biguanide)', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Metformin 500mg SR (Glycomet SR 500)', category: 'Antidiabetic SR', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Glimepiride 1mg / 2mg (Amaryl 1/2 / Zoryl)', category: 'Antidiabetic (Sulfonylurea)', form: 'Tablet', defaultDosage: '1-0-0 BF' },
  { name: 'Glycomet-GP 1 (Glimepiride 1mg + Metformin 500mg SR)', category: 'Antidiabetic Combination', form: 'Tablet', defaultDosage: '1-0-1 BF' },
  { name: 'Teneligliptin 20mg (Ziten 20 / Tenelimac)', category: 'Antidiabetic (DPP-4 Inhibitor)', form: 'Tablet', defaultDosage: '1-0-0 BF' },
  { name: 'Vildagliptin 50mg (Galvus 50 / Jalra 50)', category: 'Antidiabetic (DPP-4)', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Dapagliflozin 10mg (Forxiga 10 / Oxra 10)', category: 'Antidiabetic (SGLT2 Inhibitor)', form: 'Tablet', defaultDosage: '1-0-0 OD' },

  // Corticosteroids, Thyroid & Others
  { name: 'Thyronorm 25mcg / 50mcg / 100mcg (Levothyroxine)', category: 'Hypothyroidism / Hormone', form: 'Tablet', defaultDosage: '1-0-0 BF' },
  { name: 'Prednisolone 5mg / 10mg / 20mg (Wysolone)', category: 'Corticosteroid / Anti-inflammatory', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Deflazacort 6mg (Defcort 6)', category: 'Corticosteroid', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Dexamethasone 0.5mg / 4mg (Dexona)', category: 'Corticosteroid', form: 'Tablet', defaultDosage: '1-0-1 AF' },
  { name: 'Febuxostat 40mg (Febutaz 40 / Feburic)', category: 'Antigout / Uric Acid Lowering', form: 'Tablet', defaultDosage: '1-0-0 OD' },
];

export const CLINICAL_TREATMENTS_CATALOG = CLINICAL_MEDICINES_CATALOG;

function getMedicinesSuggestionsList(db) {
  const sharedMedicines = getSharedMasterCollection('medicines');
  const map = new Map();

  // 1. Shared master catalogue provides universal medicine list for all clinics
  sharedMedicines.forEach((item) => {
    const clinicCode = (db?.clinicShortcuts?.medicines?.[item.name] || db?.clinicShortcuts?.medicines?.[item.id] || '').trim();
    map.set(item.name.toLowerCase(), {
      name: item.name,
      code: clinicCode,
      category: item.category || 'Clinical Pharmacy',
      form: item.form || 'Tablet',
      defaultDosage: item.defaultDosage || '1-0-1 AF',
      defaultQty: item.defaultQty || '1',
    });
  });

  // 2. Doctor/Clinic-specific custom medicines & overrides
  (db?.masterMedicines || []).forEach((item) => {
    const clinicCode = (db?.clinicShortcuts?.medicines?.[item.name] || db?.clinicShortcuts?.medicines?.[item.id] || '').trim();
    map.set(item.name.toLowerCase(), {
      name: item.name,
      code: clinicCode,
      category: item.category || 'Medicine',
      form: item.form || 'Tablet',
      defaultDosage: item.defaultDosage || '1-0-1 AF',
      defaultQty: item.defaultQty || '1',
    });
  });

  return Array.from(map.values());
}

function getTreatmentsSuggestionsList(db) {
  // Source is unified medicine catalogue for both Prescription and Clinic Treatment tables
  return getMedicinesSuggestionsList(db);
}

function parseDosageString(str) {
  const res = { mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' };
  if (!str || typeof str !== 'string') return res;

  const clean = str.trim().toUpperCase();
  if (clean.includes('BF') || clean.includes('BEFORE')) res.timing = 'BF';
  else res.timing = 'AF';

  const parts = clean.replace(/[^0-9\-]/g, '').split('-').filter(Boolean);
  if (parts.length === 4) {
    res.mor = parts[0] || '1';
    res.noon = parts[1] || '0';
    res.eve = parts[2] || '1';
    res.ngt = parts[3] || '0';
  } else if (parts.length === 3) {
    res.mor = parts[0] || '1';
    res.noon = parts[1] || '0';
    res.eve = parts[2] || '1';
    res.ngt = '0';
  } else if (parts.length === 2) {
    res.mor = parts[0] || '1';
    res.noon = '0';
    res.eve = parts[1] || '1';
    res.ngt = '0';
  } else if (parts.length === 1) {
    res.mor = parts[0] || '1';
    res.noon = '0';
    res.eve = '0';
    res.ngt = '0';
  }
  return res;
}

function setupMedicineAutocomplete(inputEl, db, onSelect) {
  if (!inputEl) return;
  const parent = inputEl.parentElement;
  if (!parent) return;

  let box = parent.querySelector('.cms-medicine-autocomplete-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'cms-medicine-autocomplete-box';
    box.style.display = 'none';
    parent.appendChild(box);
  }

  let activeIndex = 0;
  let currentMatches = [];
  let isJustSelected = false;

  function hideBox() {
    box.style.display = 'none';
    box.innerHTML = '';
    currentMatches = [];
  }

  function updateHighlight() {
    const items = box.querySelectorAll('.cms-medicine-autocomplete-item');
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  function pickItem(item) {
    if (!item) return;
    isJustSelected = true;
    inputEl.value = item.name;
    hideBox();
    if (onSelect) onSelect(item);
  }

  function checkExactShortcut(val) {
    const clean = (val || '').trim().toLowerCase();
    if (!clean) return null;
    const allMeds = getMedicinesSuggestionsList(db);
    return allMeds.find((m) => {
      const c = (m.code || '').trim().toLowerCase();
      return c && c === clean;
    });
  }

  function renderSuggestions(e) {
    if (isJustSelected) {
      isJustSelected = false;
      hideBox();
      return;
    }
    const q = inputEl.value.trim().toLowerCase();
    const allMeds = getMedicinesSuggestionsList(db);

    // If triggered on focus and input already contains an exact full medicine name or is filled, do not pop open suggestions
    if (e && e.type === 'focus' && q) {
      const isExact = allMeds.some((m) => m.name.toLowerCase() === q);
      if (isExact) {
        hideBox();
        return;
      }
    }

    const matches = allMeds.filter((m) => {
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.code && m.code.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.form && m.form.toLowerCase().includes(q))
      );
    });

    // Prioritize exact code matches
    matches.sort((a, b) => {
      const codeA = (a.code || '').toLowerCase();
      const codeB = (b.code || '').toLowerCase();
      if (codeA === q) return -1;
      if (codeB === q) return 1;
      return 0;
    });

    currentMatches = matches.slice(0, 10);
    activeIndex = 0;

    if (currentMatches.length === 0) {
      hideBox();
      return;
    }

    box.innerHTML = currentMatches
      .map(
        (m, idx) => `
      <div class="cms-medicine-autocomplete-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}" style="padding: 6px 10px; cursor: pointer; border-radius: 6px; border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.12s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <div style="font-weight: 700; font-size: 12.5px; color: var(--text);">
            <i class="fa-solid fa-pills" style="color: #0d9488; font-size: 11px; margin-right: 4px;"></i>
            <span>${m.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${m.code ? `<span class="cms-kbd font-mono" style="font-size: 9.5px; padding: 1px 4px; background: #e6fffa; color: #0f766e; border: 1px solid #99f6e4;">${m.code}</span>` : ''}
            <span class="cms-pill" style="font-size: 9.5px; padding: 1px 6px; background: #e6fffa; color: #0f766e; border: 1px solid #99f6e4; font-weight: 800; white-space: nowrap;">
              ${m.form || 'Tab'}
            </span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px; font-size: 11px; color: var(--text-muted);">
          <span>${m.category || 'Clinical Pharmacy'}</span>
          ${m.defaultDosage ? `<span style="font-family: var(--font-mono); font-weight: 700; color: #0d9488;">Dose: ${m.defaultDosage}</span>` : ''}
        </div>
      </div>
    `
      )
      .join('');

    box.querySelectorAll('.cms-medicine-autocomplete-item').forEach((itemEl) => {
      itemEl.addEventListener('mouseenter', () => {
        activeIndex = Number(itemEl.getAttribute('data-idx'));
        updateHighlight();
      });

      itemEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(itemEl.getAttribute('data-idx'));
        pickItem(currentMatches[idx]);
      });
    });

    box.style.display = 'flex';
  }

  inputEl.addEventListener('input', (e) => {
    isJustSelected = false;
    renderSuggestions(e);
  });

  inputEl.addEventListener('focus', renderSuggestions);

  inputEl.addEventListener('blur', () => {
    const exactMatch = checkExactShortcut(inputEl.value);
    if (exactMatch) {
      pickItem(exactMatch);
    }
    setTimeout(() => {
      hideBox();
    }, 200);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      const exactMatch = checkExactShortcut(inputEl.value);
      if (exactMatch) {
        e.preventDefault();
        e.stopPropagation();
        pickItem(exactMatch);
        return;
      }

      if (box.style.display !== 'none' && currentMatches.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const itemToPick = currentMatches[activeIndex] || currentMatches[0];
        if (itemToPick) pickItem(itemToPick);
        return;
      }
    }

    if (box.style.display !== 'none' && currentMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        activeIndex = (activeIndex + 1) % currentMatches.length;
        updateHighlight();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        activeIndex = (activeIndex - 1 + currentMatches.length) % currentMatches.length;
        updateHighlight();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        hideBox();
        return;
      }
    }
  });
}

function setupTreatmentAutocomplete(inputEl, db, onSelect) {
  if (!inputEl) return;
  const parent = inputEl.parentElement;
  if (!parent) return;

  let box = parent.querySelector('.cms-treatment-autocomplete-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'cms-treatment-autocomplete-box';
    box.style.display = 'none';
    parent.appendChild(box);
  }

  let activeIndex = 0;
  let currentMatches = [];
  let isJustSelected = false;

  function hideBox() {
    box.style.display = 'none';
    box.innerHTML = '';
    currentMatches = [];
  }

  function updateHighlight() {
    const items = box.querySelectorAll('.cms-treatment-autocomplete-item');
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  function pickItem(item) {
    if (!item) return;
    isJustSelected = true;
    inputEl.value = item.name;
    hideBox();
    if (onSelect) onSelect(item);
  }

  function checkExactShortcut(val) {
    const clean = (val || '').trim().toLowerCase();
    if (!clean) return null;
    const allTr = getTreatmentsSuggestionsList(db);
    return allTr.find((m) => {
      const c = (m.code || '').trim().toLowerCase();
      return c && c === clean;
    });
  }

  function renderSuggestions(e) {
    if (isJustSelected) {
      isJustSelected = false;
      hideBox();
      return;
    }
    const q = inputEl.value.trim().toLowerCase();
    const allTr = getTreatmentsSuggestionsList(db);

    // If triggered on focus and input already contains exact name, do not pop open suggestions
    if (e && e.type === 'focus' && q) {
      const isExact = allTr.some((t) => t.name.toLowerCase() === q);
      if (isExact) {
        hideBox();
        return;
      }
    }

    const matches = allTr.filter((t) => {
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.code && t.code.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.form && t.form.toLowerCase().includes(q))
      );
    });

    matches.sort((a, b) => {
      const codeA = (a.code || '').toLowerCase();
      const codeB = (b.code || '').toLowerCase();
      if (codeA === q) return -1;
      if (codeB === q) return 1;
      return 0;
    });

    currentMatches = matches.slice(0, 10);
    activeIndex = 0;

    if (currentMatches.length === 0) {
      hideBox();
      return;
    }

    box.innerHTML = currentMatches
      .map(
        (t, idx) => `
      <div class="cms-treatment-autocomplete-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}" style="padding: 6px 10px; cursor: pointer; border-radius: 6px; border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.12s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <div style="font-weight: 700; font-size: 12.5px; color: var(--text);">
            <i class="fa-solid fa-pills" style="color: #0f766e; font-size: 11px; margin-right: 4px;"></i>
            <span>${t.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${t.code ? `<span class="cms-kbd font-mono" style="font-size: 9.5px; padding: 1px 4px; background: #fff1f2; color: #b91c1c; border: 1px solid #fecdd3;">${t.code}</span>` : ''}
            <span class="cms-pill" style="font-size: 9.5px; padding: 1px 6px; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; font-weight: 800; white-space: nowrap;">
              ${t.form || 'Tab'}
            </span>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    box.querySelectorAll('.cms-treatment-autocomplete-item').forEach((itemEl) => {
      itemEl.addEventListener('mouseenter', () => {
        activeIndex = Number(itemEl.getAttribute('data-idx'));
        updateHighlight();
      });

      itemEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(itemEl.getAttribute('data-idx'));
        pickItem(currentMatches[idx]);
      });
    });

    box.style.display = 'flex';
  }

  inputEl.addEventListener('input', (e) => {
    isJustSelected = false;
    renderSuggestions(e);
  });
  inputEl.addEventListener('focus', renderSuggestions);

  inputEl.addEventListener('blur', () => {
    const exactMatch = checkExactShortcut(inputEl.value);
    if (exactMatch) {
      pickItem(exactMatch);
    }
    setTimeout(() => {
      hideBox();
    }, 200);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      const exactMatch = checkExactShortcut(inputEl.value);
      if (exactMatch) {
        e.preventDefault();
        e.stopPropagation();
        pickItem(exactMatch);
        return;
      }

      if (box.style.display !== 'none' && currentMatches.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const itemToPick = currentMatches[activeIndex] || currentMatches[0];
        if (itemToPick) pickItem(itemToPick);
        return;
      }
    }

    if (box.style.display !== 'none' && currentMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        activeIndex = (activeIndex + 1) % currentMatches.length;
        updateHighlight();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        activeIndex = (activeIndex - 1 + currentMatches.length) % currentMatches.length;
        updateHighlight();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        hideBox();
        return;
      }
    }
  });
}


