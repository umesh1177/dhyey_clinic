/**
 * =========================================================
 * CLINICAL LABORATORY INVESTIGATION & DIAGNOSTIC REPORTS
 * Full 3-Tab Lab Investigation System Matching Photos 1 & 2:
 * 1) Routine Hemetology Report (Hb, RBC, WBC, Platelets, ESR, Sugar, Renal, Vit B12, DLC, Thyroid)
 * 2) Routine Urine Examination Report (Physical, Chemical, Microscopic Pus/RBC/Crystals/Casts)
 * 3) Other Reports (Bilirubin, SGPT, G6PD, HIV, Widal Test + 4 Large Writable Boxes for X-Ray, Stool, Sonography, MRI/CTScan)
 * Real-time Red Highlighting for Out-of-Range Lab Values
 * =========================================================
 */

import { fmtDate, todayISO, showToast, uid, getAuthSession } from './api.js';

// Normal Range Definitions for Automatic Out-of-Range Validation
export const LAB_NORMAL_RANGES = {
  // Hemetology
  hemo: { min: 12.0, max: 16.0, unit: 'gm%', label: 'Hemoglobin' },
  rbc: { min: 4.2, max: 5.4, unit: 'mill /c.mm', label: 'RBC Count' },
  wbc: { min: 4000, max: 10000, unit: '/c.mm', label: 'WBC Count' },
  platelets: { min: 150000, max: 400000, unit: '/c mm', label: 'Platelet Count' },
  esr: { min: 2, max: 20, unit: 'mm/hr.', label: 'ESR' },
  
  // Blood Sugar & Biochemistry
  rbs: { min: 60, max: 120, unit: 'mg%', label: 'RBS' },
  fbs: { min: 70, max: 100, unit: 'mg%', label: 'FBS' },
  ppbs: { min: 70, max: 140, unit: 'mg%', label: 'PPBS' },
  creatinin: { min: 0.5, max: 1.5, unit: 'mg/dl', label: 'S.Creatinin' },
  vitb12: { min: 200, max: 900, unit: 'pg/ml', label: 'Vitamin B 12' },

  // Differential Leukocytes
  bandcell: { min: 0, max: 6, unit: '%', label: 'Band Cell' },
  neutrophils: { min: 55, max: 70, unit: '%', label: 'Neutrophils' },
  lymphocytes: { min: 20, max: 40, unit: '%', label: 'Lymphocytes' },
  eosinophils: { min: 1, max: 6, unit: '%', label: 'Eosinophils' },
  monocytes: { min: 2, max: 8, unit: '%', label: 'Monocytes' },
  basophils: { min: 0, max: 1, unit: '%', label: 'Basophils' },

  // Thyroid Function
  t3: { min: 82, max: 200, unit: 'ng/ml', label: 'T3' },
  t4: { min: 4.5, max: 12.5, unit: 'mg%', label: 'T4' },
  tsh: { min: 0.4, max: 6.0, unit: 'mlu/ml', label: 'TSH' },

  // Bilirubin & Liver (Other Reports)
  biliTotal: { min: 0.0, max: 1.0, unit: 'mg/dl', label: 'Total Bilirubin' },
  biliDirect: { min: 0.0, max: 0.3, unit: 'mg/dl', label: 'Direct Bilirubin' },
  biliIndirect: { min: 0.1, max: 1.0, unit: 'mg/dl', label: 'Indirect Bilirubin' },
  sgpt: { min: 10, max: 40, unit: 'IU / L', label: 'S.G.P.T.' },

  // Urine Examination
  urineSpGravity: { min: 1.005, max: 1.030, unit: '', label: 'Specific Gravity' },
  urinePh: { min: 4.5, max: 8.0, unit: '', label: 'Reaction (pH)' },
  urinePus: { min: 0, max: 5, unit: '/ HPF', label: 'Pus Cells' },
  urineEpithelial: { min: 1, max: 4, unit: '/ HPF', label: 'Epithelial Cells' },
  urineRbc: { min: 0, max: 2, unit: '/ HPF', label: 'R.B.C.' },
};

/**
 * Checks if a typed value is outside normal reference range
 */
export function isValueOutOfRange(key, rawVal) {
  if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') return false;
  const str = String(rawVal).trim().toUpperCase();

  // Qualitative checks
  if (['REACTIVE', 'POSITIVE', 'DEFICIENT', '+', '++', '+++', 'P.VIVEX +', 'P.FALCIPARUM +', '1:160', '1:320', 'INCREASED'].some(bad => str.includes(bad))) {
    return true;
  }
  if (['NON REACTIVE', 'NEGATIVE', 'NIL', 'NORMAL', 'NOT SEEN', '1:20', '1:40'].some(good => str === good)) {
    return false;
  }

  // Parse numeric component
  const range = LAB_NORMAL_RANGES[key];
  if (!range) return false;

  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) {
    // If text like "PUS-10-15" (as seen in photo) or abnormal note
    return str.includes('-') && (str.includes('PUS') || str.includes('HIGH') || str.includes('+'));
  }

  return num < range.min || num > range.max;
}

/**
 * Main Laboratory Investigation Reports Modal
 */
export function openLabReportModal(patient, family, visit, initialData = {}, onSave, onClose) {
  let modalOverlay = document.querySelector('#lab-report-modal-overlay');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'lab-report-modal-overlay';
    modalOverlay.className = 'cms-overlay';
    modalOverlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 15px;';
    document.body.appendChild(modalOverlay);
  }

  const session = getAuthSession();
  const defaultDocName = session?.profile?.name ? (session.profile.name.startsWith('Dr.') ? session.profile.name : `Dr. ${session.profile.name}`) : '';

  // Active Sub-Tab: 'hemetology' | 'urine' | 'other'
  let activeTab = 'hemetology';

  // State: Clean and empty defaults so newly opened reports do not pre-fill dummy/fake values
  let formData = {
    familyName: family?.headName || patient?.familyHead || '',
    patientName: patient?.name || '',
    caseNo: visit?.caseId || visit?.id || '',
    entryNo: initialData.entryNo || '',
    labName: initialData.labName || '',
    drName: initialData.drName || defaultDocName,
    entryDate: initialData.entryDate || visit?.date || todayISO(),
    
    // Tab 1: Routine Hemetology
    hemo: '',
    rbc: '',
    wbc: '',
    platelets: '',
    esr: '',
    rbs: '',
    fbs: '',
    ppbs: '',
    creatinin: '',
    vitb12: '',
    bandcell: '',
    neutrophils: '',
    lymphocytes: '',
    eosinophils: '',
    monocytes: '',
    basophils: '',
    parasites: '',
    t3: '',
    t4: '',
    tsh: '',

    // Tab 2: Routine Urine
    urineQty: '',
    urineColor: '',
    urineAppearance: '',
    urineSpGravity: '',
    urinePh: '',
    urineAlbumin: '',
    urineSugar: '',
    urineBileSalts: '',
    urineBilePigments: '',
    urineKetones: '',
    urineBlood: '',
    urineUrobilinogen: '',
    urinePus: '',
    urineEpithelial: '',
    urineRbc: '',
    urineCrystals: '',
    urineCasts: '',
    urineBacteria: '',
    urineOther: '',

    // Tab 3: Other Reports (Photo 2)
    biliTotal: '',
    biliDirect: '',
    biliIndirect: '',
    sgpt: '',
    g6pd: '',
    hivTest: '',
    widalTyphiO: '',
    widalTyphiH: '',
    widalParatyphiAH: '',
    widalParatyphiBH: '',
    widalResult: '',
    
    // 4 Writable Multiline Free-Text Boxes
    xrayNotes: '',
    stoolNotes: '',
    sonographyNotes: '',
    mriCtscanNotes: '',

    ...(initialData || {}),
  };

  function renderModal() {
    modalOverlay.innerHTML = `
      <div class="cms-lab-modal-container" onclick="event.stopPropagation()">
        
        <!-- Window Title Bar -->
        <div class="cms-lab-modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-flask-vial" style="font-size: 17px;"></i>
            <span style="font-weight: 800; font-size: 14.5px; letter-spacing: 0.4px;">
              CMS - Laboratory Investigation &amp; Diagnostic Management Software
            </span>
          </div>
          <button type="button" id="btn-close-lab-modal-top" class="cms-btn-ghost" style="color: #fff; font-size: 18px; padding: 2px 8px; border-radius: 6px;" title="Close Window">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Top Metadata Form (Exact match to Photo 1 & 2 Header) -->
        <div class="cms-lab-meta-grid">
          <!-- Col 1 -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div class="cms-lab-meta-row">
              <span class="cms-lab-meta-label">Family Name :</span>
              <input type="text" id="meta-family-name" class="cms-lab-meta-input" value="${formData.familyName}" placeholder="Family Name" />
            </div>
            <div class="cms-lab-meta-row">
              <span class="cms-lab-meta-label">Patient Name :</span>
              <input type="text" id="meta-patient-name" class="cms-lab-meta-input" value="${formData.patientName}" placeholder="Patient Full Name" />
            </div>
          </div>

          <!-- Col 2 -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div class="cms-lab-meta-row">
              <span class="cms-lab-meta-label">Lab Name :</span>
              <input type="text" id="meta-lab-name" class="cms-lab-meta-input" list="dl-lab-names" value="${formData.labName}" placeholder="Diagnostic Laboratory Name" />
              <datalist id="dl-lab-names">
                <option value="Surat Diagnostic &amp; Clinical Pathology Laboratory">
                <option value="Dhyey Hospital Pathology Lab">
                <option value="Shivam Diagnostic Laboratory">
                <option value="Metropolis Healthcare Lab">
                <option value="Dr. Lal PathLabs">
              </datalist>
            </div>
            <div class="cms-lab-meta-row">
              <span class="cms-lab-meta-label">Dr Name :</span>
              <input type="text" id="meta-dr-name" class="cms-lab-meta-input" list="dl-lab-drs" value="${formData.drName}" placeholder="Attending / Consultant Doctor" />
              <datalist id="dl-lab-drs">
                <option value="Dr. Sandeep Shah (M.D. Path)">
                <option value="Dr. Chirag Paghdal">
                <option value="Dr. K. Mehta">
                <option value="Dr. Ramesh Patel">
              </datalist>
            </div>
          </div>

          <!-- Col 3 -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div class="cms-lab-meta-row">
              <span class="cms-lab-meta-label" style="min-width: 65px;">Case No :</span>
              <input type="text" id="meta-case-no" class="cms-lab-meta-input font-mono" style="font-weight: 700; width: 85px;" value="${formData.caseNo}" />
            </div>
            <div class="cms-lab-meta-row">
              <span class="cms-lab-meta-label" style="min-width: 65px;">Entry Date :</span>
              <input type="date" id="meta-entry-date" class="cms-lab-meta-input font-mono" style="font-weight: 700;" value="${formData.entryDate}" />
            </div>
          </div>
        </div>

        <!-- Horizontal Sub-Navigation Tabs (Matching Photo 1 & 2) -->
        <div class="cms-lab-tabs-nav">
          <button type="button" class="cms-lab-tab-btn ${activeTab === 'hemetology' ? 'active' : ''}" data-tab="hemetology">
            <i class="fa-solid fa-droplet" style="color: #dc2626; margin-right: 4px;"></i> Routine Hemetology Report
          </button>
          <button type="button" class="cms-lab-tab-btn ${activeTab === 'urine' ? 'active' : ''}" data-tab="urine">
            <i class="fa-solid fa-vial" style="color: #eab308; margin-right: 4px;"></i> Routine Urine Examination Report
          </button>
          <button type="button" class="cms-lab-tab-btn ${activeTab === 'other' ? 'active' : ''}" data-tab="other">
            <i class="fa-solid fa-notes-medical" style="color: #0284c7; margin-right: 4px;"></i> Other Reports (Bilirubin, Widal, X-Ray, Stool, USG, CT)
          </button>
        </div>

        <!-- Main Body: Active Tab Content + Right Action Rail -->
        <div style="display: flex; flex: 1; overflow: hidden; background: #ffffff;">
          
          <!-- Left Main Forms Area -->
          <div class="cms-lab-body-container">
            ${activeTab === 'hemetology' ? renderHemetologyTab() : activeTab === 'urine' ? renderUrineTab() : renderOtherReportsTab()}
          </div>

          <!-- Right Action Rail (Matching Photo 1 & 2) -->
          <div style="width: 130px; background: #f1f5f9; border-left: 1.5px solid var(--border); padding: 16px 12px; display: flex; flex-direction: column; gap: 10px;">
            <button type="button" id="btn-lab-save" class="cms-btn cms-btn-primary" style="background: #0f5132; padding: 10px 12px; font-weight: 800; font-size: 13px; border-radius: 6px;">
              <i class="fa-solid fa-floppy-disk"></i> Save
            </button>
            <button type="button" id="btn-lab-print" class="cms-btn cms-btn-ghost" style="border: 1px solid var(--border); background: #ffffff; padding: 8px 12px; font-size: 12px; font-weight: 700;">
              <i class="fa-solid fa-print"></i> Print
            </button>
            <button type="button" id="btn-lab-clear" class="cms-btn cms-btn-ghost" style="border: 1px solid var(--border); background: #ffffff; padding: 8px 12px; font-size: 12px;">
              <i class="fa-solid fa-eraser"></i> Clear
            </button>
            <button type="button" id="btn-lab-cancel" class="cms-btn cms-btn-ghost" style="border: 1px solid var(--border); background: #ffffff; padding: 8px 12px; font-size: 12px;">
              Cancel
            </button>
            <div style="flex: 1;"></div>
            <button type="button" id="btn-lab-exit" class="cms-btn cms-btn-danger" style="padding: 9px 12px; font-weight: 800; font-size: 12.5px; border-radius: 6px;">
              <i class="fa-solid fa-door-open"></i> Exit
            </button>
          </div>
        </div>

      </div>
    `;

    attachModalHandlers();
  }

  // ==========================================
  // TAB 1: ROUTINE HEMETOLOGY REPORT (Photo 1)
  // ==========================================
  function renderHemetologyTab() {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        
        <!-- Left Side: CBC Routine & Polymorphs -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- Section 1: PARAMETER | RESULT | NORMAL RANGE -->
          <div>
            <div class="cms-lab-section-header">Routine Hematology (CBC) Parameters</div>
            <div style="display: grid; grid-template-columns: 130px 110px 1fr; font-weight: 800; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px dashed var(--border);">
              <span style="text-align: right; padding-right: 8px;">PARAMETER</span>
              <span style="text-align: center;">RESULT</span>
              <span>NORMAL RANGE</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Hemoglobin :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('hemo', formData.hemo) ? 'cms-lab-out-of-range' : ''}" data-key="hemo" value="${formData.hemo}" placeholder="12.0-16.0" />
              <span class="cms-lab-field-range">( 12.0 - 16.0 gm% )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">RBC Count :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('rbc', formData.rbc) ? 'cms-lab-out-of-range' : ''}" data-key="rbc" value="${formData.rbc}" placeholder="4.2-5.4" />
              <span class="cms-lab-field-range">( 4.2 - 5.4 mill /c.mm )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">WBC Count :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('wbc', formData.wbc) ? 'cms-lab-out-of-range' : ''}" data-key="wbc" value="${formData.wbc}" placeholder="4000-10000" />
              <span class="cms-lab-field-range">( 4000 - 10,000 /c.mm )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Platelet Count :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('platelets', formData.platelets) ? 'cms-lab-out-of-range' : ''}" data-key="platelets" value="${formData.platelets}" placeholder="150000-400000" />
              <span class="cms-lab-field-range">( 1,50,000 - 4,00,000 / c mm )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">ESR :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('esr', formData.esr) ? 'cms-lab-out-of-range' : ''}" data-key="esr" value="${formData.esr}" placeholder="2-20" />
              <span class="cms-lab-field-range">( 2 - 20 mm/hr. ) (&lt; 50 yrs)</span>
            </div>
          </div>

          <!-- Section 2: DIFFERENTIAL WBC COUNT POLYMORPHS -->
          <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 10px;">
            <div class="cms-lab-section-header" style="color: #b45309; border-color: #fde68a;">
              DIFFERENTIAL WBC COUNT POLYMORPHS
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Band Cell :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('bandcell', formData.bandcell) ? 'cms-lab-out-of-range' : ''}" data-key="bandcell" value="${formData.bandcell}" placeholder="0-6" />
              <span class="cms-lab-field-range">( 0 - 6 % )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Neutrophils :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('neutrophils', formData.neutrophils) ? 'cms-lab-out-of-range' : ''}" data-key="neutrophils" value="${formData.neutrophils}" placeholder="55-70" />
              <span class="cms-lab-field-range">( 55 - 70 % )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Lymphocytes :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('lymphocytes', formData.lymphocytes) ? 'cms-lab-out-of-range' : ''}" data-key="lymphocytes" value="${formData.lymphocytes}" placeholder="20-40" />
              <span class="cms-lab-field-range">( 20 - 40 % )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Eosinophils :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('eosinophils', formData.eosinophils) ? 'cms-lab-out-of-range' : ''}" data-key="eosinophils" value="${formData.eosinophils}" placeholder="1-6" />
              <span class="cms-lab-field-range">( 1 - 6 % )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Monocytes :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('monocytes', formData.monocytes) ? 'cms-lab-out-of-range' : ''}" data-key="monocytes" value="${formData.monocytes}" placeholder="2-8" />
              <span class="cms-lab-field-range">( 2 - 8 % )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Basophils :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('basophils', formData.basophils) ? 'cms-lab-out-of-range' : ''}" data-key="basophils" value="${formData.basophils}" placeholder="0-1" />
              <span class="cms-lab-field-range">( 0 - 01 % )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Parasites :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('parasites', formData.parasites) ? 'cms-lab-out-of-range' : ''}" data-key="parasites" list="dl-parasites" value="${formData.parasites}" />
              <datalist id="dl-parasites">
                <option value="NOT SEEN">
                <option value="P.VIVEX +">
                <option value="P.VIVEX ++">
                <option value="P.FALCIPARUM +">
                <option value="MALARIAL PARASITE SEEN">
              </datalist>
              <span class="cms-lab-field-range">( Negative / Not Seen )</span>
            </div>
          </div>

        </div>

        <!-- Right Side: Blood Glucose, Renal, Vitamin B12, Thyroid -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- Section 3: Blood Sugar & Renal -->
          <div>
            <div class="cms-lab-section-header">Blood Glucose &amp; Renal Profile</div>
            
            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">RBS :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('rbs', formData.rbs) ? 'cms-lab-out-of-range' : ''}" data-key="rbs" value="${formData.rbs}" placeholder="60-120" />
              <span class="cms-lab-field-range">( upto - 120 mg% )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">FBS :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('fbs', formData.fbs) ? 'cms-lab-out-of-range' : ''}" data-key="fbs" value="${formData.fbs}" placeholder="70-100" />
              <span class="cms-lab-field-range">( 70 - 100 mg% )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">PPBS :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('ppbs', formData.ppbs) ? 'cms-lab-out-of-range' : ''}" data-key="ppbs" value="${formData.ppbs}" placeholder="70-140" />
              <span class="cms-lab-field-range">( upto - 140 mg% )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">S.Creatinin :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('creatinin', formData.creatinin) ? 'cms-lab-out-of-range' : ''}" data-key="creatinin" value="${formData.creatinin}" placeholder="0.5-1.5" />
              <span class="cms-lab-field-range">( 0.5 - 1.5 mg/dl )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Vitamin B 12 :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('vitb12', formData.vitb12) ? 'cms-lab-out-of-range' : ''}" data-key="vitb12" value="${formData.vitb12}" placeholder="200-900" />
              <span class="cms-lab-field-range">( 200 - 900 pg/ml )</span>
            </div>
          </div>

          <!-- Section 4: Thyroid Function Test -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px;">
            <div class="cms-lab-section-header" style="color: #15803d; border-color: #86efac;">
              Thyroid Function Test :
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">T3 :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('t3', formData.t3) ? 'cms-lab-out-of-range' : ''}" data-key="t3" value="${formData.t3}" placeholder="82-200" />
              <span class="cms-lab-field-range">( 82 - 200 ng/ml )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">T4 :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('t4', formData.t4) ? 'cms-lab-out-of-range' : ''}" data-key="t4" value="${formData.t4}" placeholder="4.5-12.5" />
              <span class="cms-lab-field-range">( 4.5 - 12.5 mg% )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">TSH :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('tsh', formData.tsh) ? 'cms-lab-out-of-range' : ''}" data-key="tsh" value="${formData.tsh}" placeholder="0.4-6.0" />
              <span class="cms-lab-field-range">( 0.4 - 6.0 mlu/ml )</span>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // ==========================================
  // TAB 2: ROUTINE URINE EXAMINATION REPORT
  // ==========================================
  function renderUrineTab() {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        
        <!-- Left Side: Physical & Chemical Examination -->
        <div>
          <div class="cms-lab-section-header">Physical &amp; Chemical Examination</div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Quantity :</span>
            <input type="text" class="cms-lab-field-input lab-val-input" data-key="urineQty" value="${formData.urineQty}" />
            <span class="cms-lab-field-range">( 30 - 50 ml )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Color :</span>
            <input type="text" class="cms-lab-field-input lab-val-input" data-key="urineColor" list="dl-urine-color" value="${formData.urineColor}" />
            <datalist id="dl-urine-color">
              <option value="Pale Yellow">
              <option value="Straw Yellow">
              <option value="Clear / Watery">
              <option value="Deep Amber">
              <option value="Reddish / Turbid">
            </datalist>
            <span class="cms-lab-field-range">( Pale Yellow )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Appearance :</span>
            <input type="text" class="cms-lab-field-input lab-val-input" data-key="urineAppearance" list="dl-urine-app" value="${formData.urineAppearance}" />
            <datalist id="dl-urine-app">
              <option value="Clear">
              <option value="Slightly Hazy">
              <option value="Turbid">
              <option value="Cloudy">
            </datalist>
            <span class="cms-lab-field-range">( Clear )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Sp. Gravity :</span>
            <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('urineSpGravity', formData.urineSpGravity) ? 'cms-lab-out-of-range' : ''}" data-key="urineSpGravity" value="${formData.urineSpGravity}" />
            <span class="cms-lab-field-range">( 1.005 - 1.030 )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Reaction (pH) :</span>
            <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('urinePh', formData.urinePh) ? 'cms-lab-out-of-range' : ''}" data-key="urinePh" value="${formData.urinePh}" />
            <span class="cms-lab-field-range">( 4.5 - 8.0 Acidic )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Albumin :</span>
            <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('urineAlbumin', formData.urineAlbumin) ? 'cms-lab-out-of-range' : ''}" data-key="urineAlbumin" list="dl-urine-alb" value="${formData.urineAlbumin}" />
            <datalist id="dl-urine-alb">
              <option value="Nil">
              <option value="Trace">
              <option value="+ (30 mg/dl)">
              <option value="++ (100 mg/dl)">
              <option value="+++ (300 mg/dl)">
            </datalist>
            <span class="cms-lab-field-range">( Nil )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Sugar :</span>
            <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('urineSugar', formData.urineSugar) ? 'cms-lab-out-of-range' : ''}" data-key="urineSugar" list="dl-urine-sug" value="${formData.urineSugar}" />
            <datalist id="dl-urine-sug">
              <option value="Nil">
              <option value="Trace">
              <option value="0.5% (+)">
              <option value="1% (++)">
              <option value="2% (+++)">
            </datalist>
            <span class="cms-lab-field-range">( Nil )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Bile Salts :</span>
            <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('urineBileSalts', formData.urineBileSalts) ? 'cms-lab-out-of-range' : ''}" data-key="urineBileSalts" value="${formData.urineBileSalts}" />
            <span class="cms-lab-field-range">( Negative )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Ketone Bodies :</span>
            <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('urineKetones', formData.urineKetones) ? 'cms-lab-out-of-range' : ''}" data-key="urineKetones" value="${formData.urineKetones}" />
            <span class="cms-lab-field-range">( Negative )</span>
          </div>
        </div>

        <!-- Right Side: Microscopic Examination -->
        <div>
          <div class="cms-lab-section-header">Microscopic Examination (per HPF)</div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Pus Cells :</span>
            <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('urinePus', formData.urinePus) ? 'cms-lab-out-of-range' : ''}" data-key="urinePus" value="${formData.urinePus}" placeholder="0-5" />
            <span class="cms-lab-field-range">( 0 - 5 / HPF )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Epithelial Cells :</span>
            <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('urineEpithelial', formData.urineEpithelial) ? 'cms-lab-out-of-range' : ''}" data-key="urineEpithelial" value="${formData.urineEpithelial}" placeholder="1-4" />
            <span class="cms-lab-field-range">( 1 - 4 / HPF )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">R.B.C. :</span>
            <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('urineRbc', formData.urineRbc) ? 'cms-lab-out-of-range' : ''}" data-key="urineRbc" value="${formData.urineRbc}" placeholder="0-2" />
            <span class="cms-lab-field-range">( 0 - 2 / HPF )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Crystals :</span>
            <input type="text" class="cms-lab-field-input lab-val-input" data-key="urineCrystals" list="dl-crystals" value="${formData.urineCrystals}" />
            <datalist id="dl-crystals">
              <option value="Nil">
              <option value="Calcium Oxalate (+)">
              <option value="Uric Acid Crystals">
              <option value="Triple Phosphate">
              <option value="Amorphous Urates">
            </datalist>
            <span class="cms-lab-field-range">( Nil / Not seen )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Casts :</span>
            <input type="text" class="cms-lab-field-input lab-val-input" data-key="urineCasts" list="dl-casts" value="${formData.urineCasts}" />
            <datalist id="dl-casts">
              <option value="Nil">
              <option value="Hyaline Casts">
              <option value="Granular Casts">
            </datalist>
            <span class="cms-lab-field-range">( Nil )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Bacteria :</span>
            <input type="text" class="cms-lab-field-input lab-val-input" data-key="urineBacteria" list="dl-bacteria" value="${formData.urineBacteria}" />
            <datalist id="dl-bacteria">
              <option value="Nil">
              <option value="Few">
              <option value="Moderate (+)">
              <option value="Plenty (+++)">
            </datalist>
            <span class="cms-lab-field-range">( Nil )</span>
          </div>

          <div class="cms-lab-field-row">
            <span class="cms-lab-field-label">Other :</span>
            <input type="text" class="cms-lab-field-input lab-val-input" data-key="urineOther" value="${formData.urineOther}" placeholder="Mucus / Nil" />
            <span class="cms-lab-field-range">( Nil )</span>
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // TAB 3: OTHER REPORTS (Photo 2 Exact Match)
  // ==========================================
  function renderOtherReportsTab() {
    return `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        
        <!-- Top Half: Bilirubin (Left) & S.Widal TEST (Right) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          
          <!-- Left: Bilirubin & Hepatic / Viral -->
          <div>
            <div class="cms-lab-section-header">Bilirubin &amp; Hepatic Enzymes</div>
            <div style="display: grid; grid-template-columns: 130px 110px 1fr; font-weight: 800; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px dashed var(--border);">
              <span style="text-align: right; padding-right: 8px;">PARAMETER</span>
              <span style="text-align: center;">RESULT</span>
              <span>NORMAL RANGE</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Total :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('biliTotal', formData.biliTotal) ? 'cms-lab-out-of-range' : ''}" data-key="biliTotal" value="${formData.biliTotal}" placeholder="0.2-1.0" />
              <span class="cms-lab-field-range">0 - 1.0 mg/dl</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Direct :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('biliDirect', formData.biliDirect) ? 'cms-lab-out-of-range' : ''}" data-key="biliDirect" value="${formData.biliDirect}" placeholder="0.0-0.3" />
              <span class="cms-lab-field-range">up to 0.3 mg/dl</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">Indirect :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('biliIndirect', formData.biliIndirect) ? 'cms-lab-out-of-range' : ''}" data-key="biliIndirect" value="${formData.biliIndirect}" placeholder="0.1-1.0" />
              <span class="cms-lab-field-range">0.1 - 1.0 mg/dl</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">S.G.P.T. :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('sgpt', formData.sgpt) ? 'cms-lab-out-of-range' : ''}" data-key="sgpt" value="${formData.sgpt}" placeholder="10-40" />
              <span class="cms-lab-field-range">10 - 40 IU / L</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">G6PD :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('g6pd', formData.g6pd) ? 'cms-lab-out-of-range' : ''}" data-key="g6pd" list="dl-g6pd" value="${formData.g6pd}" />
              <datalist id="dl-g6pd">
                <option value="NORMAL">
                <option value="DEFICIENT">
                <option value="BORDERLINE">
              </datalist>
              <span class="cms-lab-field-range">( Normal )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">HIV Test :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('hivTest', formData.hivTest) ? 'cms-lab-out-of-range' : ''}" data-key="hivTest" list="dl-hiv" value="${formData.hivTest}" />
              <datalist id="dl-hiv">
                <option value="NON REACTIVE">
                <option value="REACTIVE">
                <option value="NEGATIVE">
                <option value="POSITIVE">
              </datalist>
              <span class="cms-lab-field-range">( Non Reactive )</span>
            </div>
          </div>

          <!-- Right: S.Widal TEST -->
          <div style="background: #f8fafc; border: 1.5px solid var(--border); border-radius: 8px; padding: 10px;">
            <div class="cms-lab-section-header" style="color: #4338ca; border-color: #c7d2fe;">
              S.Widal TEST (Typhoid Serology)
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">S.Typhi 'O' :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('widalTyphiO', formData.widalTyphiO) ? 'cms-lab-out-of-range' : ''}" data-key="widalTyphiO" list="dl-widal-titer" value="${formData.widalTyphiO}" />
              <span class="cms-lab-field-range">( 1:30 Normal )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">S.Typhi 'H' :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('widalTyphiH', formData.widalTyphiH) ? 'cms-lab-out-of-range' : ''}" data-key="widalTyphiH" list="dl-widal-titer" value="${formData.widalTyphiH}" />
              <span class="cms-lab-field-range">( 1:30 Normal )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">S.Paratyphi 'AH' :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('widalParatyphiAH', formData.widalParatyphiAH) ? 'cms-lab-out-of-range' : ''}" data-key="widalParatyphiAH" list="dl-widal-titer" value="${formData.widalParatyphiAH}" />
              <span class="cms-lab-field-range">( 1:30 Normal )</span>
            </div>

            <div class="cms-lab-field-row">
              <span class="cms-lab-field-label">S.Paratyphi 'BH' :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('widalParatyphiBH', formData.widalParatyphiBH) ? 'cms-lab-out-of-range' : ''}" data-key="widalParatyphiBH" list="dl-widal-titer" value="${formData.widalParatyphiBH}" />
              <span class="cms-lab-field-range">( 1:30 Normal )</span>
            </div>

            <datalist id="dl-widal-titer">
              <option value="Negative">
              <option value="1:20">
              <option value="1:40">
              <option value="1:80">
              <option value="1:160 (+)">
              <option value="1:320 (++)">
            </datalist>

            <div class="cms-lab-field-row" style="margin-top: 6px; border-top: 1px dashed var(--border); padding-top: 6px;">
              <span class="cms-lab-field-label" style="font-weight: 800; color: #4338ca;">Result :</span>
              <input type="text" class="cms-lab-field-input lab-val-input ${isValueOutOfRange('widalResult', formData.widalResult) ? 'cms-lab-out-of-range' : ''}" data-key="widalResult" list="dl-widal-res" value="${formData.widalResult}" style="font-weight: 800;" />
              <datalist id="dl-widal-res">
                <option value="NEGATIVE">
                <option value="POSITIVE (TYPHOID / ENTERIC FEVER)">
                <option value="BORDERLINE SIGNIFICANT">
              </datalist>
              <span class="cms-lab-field-range">( Negative )</span>
            </div>
          </div>

        </div>

        <!-- Bottom Half: 4 Large Multi-Line Writable White Text Boxes (Photo 2) -->
        <div>
          <div class="cms-lab-section-header" style="color: #0369a1;">
            Diagnostic Radiology, Sonography &amp; Special Reports (Doctor Free-Text Findings)
          </div>

          <div class="cms-lab-textareas-grid">
            
            <!-- Box 1: X - RAY -->
            <div class="cms-lab-textarea-card">
              <div class="cms-lab-textarea-title">X - RAY</div>
              <textarea class="cms-lab-textarea-input lab-txt-area" data-key="xrayNotes" placeholder="Write X-Ray findings / impression here... (e.g. Chest PA View: Normal broncho-vascular markings, no cardiomegaly)">${formData.xrayNotes}</textarea>
            </div>

            <!-- Box 2: STOOL -->
            <div class="cms-lab-textarea-card">
              <div class="cms-lab-textarea-title">STOOL</div>
              <textarea class="cms-lab-textarea-input lab-txt-area" data-key="stoolNotes" placeholder="Write Stool Examination notes... (e.g. Color: Brownish, Consistency: Semi-solid, Ova/Cysts: Nil)">${formData.stoolNotes}</textarea>
            </div>

            <!-- Box 3: SONOGRAPHY -->
            <div class="cms-lab-textarea-card">
              <div class="cms-lab-textarea-title">SONOGRAPHY (USG)</div>
              <textarea class="cms-lab-textarea-input lab-txt-area" data-key="sonographyNotes" placeholder="Write USG Abdomen / Pelvis report notes... (e.g. Liver, GB, Kidneys, Spleen and Bladder normal)">${formData.sonographyNotes}</textarea>
            </div>

            <!-- Box 4: MRI / CTSCAN -->
            <div class="cms-lab-textarea-card">
              <div class="cms-lab-textarea-title">MRI / CTSCAN</div>
              <textarea class="cms-lab-textarea-input lab-txt-area" data-key="mriCtscanNotes" placeholder="Write MRI / CT Scan report findings... (e.g. Brain / Spine CT: No focal intracranial hemorrhage or mass lesion)">${formData.mriCtscanNotes}</textarea>
            </div>

          </div>
        </div>

      </div>
    `;
  }

  function attachModalHandlers() {
    // Header & Meta inputs
    const famInp = modalOverlay.querySelector('#meta-family-name');
    if (famInp) famInp.addEventListener('input', (e) => (formData.familyName = e.target.value));
    
    const patInp = modalOverlay.querySelector('#meta-patient-name');
    if (patInp) patInp.addEventListener('input', (e) => (formData.patientName = e.target.value));

    const labInp = modalOverlay.querySelector('#meta-lab-name');
    if (labInp) labInp.addEventListener('input', (e) => (formData.labName = e.target.value));

    const drInp = modalOverlay.querySelector('#meta-dr-name');
    if (drInp) drInp.addEventListener('input', (e) => (formData.drName = e.target.value));

    const caseInp = modalOverlay.querySelector('#meta-case-no');
    if (caseInp) caseInp.addEventListener('input', (e) => (formData.caseNo = e.target.value));

    const dateInp = modalOverlay.querySelector('#meta-entry-date');
    if (dateInp) dateInp.addEventListener('input', (e) => (formData.entryDate = e.target.value));

    // Value Inputs with Real-time Out-of-Range Highlight
    modalOverlay.querySelectorAll('.lab-val-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const k = inp.getAttribute('data-key');
        const v = e.target.value;
        formData[k] = v;

        if (isValueOutOfRange(k, v)) {
          inp.classList.add('cms-lab-out-of-range');
        } else {
          inp.classList.remove('cms-lab-out-of-range');
        }
      });
    });

    // Multiline Textareas (X-Ray, Stool, USG, MRI)
    modalOverlay.querySelectorAll('.lab-txt-area').forEach((txt) => {
      txt.addEventListener('input', (e) => {
        const k = txt.getAttribute('data-key');
        formData[k] = e.target.value;
      });
    });

    // Sub-Navigation Tabs
    modalOverlay.querySelectorAll('.cms-lab-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        renderModal();
      });
    });

    // Top X button
    const closeXBtn = modalOverlay.querySelector('#btn-close-lab-modal-top');
    if (closeXBtn) {
      closeXBtn.addEventListener('click', () => {
        modalOverlay.remove();
        if (onClose) onClose();
      });
    }

    // Cancel Button
    const cancelBtn = modalOverlay.querySelector('#btn-lab-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modalOverlay.remove();
        if (onClose) onClose();
      });
    }

    // Exit Button
    const exitBtn = modalOverlay.querySelector('#btn-lab-exit');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        modalOverlay.remove();
        if (onClose) onClose();
      });
    }

    // Clear Button
    const clearBtn = modalOverlay.querySelector('#btn-lab-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all filled lab report fields?')) {
          formData = {
            ...formData,
            hemo: '', rbc: '', wbc: '', platelets: '', esr: '',
            rbs: '', fbs: '', ppbs: '', creatinin: '', vitb12: '',
            bandcell: '', neutrophils: '', lymphocytes: '', eosinophils: '', monocytes: '', basophils: '', parasites: 'NOT SEEN',
            t3: '', t4: '', tsh: '',
            biliTotal: '', biliDirect: '', biliIndirect: '', sgpt: '', g6pd: 'NORMAL', hivTest: 'NON REACTIVE',
            widalTyphiO: '1:20', widalTyphiH: '1:20', widalParatyphiAH: '1:20', widalParatyphiBH: '1:20', widalResult: 'NEGATIVE',
            xrayNotes: '', stoolNotes: '', sonographyNotes: '', mriCtscanNotes: '',
          };
          renderModal();
        }
      });
    }

    // Save Button
    const saveBtn = modalOverlay.querySelector('#btn-lab-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        // Collect investigation summary tags
        const summaryTags = [];
        if (formData.hemo || formData.wbc || formData.platelets) summaryTags.push('Complete Blood Count (CBC)');
        if (formData.fbs || formData.ppbs || formData.rbs) summaryTags.push('Blood Sugar Profile');
        if (formData.creatinin) summaryTags.push('S.Creatinine');
        if (formData.vitb12) summaryTags.push('Vitamin B12');
        if (formData.t3 || formData.t4 || formData.tsh) summaryTags.push('Thyroid Profile (T3, T4, TSH)');
        if (formData.biliTotal || formData.sgpt) summaryTags.push('Liver Function (Bilirubin & SGPT)');
        if (formData.widalResult && formData.widalResult !== 'NEGATIVE') summaryTags.push('Widal Serology');
        if (formData.xrayNotes && formData.xrayNotes.trim()) summaryTags.push('X-Ray');
        if (formData.sonographyNotes && formData.sonographyNotes.trim()) summaryTags.push('USG Sonography');
        if (formData.mriCtscanNotes && formData.mriCtscanNotes.trim()) summaryTags.push('MRI / CT Scan');
        if (formData.urinePus && formData.urinePus !== 'Nil') summaryTags.push('Urine R/M');

        formData.summaryTags = summaryTags;
        formData.updatedAt = new Date().toISOString();

        if (onSave) onSave(formData);
        showToast('✨ Lab Investigation Report attached successfully!');
        modalOverlay.remove();
      });
    }

    // Print Button (Clean Diagnostic Print Preview)
    const printBtn = modalOverlay.querySelector('#btn-lab-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        openLabReportPrintPreview(patient, family, formData);
      });
    }
  }

  renderModal();
}

/**
 * Print Preview for Lab Reports
 */
export function openLabReportPrintPreview(patient, family, data) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print lab report');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lab Report - ${patient?.name || 'Patient'} - Case #${data.caseNo || '841'}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 13px; line-height: 1.4; }
        .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 15px; }
        .clinic-name { font-size: 22px; font-weight: 800; color: #0369a1; text-transform: uppercase; }
        .clinic-sub { font-size: 12px; color: #64748b; margin-top: 3px; }
        .meta-box { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 15px; font-size: 12.5px; }
        .table-section { margin-bottom: 16px; }
        .section-title { font-size: 13px; font-weight: 800; color: #0369a1; text-transform: uppercase; border-bottom: 1.5px solid #0284c7; padding-bottom: 3px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th, td { padding: 5px 8px; text-align: left; font-size: 12px; }
        th { background: #f1f5f9; border-bottom: 1.5px solid #cbd5e1; font-weight: 700; color: #334155; }
        td { border-bottom: 1px solid #e2e8f0; }
        .out-of-range { color: #dc2626; font-weight: 800; }
        .notes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
        .notes-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; min-height: 70px; }
        .notes-title { font-weight: 800; font-size: 11.5px; color: #0369a1; text-transform: uppercase; margin-bottom: 4px; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 12px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #0284c7; color: #fff; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 6px; margin-bottom: 15px;">
        <span>Diagnostic Investigation Report Ready</span>
        <button onclick="window.print()" style="background: #fff; color: #0284c7; border: none; padding: 6px 16px; font-weight: 800; border-radius: 4px; cursor: pointer;">Print Report</button>
      </div>

      <div class="header">
        <div class="clinic-name">Dhyey Clinic &amp; Diagnostic Center</div>
        <div class="clinic-sub">Clinical Pathology, Biochemistry &amp; Diagnostic Radiology Department &middot; Surat, Gujarat</div>
        <div style="font-size: 11px; color: #0284c7; font-weight: 700; margin-top: 4px;">LABORATORY INVESTIGATION REPORT</div>
      </div>

      <div class="meta-box">
        <div>
          <div>Patient Name: <b>${patient?.name || data.patientName || 'Patient'}</b></div>
          <div>Family: <b>${family?.headName || data.familyName || '—'}</b> &middot; Age: <b>${patient?.age || '—'}</b> &middot; Blood: <b>${patient?.bloodGroup || '—'}</b></div>
          <div>Ref. Doctor: <b>${data.drName || 'Dr. Sandeep Shah'}</b></div>
        </div>
        <div style="text-align: right;">
          <div>Case No: <b style="font-family: monospace;">${data.caseNo || '—'}</b></div>
          <div>Entry No: <b style="font-family: monospace;">${data.entryNo || '—'}</b></div>
          <div>Date: <b>${fmtDate(data.entryDate || todayISO())}</b></div>
          <div>Lab: <b>${data.labName || 'Surat Diagnostic Lab'}</b></div>
        </div>
      </div>

      <!-- Hemetology Table -->
      <div class="table-section">
        <div class="section-title">Routine Hematology (CBC) &amp; Blood Profile</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40%;">Investigation Parameter</th>
              <th style="width: 30%;">Observed Result</th>
              <th style="width: 30%;">Biological Reference Range</th>
            </tr>
          </thead>
          <tbody>
            ${data.hemo ? `<tr><td>Hemoglobin (Hb)</td><td class="${isValueOutOfRange('hemo', data.hemo) ? 'out-of-range' : ''}"><b>${data.hemo} gm%</b></td><td>12.0 - 16.0 gm%</td></tr>` : ''}
            ${data.rbc ? `<tr><td>RBC Count</td><td class="${isValueOutOfRange('rbc', data.rbc) ? 'out-of-range' : ''}"><b>${data.rbc} mill/cmm</b></td><td>4.2 - 5.4 mill /c.mm</td></tr>` : ''}
            ${data.wbc ? `<tr><td>Total WBC Count</td><td class="${isValueOutOfRange('wbc', data.wbc) ? 'out-of-range' : ''}"><b>${data.wbc} /cmm</b></td><td>4,000 - 10,000 /c.mm</td></tr>` : ''}
            ${data.platelets ? `<tr><td>Platelet Count</td><td class="${isValueOutOfRange('platelets', data.platelets) ? 'out-of-range' : ''}"><b>${data.platelets} /cmm</b></td><td>1,50,000 - 4,00,000 /c.mm</td></tr>` : ''}
            ${data.esr ? `<tr><td>ESR (1st Hour)</td><td class="${isValueOutOfRange('esr', data.esr) ? 'out-of-range' : ''}"><b>${data.esr} mm/hr</b></td><td>2 - 20 mm/hr</td></tr>` : ''}
            ${data.neutrophils ? `<tr><td>Neutrophils</td><td class="${isValueOutOfRange('neutrophils', data.neutrophils) ? 'out-of-range' : ''}"><b>${data.neutrophils} %</b></td><td>55 - 70 %</td></tr>` : ''}
            ${data.lymphocytes ? `<tr><td>Lymphocytes</td><td class="${isValueOutOfRange('lymphocytes', data.lymphocytes) ? 'out-of-range' : ''}"><b>${data.lymphocytes} %</b></td><td>20 - 40 %</td></tr>` : ''}
            ${data.eosinophils ? `<tr><td>Eosinophils</td><td class="${isValueOutOfRange('eosinophils', data.eosinophils) ? 'out-of-range' : ''}"><b>${data.eosinophils} %</b></td><td>1 - 6 %</td></tr>` : ''}
            ${data.rbs ? `<tr><td>Random Blood Sugar (RBS)</td><td class="${isValueOutOfRange('rbs', data.rbs) ? 'out-of-range' : ''}"><b>${data.rbs} mg%</b></td><td>Upto 120 mg%</td></tr>` : ''}
            ${data.fbs ? `<tr><td>Fasting Blood Sugar (FBS)</td><td class="${isValueOutOfRange('fbs', data.fbs) ? 'out-of-range' : ''}"><b>${data.fbs} mg%</b></td><td>70 - 100 mg%</td></tr>` : ''}
            ${data.ppbs ? `<tr><td>Post Prandial Sugar (PPBS)</td><td class="${isValueOutOfRange('ppbs', data.ppbs) ? 'out-of-range' : ''}"><b>${data.ppbs} mg%</b></td><td>Upto 140 mg%</td></tr>` : ''}
            ${data.creatinin ? `<tr><td>Serum Creatinine</td><td class="${isValueOutOfRange('creatinin', data.creatinin) ? 'out-of-range' : ''}"><b>${data.creatinin} mg/dl</b></td><td>0.5 - 1.5 mg/dl</td></tr>` : ''}
            ${data.vitb12 ? `<tr><td>Vitamin B12</td><td class="${isValueOutOfRange('vitb12', data.vitb12) ? 'out-of-range' : ''}"><b>${data.vitb12} pg/ml</b></td><td>200 - 900 pg/ml</td></tr>` : ''}
            ${data.tsh ? `<tr><td>TSH (Thyroid Stimulating Hormone)</td><td class="${isValueOutOfRange('tsh', data.tsh) ? 'out-of-range' : ''}"><b>${data.tsh} mlu/ml</b></td><td>0.4 - 6.0 mlu/ml</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      <!-- Other Reports / Bilirubin & Widal -->
      ${
        data.biliTotal || data.sgpt || data.widalResult !== 'NEGATIVE'
          ? `
        <div class="table-section">
          <div class="section-title">Biochemistry, Hepatic &amp; Serology</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Parameter</th>
                <th style="width: 30%;">Result</th>
                <th style="width: 30%;">Reference Range</th>
              </tr>
            </thead>
            <tbody>
              ${data.biliTotal ? `<tr><td>Total Bilirubin</td><td class="${isValueOutOfRange('biliTotal', data.biliTotal) ? 'out-of-range' : ''}"><b>${data.biliTotal} mg/dl</b></td><td>0 - 1.0 mg/dl</td></tr>` : ''}
              ${data.sgpt ? `<tr><td>S.G.P.T. (ALT)</td><td class="${isValueOutOfRange('sgpt', data.sgpt) ? 'out-of-range' : ''}"><b>${data.sgpt} IU/L</b></td><td>10 - 40 IU/L</td></tr>` : ''}
              ${data.widalResult ? `<tr><td>S.Widal Serology</td><td class="${isValueOutOfRange('widalResult', data.widalResult) ? 'out-of-range' : ''}"><b>${data.widalResult}</b> (O: ${data.widalTyphiO}, H: ${data.widalTyphiH})</td><td>Negative (Titer &lt; 1:80)</td></tr>` : ''}
              ${data.hivTest ? `<tr><td>HIV 1 &amp; 2 Screening</td><td class="${isValueOutOfRange('hivTest', data.hivTest) ? 'out-of-range' : ''}"><b>${data.hivTest}</b></td><td>Non-Reactive</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      `
          : ''
      }

      <!-- Free Text Diagnostic Imaging Notes -->
      ${
        data.xrayNotes || data.sonographyNotes || data.mriCtscanNotes || data.stoolNotes
          ? `
        <div class="table-section">
          <div class="section-title">Radiology &amp; Special Diagnostic Findings</div>
          <div class="notes-grid">
            ${data.xrayNotes ? `<div class="notes-card"><div class="notes-title">X-Ray Report</div><div>${data.xrayNotes}</div></div>` : ''}
            ${data.sonographyNotes ? `<div class="notes-card"><div class="notes-title">Sonography (USG) Report</div><div>${data.sonographyNotes}</div></div>` : ''}
            ${data.mriCtscanNotes ? `<div class="notes-card"><div class="notes-title">MRI / CT Scan Report</div><div>${data.mriCtscanNotes}</div></div>` : ''}
            ${data.stoolNotes ? `<div class="notes-card"><div class="notes-title">Stool Examination</div><div>${data.stoolNotes}</div></div>` : ''}
          </div>
        </div>
      `
          : ''
      }

      <div class="footer">
        <div>
          <div>Technician: <b>Pathology Lab Staff</b></div>
          <div style="color: #64748b; font-size: 11px;">Verified on Hospital Information System</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800;">Dr. Sandeep Shah / Dr. Chirag Paghdal</div>
          <div style="font-size: 11px; color: #64748b;">Consultant Pathologist &amp; Physician</div>
        </div>
      </div>
    </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
}
