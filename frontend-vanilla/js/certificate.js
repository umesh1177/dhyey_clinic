/**
 * =========================================================
 * MEDICAL CERTIFICATE ISSUANCE & VERIFICATION CONTROLLER
 * Dynamic Templates (+ Add Template Modal), Auto Unique Cert ID,
 * Live A4 Print Preview, History Directory & Verification System
 * =========================================================
 */

import {
  fmtDate,
  todayISO,
  showToast,
  apiFetch,
  getLocalDB,
  saveLocalDB,
  getAuthSession,
  pad,
  defaultCertificateTemplates,
} from './api.js';

export async function renderCertificateView(container) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  // Dynamic clinic details resolution
  const activeClinicObj = (session?.profile?.clinics || []).find(c => c.id === clinicId) || session?.profile?.clinics?.[0];

  const clinicName = activeClinicObj?.name || session?.profile?.clinicName || 'Dhyey Clinic & Nursing Home';
  const clinicAddress = activeClinicObj?.address || 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat';
  const clinicPhone = activeClinicObj?.phone || '9876543210';
  const clinicEmail = activeClinicObj?.email || '';

  const doctorName = session?.profile?.name || session?.user?.name || 'Dr. Chirag Paghdal';
  const doctorDegree = session?.profile?.degree || 'B.H.M.S.';
  const doctorRegNo = session?.profile?.regNo || 'G-9035';

  const db = getLocalDB(clinicId);

  // Signature stored per clinic in DB
  let docSignature = db.doctorSignature || session?.profile?.signature || '';

  // Initialize DB collections if needed
  if (!db.certificateTemplates || db.certificateTemplates.length === 0) {
    db.certificateTemplates = [...defaultCertificateTemplates];
    saveLocalDB(db, clinicId);
  }
  if (!db.certificates) {
    db.certificates = [];
    saveLocalDB(db, clinicId);
  }

  // Load templates from API or fallback to local
  let templates = db.certificateTemplates || defaultCertificateTemplates;
  try {
    const tplRes = await apiFetch('/certificates/templates');
    if (tplRes && tplRes.data && tplRes.data.length > 0) {
      templates = tplRes.data;
      db.certificateTemplates = templates;
      saveLocalDB(db, clinicId);
    }
  } catch (err) {}

  // Load issued certificates from API or fallback to local
  let certificates = db.certificates || [];
  try {
    const certRes = await apiFetch('/certificates');
    if (certRes && certRes.data) {
      certificates = certRes.data;
      db.certificates = certificates;
      saveLocalDB(db, clinicId);
    }
  } catch (err) {}

  // State
  let selectedTemplateId = templates[0]?.id || 'tpl-1';
  let currentCertNo = generateNextCertId(certificates);
  let certPat = '';
  let certPatAge = '';
  let certPatGender = 'Male';
  let certDiag = 'Acute Viral Pyrexia & Physical Weakness';
  let certFromDate = todayISO();
  let certToDate = todayISO();
  let certRestDays = 1;
  let certPlace = activeClinicObj?.city || 'Ahmedabad';
  let certReason = 'Medical Rest & Treatment';
  let customBodyText = '';
  let historySearchQuery = '';
  let includeSignature = true;

  function generateNextCertId(certList = []) {
    const year = new Date().getFullYear();
    const count = (certList?.length || 0) + 1;
    return `CERT-${year}-${pad(count, 4)}`;
  }

  function getSelectedTemplate() {
    return (
      templates.find((t) => (t.id || t._id) === selectedTemplateId) ||
      templates[0] ||
      defaultCertificateTemplates[0]
    );
  }

  function compileTemplateBody(tplText) {
    const tpl = tplText || getSelectedTemplate()?.body || '';
    const patDisplay = certPat ? certPat.toUpperCase() : '_______________________________';
    const diagDisplay = certDiag || '_______________________________';
    const fromDisplay = fmtDate(certFromDate);
    const toDisplay = fmtDate(certToDate);
    const ageDisplay = certPatAge ? `${certPatAge} Yrs` : 'Adult';
    const genderDisplay = certPatGender || 'Patient';
    const restDisplay = String(certRestDays || 1);
    const todayDisplay = fmtDate(todayISO());

    return tpl
      .replace(/{PATIENT_NAME}/g, patDisplay)
      .replace(/{AGE}/g, ageDisplay)
      .replace(/{GENDER}/g, genderDisplay)
      .replace(/{DIAGNOSIS}/g, diagDisplay)
      .replace(/{FROM_DATE}/g, fromDisplay)
      .replace(/{TO_DATE}/g, toDisplay)
      .replace(/{REST_DAYS}/g, restDisplay)
      .replace(/{CERT_ID}/g, currentCertNo)
      .replace(/{TODAY_DATE}/g, todayDisplay)
      .replace(/{DOCTOR_NAME}/g, doctorName)
      .replace(/{CLINIC_NAME}/g, clinicName)
      .replace(/{PLACE}/g, certPlace);
  }

  function calculateDays(from, to) {
    if (!from || !to) return 1;
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }

  function addDaysToDate(fromDateStr, days) {
    if (!fromDateStr) return todayISO();
    const d = new Date(fromDateStr);
    d.setDate(d.getDate() + (Number(days) - 1));
    return d.toISOString().slice(0, 10);
  }

  // Build list of registered patients for autocomplete
  const allPatients = [];
  Object.values(db.families || {}).forEach((f) => {
    Object.values(f.patients || {}).forEach((p) => {
      allPatients.push({
        id: p.id || p.patId,
        name: p.name,
        age: p.age,
        gender: p.gender,
        famHead: f.headName,
        phone: p.phone || f.phone,
        lastDiagnosis: p.visits?.[p.visits.length - 1]?.diagnosis || '',
      });
    });
  });

  function renderView() {
    const curTemplate = getSelectedTemplate();
    const finalBodyText = customBodyText || compileTemplateBody(curTemplate.body);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 1400px; margin: 0 auto; width: 100%;">
        
        <!-- Top Navigation Bar & Action Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 12px 18px; box-shadow: var(--shadow-sm); flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-certificate" style="color: var(--primary); font-size: 18px;"></i>
              <h1 class="font-display" style="font-weight: 800; font-size: 17px; color: var(--text); margin: 0;">
                Medical Fitness &amp; Leave Certificates
              </h1>
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
              Issue official verifiable medical certificates with auto-generated unique ID and custom templates
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <!-- Next Certificate ID Badge -->
            <div style="background: linear-gradient(135deg, rgba(37,99,235,0.08), rgba(59,130,246,0.15)); border: 1px dashed var(--primary); border-radius: var(--radius-md); padding: 5px 12px; display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase;">
                <i class="fa-solid fa-id-card"></i> Next Cert ID:
              </span>
              <span class="font-mono" style="font-size: 13px; font-weight: 800; color: var(--text);">${currentCertNo}</span>
            </div>

            <!-- Doctor Digital Signature Button -->
            <button type="button" id="btn-open-signature-modal" class="cms-btn cms-btn-ghost cms-btn-sm" style="font-size: 12px; padding: 7px 14px; border: 1px solid var(--border); background: ${docSignature ? 'rgba(16,185,129,0.08)' : 'transparent'}; color: ${docSignature ? '#059669' : 'var(--text)'};" title="Add or update Doctor Digital Signature">
              <i class="fa-solid fa-signature" style="color: ${docSignature ? '#059669' : 'var(--primary)'};"></i>
              <span>${docSignature ? 'Digital Signature Active' : 'Add Digital Signature'}</span>
            </button>

            <!-- Add Template Button -->
            <button type="button" id="btn-open-add-template" class="cms-btn cms-btn-primary cms-btn-sm" style="font-size: 12px; padding: 7px 14px;">
              <i class="fa-solid fa-plus"></i>
              <span>Add Template</span>
            </button>

            <!-- Verify Certificate Button -->
            <button type="button" id="btn-open-verify-modal" class="cms-btn cms-btn-ghost cms-btn-sm" style="font-size: 12px; padding: 7px 14px; border: 1px solid var(--border);" title="Verify Authenticity of Certificate ID">
              <i class="fa-solid fa-shield-check" style="color: var(--primary);"></i>
              <span>Verify Certificate</span>
            </button>
          </div>
        </div>

        <!-- Main Workspace Grid: Left Form Panel & Right Live A4 Preview -->
        <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 20px; align-items: start;">
          
          <!-- LEFT: Certificate Configuration & Inputs Card -->
          <div class="cms-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box;">
            
            <div class="cms-card-header" style="margin-bottom: 0; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
              <div class="cms-card-title">
                <i class="fa-solid fa-file-signature" style="color: var(--primary); margin-right: 6px;"></i> Issue Medical Certificate
              </div>
              <span class="cms-pill cms-badge-paid font-mono" style="font-size: 11px;">Unique ID: ${currentCertNo}</span>
            </div>

            <!-- Active Clinic Info Badge -->
            <div style="background: rgba(20,107,92,0.05); border: 1px solid rgba(20,107,92,0.2); border-radius: var(--radius-md); padding: 8px 12px; font-size: 11.5px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: var(--primary);"><i class="fa-solid fa-hospital"></i> ${clinicName}</strong>
                <span style="color: var(--text-muted); margin-left: 6px;">${clinicAddress.slice(0, 45)}... &bull; Ph: ${clinicPhone}</span>
              </div>
              <span class="cms-pill" style="font-size: 10px; background: rgba(20,107,92,0.12); color: var(--primary); font-weight: 700;">Dynamic Clinic Header</span>
            </div>

            <!-- Template Selector Row -->
            <div class="cms-form-group" style="margin-bottom: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 0;">
                  Select Certificate Template *
                </label>
                <button type="button" id="btn-quick-add-template" style="background: none; border: none; color: var(--primary); font-size: 11.5px; font-weight: 700; cursor: pointer; padding: 0;">
                  <i class="fa-solid fa-plus-circle"></i> New Template
                </button>
              </div>
              <select id="cert-template-select" class="cms-select cms-input" style="padding: 7px 10px; font-weight: 600;">
                ${templates
                  .map(
                    (t) => `
                  <option value="${t.id || t._id}" ${(t.id || t._id) === selectedTemplateId ? 'selected' : ''}>
                    ${t.templateName} (${t.category || 'General'})
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <!-- Patient Quick Search & Full Name -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px;">
              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">
                  Quick Select Registered Patient
                </label>
                <input type="text" id="cert-patient-lookup" class="cms-input" list="dl-cert-patients" placeholder="Type name or ID to auto-fill..." style="padding: 7px 10px;" />
                <datalist id="dl-cert-patients">
                  ${allPatients
                    .map((p) => `<option value="${p.name}">ID: ${p.id} &bull; ${p.age}Y/${p.gender} &bull; Head: ${p.famHead}</option>`)
                    .join('')}
                </datalist>
              </div>

              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Patient Full Name *</label>
                <input type="text" id="cert-patient-name" class="cms-input" required placeholder="(SURNAME NAME FATHER)" value="${certPat}" style="padding: 7px 10px; font-weight: 700;" />
              </div>
            </div>

            <!-- Age, Gender, and Medical Diagnosis -->
            <div style="display: grid; grid-template-columns: 0.8fr 1fr 2fr; gap: 10px;">
              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Age</label>
                <input type="text" id="cert-patient-age" class="cms-input" placeholder="e.g. 42" value="${certPatAge}" style="padding: 7px 10px;" />
              </div>

              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Gender</label>
                <select id="cert-patient-gender" class="cms-select cms-input" style="padding: 7px 10px;">
                  <option value="Male" ${certPatGender === 'Male' ? 'selected' : ''}>Male</option>
                  <option value="Female" ${certPatGender === 'Female' ? 'selected' : ''}>Female</option>
                  <option value="Other" ${certPatGender === 'Other' ? 'selected' : ''}>Other</option>
                </select>
              </div>

              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Medical Diagnosis *</label>
                <input type="text" id="cert-diagnosis" class="cms-input" required placeholder="e.g. Acute Gastroenteritis, Viral Pyrexia" value="${certDiag}" style="padding: 7px 10px;" />
              </div>
            </div>

            <!-- Date Range & Rest Days Calculation -->
            <div style="display: grid; grid-template-columns: 1.1fr 1.1fr 0.9fr 1fr; gap: 10px; background: var(--surface-alt); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border);">
              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 11.5px; margin-bottom: 2px;">From Date *</label>
                <input type="date" id="cert-from-date" class="cms-input" value="${certFromDate}" style="padding: 6px 8px; font-size: 12.5px;" />
              </div>

              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 11.5px; margin-bottom: 2px;">To Date *</label>
                <input type="date" id="cert-to-date" class="cms-input" value="${certToDate}" style="padding: 6px 8px; font-size: 12.5px;" />
              </div>

              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 11.5px; margin-bottom: 2px;">Rest Days</label>
                <input type="number" id="cert-rest-days" class="cms-input" min="1" max="180" value="${certRestDays}" style="padding: 6px 8px; font-size: 12.5px; font-weight: 700;" />
              </div>

              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 11.5px; margin-bottom: 2px;">Issue Place</label>
                <input type="text" id="cert-place" class="cms-input" value="${certPlace}" style="padding: 6px 8px; font-size: 12.5px;" />
              </div>
            </div>

            <!-- Dynamic Body Text Editor with Placeholder Chips -->
            <div class="cms-form-group" style="margin-bottom: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 0;">
                  Certificate Body Text (Live Editable &bull; Auto-Filled)
                </label>
                <button type="button" id="btn-reset-template-body" style="background: none; border: none; color: var(--text-muted); font-size: 11px; cursor: pointer;">
                  <i class="fa-solid fa-arrows-rotate"></i> Reset to Template Default
                </button>
              </div>

              <!-- Quick Placeholder Chips -->
              <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 6px;">
                <span class="cms-pill cms-tag-chip" data-tag="{PATIENT_NAME}" style="font-size: 10px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {PATIENT_NAME}</span>
                <span class="cms-pill cms-tag-chip" data-tag="{DIAGNOSIS}" style="font-size: 10px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {DIAGNOSIS}</span>
                <span class="cms-pill cms-tag-chip" data-tag="{FROM_DATE}" style="font-size: 10px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {FROM_DATE}</span>
                <span class="cms-pill cms-tag-chip" data-tag="{TO_DATE}" style="font-size: 10px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {TO_DATE}</span>
                <span class="cms-pill cms-tag-chip" data-tag="{REST_DAYS}" style="font-size: 10px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {REST_DAYS}</span>
                <span class="cms-pill cms-tag-chip" data-tag="{CERT_ID}" style="font-size: 10px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {CERT_ID}</span>
                <span class="cms-pill cms-tag-chip" data-tag="{CLINIC_NAME}" style="font-size: 10px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {CLINIC_NAME}</span>
              </div>

              <textarea id="cert-custom-body" class="cms-input" rows="4" style="font-size: 13px; line-height: 1.5; padding: 8px 10px; resize: vertical;">${customBodyText || curTemplate.body}</textarea>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 10px; margin-top: 4px; padding-top: 4px;">
              <button type="button" id="btn-clear-cert-form" class="cms-btn cms-btn-ghost" style="padding: 9px 16px; border: 1px solid var(--border); font-size: 13px;">
                <i class="fa-solid fa-rotate-left"></i> Clear
              </button>
              <button type="button" id="btn-issue-print-cert" class="cms-btn cms-btn-primary" style="flex: 1; padding: 10px 18px; font-size: 13.5px;">
                <i class="fa-solid fa-print"></i>
                <span>Issue &amp; Print Medical Certificate</span>
                <span class="cms-kbd">Enter</span>
              </button>
            </div>
          </div>

          <!-- RIGHT: Live A4 Medical Certificate Print Preview -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--text);">
                <i class="fa-solid fa-eye" style="color: var(--primary);"></i> Live Certificate Preview (A4 Formatted)
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <button type="button" id="btn-preview-signature-toggle" class="cms-btn cms-btn-ghost cms-btn-sm" style="font-size: 11px; padding: 4px 8px; border: 1px dashed var(--border);" title="Add or edit doctor digital signature">
                  <i class="fa-solid fa-signature" style="color: var(--primary);"></i>
                  <span>${docSignature ? 'Edit Digital Signature' : '+ Add Digital Signature'}</span>
                </button>
                <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(16,185,129,0.1); color: #059669; font-weight: 700;">
                  <i class="fa-solid fa-shield-check"></i> Verifiable
                </span>
              </div>
            </div>

            <div style="background: var(--surface-alt); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border); display: flex; justify-content: center; overflow-x: auto;">
              
              <!-- Printable A4 Certificate Canvas -->
              <div id="cms-cert-print-area" style="background: #FFFFFF; color: #222222; width: 100%; max-width: 580px; padding: 32px 36px; border: 2.5px solid #146B5C; border-radius: 10px; box-shadow: var(--shadow-md); font-family: 'Inter', Arial, sans-serif; box-sizing: border-box; position: relative;">
                
                <!-- Clinic Header (Dynamic) -->
                <div style="text-align: center; border-bottom: 2px solid #146B5C; padding-bottom: 12px; margin-bottom: 18px;">
                  <div class="font-display" id="preview-clinic-name" style="font-size: 22px; font-weight: 900; color: #146B5C; letter-spacing: -0.3px;">
                    ${clinicName}
                  </div>
                  <div id="preview-clinic-details" style="font-size: 11px; color: #555555; font-weight: 600; margin-top: 3px;">
                    ${clinicAddress} &bull; Ph: ${clinicPhone}${clinicEmail ? ' &bull; ' + clinicEmail : ''}
                  </div>
                  <div id="preview-cert-title" style="font-size: 13.5px; font-weight: 800; color: #111111; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.8px;">
                    ${curTemplate.title || 'MEDICAL FITNESS / LEAVE CERTIFICATE'}
                  </div>
                </div>

                <!-- Unique Certificate ID & Security Bar -->
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(20,107,92,0.06); border: 1px dashed #146B5C; border-radius: 6px; padding: 6px 12px; margin-bottom: 22px; font-size: 11.5px;">
                  <div>
                    <span style="font-weight: 800; color: #146B5C;">CERTIFICATE ID:</span>
                    <b class="font-mono" style="font-size: 12.5px; color: #111111; margin-left: 4px;" id="preview-cert-no">${currentCertNo}</b>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="font-mono" style="font-size: 10px; background: #FFFFFF; padding: 2px 6px; border: 1px solid #146B5C; border-radius: 4px; color: #146B5C; font-weight: 700;">
                      <i class="fa-solid fa-qrcode"></i> VERIFIABLE
                    </span>
                  </div>
                </div>

                <!-- Formal Certification Body Text -->
                <div id="preview-cert-body" style="font-size: 13.5px; line-height: 2.1; text-align: justify; margin: 24px 0; color: #1e293b; min-height: 120px;">
                  ${compileTemplateBody(customBodyText || curTemplate.body)}
                </div>

                <!-- Sign & Footer Metadata -->
                <div style="margin-top: 40px; padding-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; border-top: 1px dotted #ccc;">
                  <div>
                    <div><b>Date of Issue:</b> <span id="preview-cert-date">${fmtDate(todayISO())}</span></div>
                    <div><b>Place of Issue:</b> <span id="preview-cert-place">${certPlace}</span></div>
                    <div style="font-size: 10px; color: #666; margin-top: 4px;">Security Verifiable Document</div>
                  </div>

                  <div style="text-align: right; min-width: 170px;">
                    <!-- Doctor Digital Signature Element -->
                    <div id="preview-cert-signature-container" style="min-height: 48px; display: flex; justify-content: flex-end; align-items: flex-end; margin-bottom: 6px;">
                      ${
                        docSignature
                          ? `<img src="${docSignature}" alt="Doctor Digital Signature" style="max-height: 48px; max-width: 140px; object-fit: contain;" />`
                          : `<div style="font-family: cursive; color: #146B5C; font-size: 15px; opacity: 0.85; padding-bottom: 4px;">${doctorName}</div>`
                      }
                    </div>
                    <div style="font-weight: 800; color: #146B5C; font-size: 12.5px;">${doctorName}</div>
                    <div style="font-size: 10.5px; color: #555555;">${doctorDegree} (Reg. No. ${doctorRegNo})</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM: Issued Certificates Directory & Verification Registry -->
        <div class="cms-card" style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px;">
          <div class="cms-card-header" style="margin-bottom: 0; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-folder-open" style="color: var(--primary);"></i>
              <div class="cms-card-title">Issued Medical Certificates Registry</div>
              <span class="cms-pill cms-badge-paid font-mono" id="cert-count-badge" style="font-size: 11px;">
                ${certificates.length} Issued
              </span>
            </div>

            <!-- Search History Input -->
            <div style="position: relative; width: 300px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 12px;"></i>
              <input type="text" id="cert-history-search" class="cms-input cms-input-sm" style="padding-left: 30px;" placeholder="Search by Certificate ID or Patient Name..." value="${historySearchQuery}" />
            </div>
          </div>

          <!-- Table Container -->
          <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-md);">
            <table class="cms-table" style="margin: 0; width: 100%; font-size: 12.5px;">
              <thead>
                <tr style="background: var(--surface-alt);">
                  <th style="padding: 9px 12px;">Certificate ID</th>
                  <th style="padding: 9px 12px;">Patient Name</th>
                  <th style="padding: 9px 12px;">Template / Type</th>
                  <th style="padding: 9px 12px;">Medical Diagnosis</th>
                  <th style="padding: 9px 12px;">Validity Period</th>
                  <th style="padding: 9px 12px;">Issue Date</th>
                  <th style="padding: 9px 12px;">Status</th>
                  <th style="padding: 9px 12px; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="cert-history-tbody">
                ${renderHistoryTableRows(certificates, historySearchQuery)}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Add Template Modal Mount -->
      <div id="modal-add-template-container"></div>

      <!-- Verify Certificate Modal Mount -->
      <div id="modal-verify-cert-container"></div>

      <!-- Doctor Digital Signature Modal Mount -->
      <div id="modal-signature-container"></div>
    `;

    wireEventHandlers();
  }

  function renderHistoryTableRows(certList, query = '') {
    const q = query.trim().toLowerCase();
    const filtered = certList.filter((c) => {
      if (!q) return true;
      return (
        (c.certNo || '').toLowerCase().includes(q) ||
        (c.patientName || '').toLowerCase().includes(q) ||
        (c.diagnosis || '').toLowerCase().includes(q) ||
        (c.templateName || '').toLowerCase().includes(q)
      );
    });

    if (filtered.length === 0) {
      return `
        <tr>
          <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
            ${query ? 'No matching issued certificates found.' : 'No certificates issued yet. Create and print a certificate above.'}
          </td>
        </tr>
      `;
    }

    return filtered
      .map(
        (c) => `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 8px 12px;">
          <span class="cms-pill cms-badge-paid font-mono" style="font-weight: 800; font-size: 11px;">${c.certNo}</span>
        </td>
        <td style="padding: 8px 12px; font-weight: 700; color: var(--text);">
          ${c.patientName}
          ${c.patientAge ? `<span style="font-size: 11px; color: var(--text-muted); font-weight: normal; margin-left: 4px;">(${c.patientAge}Y/${c.patientGender || 'M'})</span>` : ''}
        </td>
        <td style="padding: 8px 12px; color: var(--text-muted); font-size: 12px;">
          ${c.templateName || 'Medical Fitness / Leave'}
        </td>
        <td style="padding: 8px 12px; font-weight: 600;">
          ${c.diagnosis}
        </td>
        <td style="padding: 8px 12px; font-size: 12px;">
          ${fmtDate(c.fromDate)} &rarr; ${fmtDate(c.toDate)} ${c.restDays ? `(${c.restDays}d)` : ''}
        </td>
        <td style="padding: 8px 12px; font-size: 12px; color: var(--text-muted);">
          ${fmtDate(c.issuedDate || c.createdAt)}
        </td>
        <td style="padding: 8px 12px;">
          <span class="cms-pill" style="font-size: 10.5px; background: rgba(16,185,129,0.12); color: #059669; font-weight: 700;">
            <i class="fa-solid fa-circle-check"></i> ${c.status || 'Issued'}
          </span>
        </td>
        <td style="padding: 8px 12px; text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button type="button" class="cms-btn cms-btn-sm cms-btn-ghost btn-reprint-cert" data-certno="${c.certNo}" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid var(--border);" title="Load &amp; Re-Print Certificate">
              <i class="fa-solid fa-print" style="color: var(--primary);"></i> Print
            </button>
            <button type="button" class="cms-btn cms-btn-sm cms-btn-ghost btn-verify-row" data-certno="${c.certNo}" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid var(--border);" title="Verify Certificate Record">
              <i class="fa-solid fa-shield-check" style="color: #059669;"></i> Verify
            </button>
            <button type="button" class="cms-btn-danger btn-del-cert" data-certno="${c.certNo}" data-id="${c.id || c._id}" style="padding: 3px 7px; font-size: 11px;" title="Delete Record">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  }

  function wireEventHandlers() {
    // DOM References
    const tplSelect = container.querySelector('#cert-template-select');
    const patLookup = container.querySelector('#cert-patient-lookup');
    const patNameInput = container.querySelector('#cert-patient-name');
    const patAgeInput = container.querySelector('#cert-patient-age');
    const patGenderInput = container.querySelector('#cert-patient-gender');
    const diagInput = container.querySelector('#cert-diagnosis');
    const fromDateInput = container.querySelector('#cert-from-date');
    const toDateInput = container.querySelector('#cert-to-date');
    const restDaysInput = container.querySelector('#cert-rest-days');
    const placeInput = container.querySelector('#cert-place');
    const customBodyInput = container.querySelector('#cert-custom-body');
    const btnResetBody = container.querySelector('#btn-reset-template-body');
    const btnClearForm = container.querySelector('#btn-clear-cert-form');
    const btnIssuePrint = container.querySelector('#btn-issue-print-cert');
    const historySearchInput = container.querySelector('#cert-history-search');

    // Live Preview update helper
    function updateLivePreview() {
      const curTpl = getSelectedTemplate();
      const compiled = compileTemplateBody(customBodyText || curTpl.body);

      const previewTitleEl = container.querySelector('#preview-cert-title');
      const previewBodyEl = container.querySelector('#preview-cert-body');
      const previewCertNoEl = container.querySelector('#preview-cert-no');
      const previewDateEl = container.querySelector('#preview-cert-date');
      const previewPlaceEl = container.querySelector('#preview-cert-place');

      if (previewTitleEl) previewTitleEl.textContent = curTpl.title || 'MEDICAL CERTIFICATE';
      if (previewBodyEl) previewBodyEl.textContent = compiled;
      if (previewCertNoEl) previewCertNoEl.textContent = currentCertNo;
      if (previewDateEl) previewDateEl.textContent = fmtDate(todayISO());
      if (previewPlaceEl) previewPlaceEl.textContent = certPlace || 'Surat';
    }

    // Template change
    tplSelect.addEventListener('change', (e) => {
      selectedTemplateId = e.target.value;
      const tpl = getSelectedTemplate();
      customBodyText = '';
      customBodyInput.value = tpl.body;
      updateLivePreview();
    });

    // Patient lookup change
    patLookup.addEventListener('change', (e) => {
      const selectedName = e.target.value.trim();
      const match = allPatients.find((p) => p.name.toLowerCase() === selectedName.toLowerCase());
      if (match) {
        certPat = match.name;
        certPatAge = match.age || '';
        certPatGender = match.gender || 'Male';
        if (match.lastDiagnosis) certDiag = match.lastDiagnosis;

        patNameInput.value = certPat;
        patAgeInput.value = certPatAge;
        patGenderInput.value = certPatGender;
        diagInput.value = certDiag;
        updateLivePreview();
        showToast(`Auto-filled details for patient: ${match.name}`);
      }
    });

    // Patient Name input
    patNameInput.addEventListener('input', (e) => {
      certPat = e.target.value.toUpperCase();
      patNameInput.value = certPat;
      updateLivePreview();
    });

    // Age & Gender
    patAgeInput.addEventListener('input', (e) => {
      certPatAge = e.target.value;
      updateLivePreview();
    });
    patGenderInput.addEventListener('change', (e) => {
      certPatGender = e.target.value;
      updateLivePreview();
    });

    // Diagnosis
    diagInput.addEventListener('input', (e) => {
      certDiag = e.target.value;
      updateLivePreview();
    });

    // Dates & Rest calculation
    fromDateInput.addEventListener('change', (e) => {
      certFromDate = e.target.value;
      certRestDays = calculateDays(certFromDate, certToDate);
      restDaysInput.value = certRestDays;
      updateLivePreview();
    });

    toDateInput.addEventListener('change', (e) => {
      certToDate = e.target.value;
      certRestDays = calculateDays(certFromDate, certToDate);
      restDaysInput.value = certRestDays;
      updateLivePreview();
    });

    restDaysInput.addEventListener('input', (e) => {
      const days = parseInt(e.target.value, 10);
      if (days && days > 0) {
        certRestDays = days;
        certToDate = addDaysToDate(certFromDate, days);
        toDateInput.value = certToDate;
        updateLivePreview();
      }
    });

    placeInput.addEventListener('input', (e) => {
      certPlace = e.target.value;
      updateLivePreview();
    });

    // Custom body editor
    customBodyInput.addEventListener('input', (e) => {
      customBodyText = e.target.value;
      updateLivePreview();
    });

    // Placeholder chips insertion
    container.querySelectorAll('.cms-tag-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const tag = chip.getAttribute('data-tag');
        const start = customBodyInput.selectionStart;
        const end = customBodyInput.selectionEnd;
        const text = customBodyInput.value;
        customBodyInput.value = text.substring(0, start) + tag + text.substring(end);
        customBodyText = customBodyInput.value;
        customBodyInput.focus();
        customBodyInput.selectionStart = customBodyInput.selectionEnd = start + tag.length;
        updateLivePreview();
      });
    });

    // Reset body to template default
    btnResetBody.addEventListener('click', () => {
      const tpl = getSelectedTemplate();
      customBodyText = '';
      customBodyInput.value = tpl.body;
      updateLivePreview();
      showToast('Reset body text to template default');
    });

    // Clear form
    btnClearForm.addEventListener('click', () => {
      certPat = '';
      certPatAge = '';
      certPatGender = 'Male';
      certDiag = '';
      certFromDate = todayISO();
      certToDate = todayISO();
      certRestDays = 1;
      customBodyText = '';

      patNameInput.value = '';
      patLookup.value = '';
      patAgeInput.value = '';
      diagInput.value = '';
      fromDateInput.value = todayISO();
      toDateInput.value = todayISO();
      restDaysInput.value = 1;
      customBodyInput.value = getSelectedTemplate()?.body || '';

      updateLivePreview();
      showToast('Form cleared');
    });

    // Submit / Issue & Print Certificate
    btnIssuePrint.addEventListener('click', async () => {
      if (!certPat.trim()) {
        showToast('Please enter patient full name', 'error');
        patNameInput.focus();
        return;
      }
      if (!certDiag.trim()) {
        showToast('Please enter medical diagnosis', 'error');
        diagInput.focus();
        return;
      }

      const curTpl = getSelectedTemplate();
      const compiledBody = compileTemplateBody(customBodyText || curTpl.body);

      const certRecord = {
        certNo: currentCertNo,
        patientName: certPat.trim().toUpperCase(),
        patientAge: certPatAge.trim(),
        patientGender: certPatGender,
        diagnosis: certDiag.trim(),
        fromDate: certFromDate,
        toDate: certToDate,
        restDays: certRestDays,
        templateId: selectedTemplateId,
        templateName: curTpl.templateName,
        title: curTpl.title || 'MEDICAL CERTIFICATE',
        customBody: compiledBody,
        reason: certReason,
        place: certPlace || 'Surat',
        doctorName,
        issuedDate: todayISO(),
        status: 'Issued',
      };

      try {
        await apiFetch('/certificates', {
          method: 'POST',
          body: certRecord,
        });
      } catch (e) {}

      // Save locally
      if (!db.certificates) db.certificates = [];
      db.certificates.unshift(certRecord);
      saveLocalDB(db, clinicId);
      certificates = db.certificates;

      showToast(`✅ Certificate ${currentCertNo} issued successfully!`);

      // Trigger print
      window.print();

      // Advance to next Certificate ID
      currentCertNo = generateNextCertId(certificates);
      renderView();
    });

    // Search History Table
    historySearchInput.addEventListener('input', (e) => {
      historySearchQuery = e.target.value;
      const tbody = container.querySelector('#cert-history-tbody');
      if (tbody) {
        tbody.innerHTML = renderHistoryTableRows(certificates, historySearchQuery);
        wireHistoryRowActions();
      }
    });

    // Wire Modal Triggers
    const btnOpenAddTpl = container.querySelector('#btn-open-add-template');
    const btnQuickAddTpl = container.querySelector('#btn-quick-add-template');
    if (btnOpenAddTpl) btnOpenAddTpl.addEventListener('click', openAddTemplateModal);
    if (btnQuickAddTpl) btnQuickAddTpl.addEventListener('click', openAddTemplateModal);

    const btnOpenVerify = container.querySelector('#btn-open-verify-modal');
    if (btnOpenVerify) btnOpenVerify.addEventListener('click', () => openVerifyModal());

    const btnOpenSig = container.querySelector('#btn-open-signature-modal');
    const btnPreviewSig = container.querySelector('#btn-preview-signature-toggle');
    if (btnOpenSig) btnOpenSig.addEventListener('click', () => openSignatureModal());
    if (btnPreviewSig) btnPreviewSig.addEventListener('click', () => openSignatureModal());

    wireHistoryRowActions();
  }

  function wireHistoryRowActions() {
    // Re-print Certificate Row
    container.querySelectorAll('.btn-reprint-cert').forEach((btn) => {
      btn.addEventListener('click', () => {
        const certNo = btn.getAttribute('data-certno');
        const cert = certificates.find((c) => c.certNo === certNo);
        if (!cert) return;

        // Populate fields with this certificate
        currentCertNo = cert.certNo;
        certPat = cert.patientName;
        certPatAge = cert.patientAge || '';
        certPatGender = cert.patientGender || 'Male';
        certDiag = cert.diagnosis;
        certFromDate = cert.fromDate;
        certToDate = cert.toDate;
        certRestDays = cert.restDays || calculateDays(cert.fromDate, cert.toDate);
        certPlace = cert.place || 'Surat';
        customBodyText = cert.customBody || '';

        renderView();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Loaded Certificate ${certNo} into preview`);
      });
    });

    // Verify Row
    container.querySelectorAll('.btn-verify-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const certNo = btn.getAttribute('data-certno');
        openVerifyModal(certNo);
      });
    });

    // Delete Row
    container.querySelectorAll('.btn-del-cert').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const certNo = btn.getAttribute('data-certno');
        const id = btn.getAttribute('data-id');
        if (confirm(`Are you sure you want to delete Certificate record ${certNo}?`)) {
          try {
            await apiFetch(`/certificates/${id || certNo}`, { method: 'DELETE' });
          } catch (e) {}

          db.certificates = (db.certificates || []).filter((c) => c.certNo !== certNo && c.id !== id);
          saveLocalDB(db, clinicId);
          certificates = db.certificates;
          renderView();
          showToast(`Deleted Certificate ${certNo}`, 'error');
        }
      });
    });
  }

  // =========================================================
  // MODAL: ADD CERTIFICATE TEMPLATE
  // =========================================================
  function openAddTemplateModal() {
    const modalRoot = container.querySelector('#modal-add-template-container');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="cms-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 9999; backdrop-filter: blur(2px);">
        <div class="cms-modal cms-card" style="width: 100%; max-width: 620px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); border: 1px solid var(--border); padding: 22px; display: flex; flex-direction: column; gap: 14px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-file-circle-plus" style="color: var(--primary); font-size: 18px;"></i>
              <h2 class="font-display" style="font-weight: 800; font-size: 16px; margin: 0; color: var(--text);">
                Add New Certificate Template
              </h2>
            </div>
            <button type="button" id="btn-close-tpl-modal" class="cms-btn cms-btn-ghost" style="padding: 4px 8px; border: none; font-size: 16px;">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form id="form-add-cert-template" style="display: flex; flex-direction: column; gap: 12px;">
            
            <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px;">
              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Template Name *</label>
                <input type="text" id="tpl-name-input" class="cms-input" required placeholder="e.g. School Absence Certificate" autofocus style="padding: 7px 10px;" />
              </div>

              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Category</label>
                <select id="tpl-category-input" class="cms-select cms-input" style="padding: 7px 10px;">
                  <option value="Fitness">Fitness / Recovery</option>
                  <option value="Leave" selected>Sickness / Leave</option>
                  <option value="Exemption">Work / Study Exemption</option>
                  <option value="General">General Medical</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>

            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Certificate Heading / Title *</label>
              <input type="text" id="tpl-title-input" class="cms-input" required placeholder="e.g. MEDICAL CERTIFICATE FOR SCHOOL ABSENCE" value="MEDICAL CERTIFICATE" style="padding: 7px 10px; font-weight: 700;" />
            </div>

            <!-- Placeholder Tag Helper Chips -->
            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">
                Insert Dynamic Placeholder Tags (Click to add):
              </label>
              <div style="display: flex; gap: 5px; flex-wrap: wrap;" id="modal-tpl-chips-container">
                <span class="cms-pill modal-tag-chip" data-tag="{PATIENT_NAME}" style="font-size: 10.5px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {PATIENT_NAME}</span>
                <span class="cms-pill modal-tag-chip" data-tag="{AGE}" style="font-size: 10.5px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {AGE}</span>
                <span class="cms-pill modal-tag-chip" data-tag="{GENDER}" style="font-size: 10.5px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {GENDER}</span>
                <span class="cms-pill modal-tag-chip" data-tag="{DIAGNOSIS}" style="font-size: 10.5px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {DIAGNOSIS}</span>
                <span class="cms-pill modal-tag-chip" data-tag="{FROM_DATE}" style="font-size: 10.5px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {FROM_DATE}</span>
                <span class="cms-pill modal-tag-chip" data-tag="{TO_DATE}" style="font-size: 10.5px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {TO_DATE}</span>
                <span class="cms-pill modal-tag-chip" data-tag="{REST_DAYS}" style="font-size: 10.5px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {REST_DAYS}</span>
                <span class="cms-pill modal-tag-chip" data-tag="{CERT_ID}" style="font-size: 10.5px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {CERT_ID}</span>
                <span class="cms-pill modal-tag-chip" data-tag="{TODAY_DATE}" style="font-size: 10.5px; cursor: pointer; background: rgba(37,99,235,0.08); color: var(--primary);">+ {TODAY_DATE}</span>
              </div>
            </div>

            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Template Body Text *</label>
              <textarea id="tpl-body-input" class="cms-input" required rows="5" placeholder="This is to certify that {PATIENT_NAME} has been treated for {DIAGNOSIS} from {FROM_DATE} to {TO_DATE}..." style="font-size: 13px; line-height: 1.5; padding: 8px 10px;"></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border);">
              <button type="button" id="btn-cancel-tpl-modal" class="cms-btn cms-btn-ghost" style="padding: 8px 16px; border: 1px solid var(--border);">Cancel</button>
              <button type="submit" class="cms-btn cms-btn-primary" style="padding: 8px 20px;">
                <i class="fa-solid fa-floppy-disk"></i> Save Template
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeBtn = modalRoot.querySelector('#btn-close-tpl-modal');
    const cancelBtn = modalRoot.querySelector('#btn-cancel-tpl-modal');
    const form = modalRoot.querySelector('#form-add-cert-template');
    const bodyInput = modalRoot.querySelector('#tpl-body-input');
    const titleInput = modalRoot.querySelector('#tpl-title-input');

    const closeModal = () => (modalRoot.innerHTML = '');
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Placeholder chips in modal
    modalRoot.querySelectorAll('.modal-tag-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const tag = chip.getAttribute('data-tag');
        const start = bodyInput.selectionStart;
        const end = bodyInput.selectionEnd;
        const text = bodyInput.value;
        bodyInput.value = text.substring(0, start) + tag + text.substring(end);
        bodyInput.focus();
        bodyInput.selectionStart = bodyInput.selectionEnd = start + tag.length;
      });
    });

    titleInput.addEventListener('input', (e) => {
      titleInput.value = e.target.value.toUpperCase();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tplName = modalRoot.querySelector('#tpl-name-input').value.trim();
      const tplCat = modalRoot.querySelector('#tpl-category-input').value;
      const tplTitle = titleInput.value.trim().toUpperCase() || 'MEDICAL CERTIFICATE';
      const tplBody = bodyInput.value.trim();

      if (!tplName || !tplBody) {
        showToast('Please fill template name and body', 'error');
        return;
      }

      const newTemplate = {
        id: 'tpl-' + Math.random().toString(36).slice(2, 9),
        templateName: tplName,
        title: tplTitle,
        body: tplBody,
        category: tplCat,
        isDefault: false,
        createdAt: todayISO(),
      };

      try {
        await apiFetch('/certificates/templates', {
          method: 'POST',
          body: newTemplate,
        });
      } catch (err) {}

      if (!db.certificateTemplates) db.certificateTemplates = [...defaultCertificateTemplates];
      db.certificateTemplates.push(newTemplate);
      saveLocalDB(db, clinicId);
      templates = db.certificateTemplates;

      selectedTemplateId = newTemplate.id;
      customBodyText = '';

      closeModal();
      showToast(`✨ Template "${tplName}" created and selected!`);
      renderView();
    });
  }

  // =========================================================
  // MODAL: VERIFY MEDICAL CERTIFICATE
  // =========================================================
  function openVerifyModal(presetCertNo = '') {
    const modalRoot = container.querySelector('#modal-verify-cert-container');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="cms-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 9999; backdrop-filter: blur(2px);">
        <div class="cms-modal cms-card" style="width: 100%; max-width: 540px; box-shadow: var(--shadow-xl); border: 1px solid var(--border); padding: 22px; display: flex; flex-direction: column; gap: 14px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-shield-check" style="color: #059669; font-size: 20px;"></i>
              <h2 class="font-display" style="font-weight: 800; font-size: 16px; margin: 0; color: var(--text);">
                Verify Medical Certificate
              </h2>
            </div>
            <button type="button" id="btn-close-verify-modal" class="cms-btn cms-btn-ghost" style="padding: 4px 8px; border: none; font-size: 16px;">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div style="display: flex; gap: 8px;">
            <input type="text" id="verify-cert-input" class="cms-input font-mono" placeholder="Enter Certificate ID (e.g. CERT-2026-0001)" value="${presetCertNo}" style="font-weight: 700; padding: 9px 12px; font-size: 14px;" />
            <button type="button" id="btn-do-verify" class="cms-btn cms-btn-primary" style="padding: 9px 18px;">
              <i class="fa-solid fa-magnifying-glass"></i> Verify
            </button>
          </div>

          <!-- Result Box -->
          <div id="verify-result-box" style="margin-top: 4px;"></div>
        </div>
      </div>
    `;

    const closeBtn = modalRoot.querySelector('#btn-close-verify-modal');
    const input = modalRoot.querySelector('#verify-cert-input');
    const btnVerify = modalRoot.querySelector('#btn-do-verify');
    const resultBox = modalRoot.querySelector('#verify-result-box');

    const closeModal = () => (modalRoot.innerHTML = '');
    closeBtn.addEventListener('click', closeModal);

    async function performVerification() {
      const code = input.value.trim();
      if (!code) {
        showToast('Please enter Certificate ID', 'error');
        input.focus();
        return;
      }

      resultBox.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Verifying certificate ID...</div>`;

      let found = (db.certificates || []).find((c) => (c.certNo || '').toLowerCase() === code.toLowerCase());
      try {
        const apiRes = await apiFetch(`/certificates/verify/${encodeURIComponent(code)}`);
        if (apiRes && apiRes.data) {
          found = apiRes.data;
        }
      } catch (err) {}

      if (found) {
        resultBox.innerHTML = `
          <div style="background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.12)); border: 1.5px solid #059669; border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="cms-pill" style="background: #059669; color: white; font-weight: 800; font-size: 11.5px; padding: 3px 8px;">
                <i class="fa-solid fa-shield-check"></i> VERIFIED &amp; AUTHENTIC
              </span>
              <span class="font-mono" style="font-weight: 800; font-size: 13px; color: #059669;">${found.certNo}</span>
            </div>

            <div style="font-size: 13px; color: var(--text); line-height: 1.6;">
              <div><b>Patient:</b> ${found.patientName} ${found.patientAge ? `(${found.patientAge}Y/${found.patientGender || 'M'})` : ''}</div>
              <div><b>Diagnosis:</b> ${found.diagnosis}</div>
              <div><b>Period:</b> ${fmtDate(found.fromDate)} &rarr; ${fmtDate(found.toDate)} ${found.restDays ? `(${found.restDays} days)` : ''}</div>
              <div><b>Issued On:</b> ${fmtDate(found.issuedDate || found.createdAt)} at ${found.place || 'Surat'}</div>
              <div><b>Issuing Doctor:</b> ${found.doctorName || 'Dr. Chirag Paghdal'} (Reg. No. G-9035)</div>
            </div>

            <div style="font-size: 11px; color: #059669; font-weight: 600; border-top: 1px dashed rgba(5,150,105,0.4); padding-top: 6px;">
              <i class="fa-solid fa-circle-check"></i> Official Medical Certificate Record Matched in Clinic Registry.
            </div>
          </div>
        `;
      } else {
        resultBox.innerHTML = `
          <div style="background: rgba(239,68,68,0.08); border: 1.5px dashed var(--danger); border-radius: var(--radius-md); padding: 14px; text-align: center; display: flex; flex-direction: column; gap: 6px;">
            <div style="color: var(--danger); font-size: 20px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div style="font-weight: 800; color: var(--danger); font-size: 13.5px;">Certificate Not Found</div>
            <div style="font-size: 12px; color: var(--text-muted);">No official medical certificate matching ID <b>${code}</b> exists in the clinic database.</div>
          </div>
        `;
      }
    }

    btnVerify.addEventListener('click', performVerification);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performVerification();
      }
    });

    if (presetCertNo) {
      performVerification();
    }
  }

  // =========================================================
  // MODAL: DOCTOR DIGITAL SIGNATURE (Upload & Draw Pad)
  // =========================================================
  function openSignatureModal() {
    const modalRoot = container.querySelector('#modal-signature-container');
    if (!modalRoot) return;

    let activeTab = 'draw'; // 'draw' | 'upload'
    let drawnSignatureData = '';
    let uploadedSignatureData = '';

    modalRoot.innerHTML = `
      <div class="cms-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; backdrop-filter: blur(3px);">
        <div class="cms-modal cms-card" style="width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); border: 1px solid var(--border); padding: 22px; display: flex; flex-direction: column; gap: 14px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-signature" style="color: var(--primary); font-size: 20px;"></i>
              <div>
                <h2 class="font-display" style="font-weight: 800; font-size: 16px; margin: 0; color: var(--text);">
                  Doctor Digital Signature
                </h2>
                <div style="font-size: 11px; color: var(--text-muted);">
                  ${doctorName} &bull; ${clinicName}
                </div>
              </div>
            </div>
            <button type="button" id="btn-close-sig-modal" class="cms-btn cms-btn-ghost" style="padding: 4px 8px; border: none; font-size: 16px;">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Tab Selector -->
          <div style="display: flex; gap: 8px; background: var(--surface-alt); padding: 4px; border-radius: var(--radius-md); border: 1px solid var(--border);">
            <button type="button" id="tab-sig-draw" class="cms-btn cms-btn-sm" style="flex: 1; font-weight: 700; background: var(--primary); color: #fff;">
              <i class="fa-solid fa-pen-nib"></i> Draw Signature
            </button>
            <button type="button" id="tab-sig-upload" class="cms-btn cms-btn-sm cms-btn-ghost" style="flex: 1; font-weight: 700;">
              <i class="fa-solid fa-cloud-arrow-up"></i> Upload Image (PNG/JPG)
            </button>
          </div>

          <!-- DRAW TAB CONTENT -->
          <div id="sig-draw-pane" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted);">
              <span>Sign using mouse, stylus, or touchscreen:</span>
              <button type="button" id="btn-clear-canvas" class="cms-btn cms-btn-ghost cms-btn-sm" style="font-size: 11px; padding: 2px 8px; border: 1px solid var(--border);">
                <i class="fa-solid fa-eraser"></i> Clear Canvas
              </button>
            </div>
            
            <div style="border: 2px dashed #146B5C; border-radius: 8px; background: #ffffff; display: flex; justify-content: center; align-items: center; overflow: hidden; touch-action: none; position: relative;">
              <canvas id="sig-pad-canvas" width="480" height="150" style="width: 100%; height: 150px; cursor: crosshair; background: #ffffff;"></canvas>
              <div id="sig-canvas-placeholder" style="position: absolute; pointer-events: none; color: #94a3b8; font-size: 13px; font-style: italic;">
                Draw Doctor's Signature Here
              </div>
            </div>
          </div>

          <!-- UPLOAD TAB CONTENT -->
          <div id="sig-upload-pane" style="display: none; flex-direction: column; gap: 10px;">
            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px;">Choose Signature Image (Transparent PNG or JPG)</label>
              <input type="file" id="sig-file-input" accept="image/png, image/jpeg, image/webp" class="cms-input" style="padding: 7px 10px;" />
            </div>

            <div id="sig-upload-preview-box" style="border: 1px dashed var(--border); border-radius: 8px; padding: 16px; background: var(--surface-alt); text-align: center; min-height: 100px; display: flex; align-items: center; justify-content: center;">
              <span style="color: var(--text-muted); font-size: 12px;">No signature image selected yet.</span>
            </div>
          </div>

          <!-- Current Signature Preview (if exists) -->
          ${
            docSignature
              ? `
            <div style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.3); border-radius: var(--radius-md); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 11px; font-weight: 700; color: #059669; display: block;">CURRENT ACTIVE SIGNATURE</span>
                <img src="${docSignature}" style="max-height: 38px; max-width: 120px; object-fit: contain; margin-top: 4px;" alt="Active Doctor Signature" />
              </div>
              <button type="button" id="btn-remove-saved-sig" class="cms-btn cms-btn-ghost cms-btn-sm" style="color: var(--danger); border: 1px solid var(--danger); font-size: 11px; padding: 4px 8px;">
                <i class="fa-solid fa-trash-can"></i> Remove Signature
              </button>
            </div>
          `
              : ''
          }

          <!-- Footer Actions -->
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--border);">
            <button type="button" id="btn-cancel-sig-modal" class="cms-btn cms-btn-ghost" style="padding: 8px 16px; border: 1px solid var(--border);">
              Cancel
            </button>
            <button type="button" id="btn-save-apply-sig" class="cms-btn cms-btn-primary" style="padding: 8px 20px;">
              <i class="fa-solid fa-check"></i> Save &amp; Apply Signature
            </button>
          </div>

        </div>
      </div>
    `;

    const closeBtn = modalRoot.querySelector('#btn-close-sig-modal');
    const cancelBtn = modalRoot.querySelector('#btn-cancel-sig-modal');
    const tabDraw = modalRoot.querySelector('#tab-sig-draw');
    const tabUpload = modalRoot.querySelector('#tab-sig-upload');
    const drawPane = modalRoot.querySelector('#sig-draw-pane');
    const uploadPane = modalRoot.querySelector('#sig-upload-pane');
    const canvas = modalRoot.querySelector('#sig-pad-canvas');
    const canvasPlaceholder = modalRoot.querySelector('#sig-canvas-placeholder');
    const btnClearCanvas = modalRoot.querySelector('#btn-clear-canvas');
    const fileInput = modalRoot.querySelector('#sig-file-input');
    const uploadPreviewBox = modalRoot.querySelector('#sig-upload-preview-box');
    const btnSaveSig = modalRoot.querySelector('#btn-save-apply-sig');
    const btnRemoveSavedSig = modalRoot.querySelector('#btn-remove-saved-sig');

    const closeModal = () => (modalRoot.innerHTML = '');
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Canvas Drawing Logic
    const ctx = canvas ? canvas.getContext('2d') : null;
    let isDrawing = false;
    let hasDrawn = false;

    if (ctx) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY,
        };
      }

      function startDraw(e) {
        isDrawing = true;
        hasDrawn = true;
        if (canvasPlaceholder) canvasPlaceholder.style.display = 'none';
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }

      function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }

      function stopDraw() {
        if (isDrawing) {
          isDrawing = false;
          drawnSignatureData = canvas.toDataURL('image/png');
        }
      }

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      window.addEventListener('mouseup', stopDraw);

      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      window.addEventListener('touchend', stopDraw);

      btnClearCanvas.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
        drawnSignatureData = '';
        if (canvasPlaceholder) canvasPlaceholder.style.display = 'block';
      });
    }

    // Tab Switching
    tabDraw.addEventListener('click', () => {
      activeTab = 'draw';
      tabDraw.style.background = 'var(--primary)';
      tabDraw.style.color = '#fff';
      tabUpload.style.background = 'transparent';
      tabUpload.style.color = 'var(--text)';
      drawPane.style.display = 'flex';
      uploadPane.style.display = 'none';
    });

    tabUpload.addEventListener('click', () => {
      activeTab = 'upload';
      tabUpload.style.background = 'var(--primary)';
      tabUpload.style.color = '#fff';
      tabDraw.style.background = 'transparent';
      tabDraw.style.color = 'var(--text)';
      uploadPane.style.display = 'flex';
      drawPane.style.display = 'none';
    });

    // File Upload Handler
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        uploadedSignatureData = evt.target.result;
        uploadPreviewBox.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
            <img src="${uploadedSignatureData}" style="max-height: 80px; max-width: 260px; object-fit: contain; border: 1px dashed var(--border); padding: 4px; background: #fff;" alt="Uploaded signature preview" />
            <span style="font-size: 11px; color: #059669; font-weight: 700;"><i class="fa-solid fa-check"></i> Image loaded successfully</span>
          </div>
        `;
      };
      reader.readAsDataURL(file);
    });

    // Remove Saved Signature
    if (btnRemoveSavedSig) {
      btnRemoveSavedSig.addEventListener('click', () => {
        db.doctorSignature = '';
        saveLocalDB(db, clinicId);
        docSignature = '';
        closeModal();
        renderView();
        showToast('Doctor signature removed from certificate template.');
      });
    }

    // Save & Apply Signature
    btnSaveSig.addEventListener('click', () => {
      let finalSig = '';
      if (activeTab === 'draw') {
        if (!hasDrawn || !drawnSignatureData) {
          showToast('Please draw a signature first or switch to Upload Image tab', 'error');
          return;
        }
        finalSig = drawnSignatureData;
      } else {
        if (!uploadedSignatureData) {
          showToast('Please select a signature image file to upload', 'error');
          return;
        }
        finalSig = uploadedSignatureData;
      }

      docSignature = finalSig;
      db.doctorSignature = finalSig;
      saveLocalDB(db, clinicId);

      closeModal();
      renderView();
      showToast('✅ Doctor Digital Signature saved and applied to certificate!');
    });
  }

  // Initial render
  renderView();
}
