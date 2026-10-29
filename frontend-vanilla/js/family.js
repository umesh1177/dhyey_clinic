/**
 * =========================================================
 * FAMILY MANAGEMENT CONTROLLER
 * Family Head Registration & Edit Mode, Auto-Datalist Learning,
 * Multi-Clinic Auto-ID Generation & Directory View
 * =========================================================
 */

import { apiFetch, getLocalDB, saveLocalDB, getAuthSession, pad, todayISO, showToast, getClinicPrefix, generateFamilyId, getSharedMasterCollection, addSharedMasterItem } from './api.js';

export function renderFamilyRegistration(container, onSelectPatient, onAddedFamily) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';
  const clinicCode = getClinicPrefix(clinicId);
  const db = getLocalDB(clinicId);

  // Initialize custom datalist arrays if missing
  if (!db.customSocieties) db.customSocieties = [];
  if (!db.customAreas) db.customAreas = [];
  if (!db.customAllergies) db.customAllergies = [];

  let filterQuery = '';
  let expandedFamId = null;
  let editingFamId = null; // Holds the famId currently being edited
  let layoutPref = localStorage.getItem('cms_family_layout_pref') || 'pref-1';
  let pageSize = 20; // Default: 20 records per page
  let currentPage = 1;

  // Calculate live next family ID preview
  const currentYear = new Date().getFullYear();
  const existingFamilies = Object.values(db.families || {});
  const nextSequence = (db.counters?.family || existingFamilies.length) + 1;
  const previewFamilyId = generateFamilyId(clinicId, currentYear, nextSequence);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Doctor Layout Preference Controls -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 8px 16px; box-shadow: var(--shadow-sm); flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-sliders" style="color: var(--primary); font-size: 14px;"></i>
          <span style="font-weight: 700; font-size: 13px; color: var(--text-muted);">Doctor Layout Preference:</span>
        </div>
        <div style="display: flex; gap: 8px;" id="family-layout-pref-buttons">
          <button type="button" id="btn-pref-1" class="cms-btn cms-btn-sm ${layoutPref === 'pref-1' ? 'cms-btn-primary' : 'cms-btn-ghost'}" style="font-size: 12.5px; padding: 6px 14px; border: 1px solid var(--border);" title="Preference 1: Side by Side (Form & Directory in same row)">
            <i class="fa-solid fa-table-columns"></i>
            <span>Preference 1 (Side-by-Side)</span>
          </button>
          <button type="button" id="btn-pref-2" class="cms-btn cms-btn-sm ${layoutPref === 'pref-2' ? 'cms-btn-primary' : 'cms-btn-ghost'}" style="font-size: 12.5px; padding: 6px 14px; border: 1px solid var(--border);" title="Preference 2: Stacked View (Form on top, Directory below)">
            <i class="fa-solid fa-table-rows"></i>
            <span>Preference 2 (Stacked View)</span>
          </button>
        </div>
      </div>

      <!-- Main Grid Container -->
      <div id="family-layout-grid" style="display: grid; grid-template-columns: ${layoutPref === 'pref-2' ? '1fr' : '1fr 1fr'}; gap: 20px; align-items: stretch; transition: grid-template-columns 0.2s ease;">
        <!-- Left / Top: Register / Update Family Head Form -->
        <form id="form-new-family" class="cms-card" style="display: flex; flex-direction: column; gap: 10px; ${layoutPref === 'pref-1' ? 'height: 515px; min-height: 515px; max-height: 515px;' : 'min-height: auto;'} box-sizing: border-box; overflow-y: auto;">
          
          <!-- Header Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div id="family-form-title" class="font-display" style="font-weight: 800; font-size: 15.5px;">
              Step 1 &middot; Register Family Head
            </div>
            <span id="family-mode-badge" class="cms-pill font-mono" style="font-size: 11px; background: rgba(37,99,235,0.1); color: var(--primary); font-weight: 700;">
              <i class="fa-solid fa-circle-info"></i> Multi-Clinic ID
            </span>
          </div>

          <!-- Family Head ID Preview Card (Dynamic for Create / Edit Mode) -->
          <div id="preview-family-id-card" style="background: linear-gradient(135deg, rgba(37,99,235,0.06), rgba(59,130,246,0.12)); border: 1.5px dashed var(--primary); border-radius: var(--radius-md); padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div id="preview-family-id-label" style="font-size: 10.5px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px;">
                <i class="fa-solid fa-id-card"></i> Auto-Generated Family ID
              </div>
              <div style="font-size: 16px; font-weight: 800; color: var(--text); font-family: var(--font-mono); margin-top: 1px;" id="preview-family-id-text">
                ${previewFamilyId}
              </div>
            </div>
            <div id="preview-family-id-badges" style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
              <span class="cms-pill cms-badge-paid font-mono" style="font-size: 10px;"><i class="fa-solid fa-hospital"></i> ${clinicCode}</span>
              <span class="cms-pill font-mono" style="font-size: 10px; background: var(--surface);"><i class="fa-solid fa-calendar"></i> ${currentYear}</span>
            </div>
          </div>

          <!-- Family Head Name -->
          <div class="cms-form-group" style="margin-bottom: 0;">
            <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Family Head Name *</label>
            <input type="text" id="head-name-input" class="cms-input" required placeholder="(SURNAME NAME FATHER'S NAME)" autofocus style="padding: 7px 10px;" />
          </div>

          <!-- Age, Blood Group & Known Allergies (Just below Family Head Name) -->
          <div style="display: grid; grid-template-columns: 0.8fr 1fr 1.2fr; gap: 8px;">
            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Age</label>
              <input type="number" id="head-age-input" class="cms-input" placeholder="e.g. 45" min="0" max="130" style="padding: 7px 10px;" />
            </div>
            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Blood Group</label>
              <select id="head-bg-input" class="cms-select cms-input" style="padding: 7px 10px;">
                <option value="">-- Select --</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Known Allergies</label>
              <input type="text" id="head-allergy-input" class="cms-input" list="dl-allergy-list" placeholder="e.g. Penicillin, None" style="padding: 7px 10px;" />
            </div>
          </div>

          <!-- Society / Flat (1st column) & Area / Location (2nd column) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Society / Flat</label>
              <input type="text" id="head-society-input" class="cms-input" list="dl-society-list" placeholder="e.g. Shanti Niketan" style="padding: 7px 10px;" />
            </div>
            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Area / Location</label>
              <input type="text" id="head-area-input" class="cms-input" list="dl-area-list" placeholder="e.g. Vastrapur, Satellite" style="padding: 7px 10px;" />
            </div>
          </div>

          <!-- Registration Done By (1st column) & Phone Number (2nd column) -->
          <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 10px;">
            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Registration Done By *</label>
              <select id="head-registered-by-input" class="cms-select cms-input" style="padding: 7px 10px;">
                <option value="Self" selected>Self (Head of Family)</option>
                <option value="Family Member">Family Member</option>
              </select>
            </div>
            <div class="cms-form-group" style="margin-bottom: 0;">
              <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Phone Number</label>
              <input type="tel" id="head-phone-input" class="cms-input" placeholder="10-digit mobile" style="padding: 7px 10px;" />
            </div>
          </div>

          <!-- Action Buttons (Submit & Cancel Edit) -->
          <div style="display: flex; gap: 8px; margin-top: 4px; padding-top: 2px;">
            <button type="button" id="btn-cancel-edit-family" class="cms-btn cms-btn-ghost" style="display: none; padding: 9px 14px; border: 1px solid var(--border); font-size: 13px;">
              <i class="fa-solid fa-xmark"></i> Cancel Edit
            </button>
            <button type="submit" id="btn-submit-family" class="cms-btn cms-btn-primary" style="flex: 1; padding: 9px 16px;">
              <span id="btn-submit-icon"><i class="fa-solid fa-arrow-right"></i></span>
              <span id="btn-submit-text">Continue</span>
              <span class="cms-kbd">Enter</span>
            </button>
          </div>
        </form>

        <!-- Right / Bottom: Registered Families Directory -->
        <div id="family-directory-card" class="cms-card" style="display: flex; flex-direction: column; gap: 10px; ${layoutPref === 'pref-1' ? 'height: 560px; min-height: 560px; max-height: 560px;' : 'min-height: 520px; max-height: 650px;'} box-sizing: border-box; overflow: hidden;">
          <div class="cms-card-header" style="margin-bottom: 0; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
            <div class="cms-card-title">Registered Families Directory</div>
            <span class="cms-pill cms-badge-paid font-mono" id="family-badge-total" style="font-size: 11px;">0 Families</span>
          </div>

          <!-- Search Input -->
          <div style="position: relative;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 12px;"></i>
            <input type="text" id="family-search-input" class="cms-input cms-input-sm" style="padding-left: 30px;" placeholder="Search by head name, society, area, or FAM ID..." />
          </div>

          <!-- Scrollable Directory List Area -->
          <div id="family-cards-list" class="cms-scrollbar" style="flex: 1 1 auto; min-height: 0; overflow-y: auto; scroll-behavior: smooth; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
            <!-- Dynamically Rendered -->
          </div>

          <!-- Bottom Footer Pagination & Record Controls -->
          <div id="family-directory-footer" style="margin-top: auto; padding-top: 8px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--text-muted);">
            <div id="family-pagination-info" style="font-weight: 600;">
              Showing <span id="family-showing-count">0</span>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              <!-- Records Per Page Dropdown -->
              <label style="font-size: 11px; font-weight: 600;">Per page:</label>
              <select id="family-page-size-select" class="cms-select cms-input-sm" style="padding: 2px 6px; font-size: 11.5px; border-radius: 6px; height: 28px;">
                <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
                <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
                <option value="all" ${pageSize === 'all' ? 'selected' : ''}>View All</option>
              </select>

              <!-- Previous Button -->
              <button type="button" id="btn-prev-page" class="cms-btn cms-btn-sm cms-btn-ghost" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid var(--border); height: 28px;" title="Previous Page">
                <i class="fa-solid fa-chevron-left"></i>
              </button>

              <!-- Page Number Indicator -->
              <span id="family-page-indicator" style="font-weight: 700; font-size: 11.5px; padding: 0 3px;">1 / 1</span>

              <!-- Next Button -->
              <button type="button" id="btn-next-page" class="cms-btn cms-btn-sm cms-btn-ghost" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid var(--border); height: 28px;" title="Next Page">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // DOM References
  const form = container.querySelector('#form-new-family');
  const formTitleEl = container.querySelector('#family-form-title');
  const formModeBadge = container.querySelector('#family-mode-badge');
  const previewLabelEl = container.querySelector('#preview-family-id-label');
  const previewIdTextEl = container.querySelector('#preview-family-id-text');
  const previewBadgesEl = container.querySelector('#preview-family-id-badges');
  const headNameInput = container.querySelector('#head-name-input');
  const ageInput = container.querySelector('#head-age-input');
  const bgInput = container.querySelector('#head-bg-input');
  const allergyInput = container.querySelector('#head-allergy-input');
  const societyInput = container.querySelector('#head-society-input');
  const areaInput = container.querySelector('#head-area-input');
  const registeredByInput = container.querySelector('#head-registered-by-input');
  const phoneInput = container.querySelector('#head-phone-input');
  const btnSubmitIcon = container.querySelector('#btn-submit-icon');
  const btnSubmitText = container.querySelector('#btn-submit-text');
  const btnCancelEdit = container.querySelector('#btn-cancel-edit-family');

  // Layout Preference Toggle Handlers
  const btnPref1 = container.querySelector('#btn-pref-1');
  const btnPref2 = container.querySelector('#btn-pref-2');
  const layoutGrid = container.querySelector('#family-layout-grid');
  const formCard = container.querySelector('#form-new-family');
  const dirCard = container.querySelector('#family-directory-card');

  function setLayoutPreference(pref) {
    layoutPref = pref;
    localStorage.setItem('cms_family_layout_pref', pref);

    if (pref === 'pref-1') {
      layoutGrid.style.gridTemplateColumns = '1fr 1fr';
      formCard.style.height = '560px';
      formCard.style.minHeight = '560px';
      formCard.style.maxHeight = '560px';
      dirCard.style.height = '560px';
      dirCard.style.minHeight = '560px';
      dirCard.style.maxHeight = '560px';
      btnPref1.className = 'cms-btn cms-btn-sm cms-btn-primary';
      btnPref2.className = 'cms-btn cms-btn-sm cms-btn-ghost';
    } else {
      layoutGrid.style.gridTemplateColumns = '1fr';
      formCard.style.height = 'auto';
      formCard.style.minHeight = 'auto';
      formCard.style.maxHeight = 'none';
      dirCard.style.height = 'auto';
      dirCard.style.minHeight = '520px';
      dirCard.style.maxHeight = '650px';
      btnPref1.className = 'cms-btn cms-btn-sm cms-btn-ghost';
      btnPref2.className = 'cms-btn cms-btn-sm cms-btn-primary';
    }
  }

  btnPref1.addEventListener('click', () => setLayoutPreference('pref-1'));
  btnPref2.addEventListener('click', () => setLayoutPreference('pref-2'));

  // Registration Done By Handler -> Dynamically update Submit Button Text
  function updateSubmitButtonText() {
    if (editingFamId) {
      btnSubmitIcon.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>';
      btnSubmitText.textContent = 'Update Family Head';
      return;
    }
    const val = registeredByInput.value;
    if (val === 'Family Member') {
      btnSubmitIcon.innerHTML = '<i class="fa-solid fa-user-plus"></i>';
      btnSubmitText.textContent = 'Continue & Add Member';
    } else {
      btnSubmitIcon.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
      btnSubmitText.textContent = 'Continue';
    }
  }
  registeredByInput.addEventListener('change', updateSubmitButtonText);

  // Switch to Edit Mode
  function setEditMode(famId) {
    const fam = db.families?.[famId] || Object.values(db.families || {}).find(f => f.famId === famId || f.id === famId);
    if (!fam) {
      showToast('Family record not found', 'error');
      return;
    }

    const headPat = Object.values(fam.patients || {}).find(p => p.relation === 'Head') || Object.values(fam.patients || {})[0] || {};
    editingFamId = famId;

    // Change Header and Titles
    formTitleEl.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: var(--primary);"></i> Update Family Head Details`;
    formModeBadge.innerHTML = `<i class="fa-solid fa-pen"></i> Editing FAM ${famId}`;
    formModeBadge.style.background = 'rgba(234, 88, 12, 0.12)';
    formModeBadge.style.color = '#ea580c';

    // Update ID Preview Card
    previewLabelEl.innerHTML = `<i class="fa-solid fa-id-card"></i> Updating Family Head Record`;
    previewIdTextEl.textContent = famId;
    previewBadgesEl.innerHTML = `
      <span class="cms-pill cms-badge-warning font-mono" style="font-size: 10px; background: rgba(234,88,12,0.15); color: #ea580c; font-weight: 700;">Edit Mode</span>
      <span class="cms-pill font-mono" style="font-size: 10px; background: var(--surface);"><i class="fa-solid fa-hospital"></i> ${clinicCode}</span>
    `;

    // Populate Fields
    headNameInput.value = fam.headName || headPat.name || '';
    ageInput.value = headPat.age || '';
    bgInput.value = headPat.bloodGroup || '';
    allergyInput.value = headPat.allergy || '';
    societyInput.value = fam.society || headPat.society || '';
    areaInput.value = fam.area || headPat.area || '';
    registeredByInput.value = fam.registeredBy || 'Self';
    phoneInput.value = fam.phone || headPat.phone || '';

    // Change Button Text & Show Cancel
    btnSubmitIcon.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>';
    btnSubmitText.textContent = 'Update Family Head';
    btnCancelEdit.style.display = 'inline-flex';

    headNameInput.focus();
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`Editing Family Head: ${fam.headName}`);
  }

  // Clear Edit Mode (Revert to Register Mode)
  function clearEditMode() {
    editingFamId = null;
    form.reset();

    formTitleEl.innerHTML = `Step 1 &middot; Register Family Head`;
    formModeBadge.innerHTML = `<i class="fa-solid fa-circle-info"></i> Multi-Clinic ID`;
    formModeBadge.style.background = 'rgba(37,99,235,0.1)';
    formModeBadge.style.color = 'var(--primary)';

    const nextSeq = (db.counters?.family || Object.keys(db.families || {}).length) + 1;
    previewLabelEl.innerHTML = `<i class="fa-solid fa-id-card"></i> Auto-Generated Family ID`;
    previewIdTextEl.textContent = generateFamilyId(clinicId, currentYear, nextSeq);
    previewBadgesEl.innerHTML = `
      <span class="cms-pill cms-badge-paid font-mono" style="font-size: 10px;"><i class="fa-solid fa-hospital"></i> ${clinicCode}</span>
      <span class="cms-pill font-mono" style="font-size: 10px; background: var(--surface);"><i class="fa-solid fa-calendar"></i> ${currentYear}</span>
    `;

    btnCancelEdit.style.display = 'none';
    updateSubmitButtonText();
  }

  btnCancelEdit.addEventListener('click', () => {
    clearEditMode();
    showToast('Cancelled edit mode');
  });

  // Page Size Dropdown Handler
  const pageSizeSelect = container.querySelector('#family-page-size-select');
  pageSizeSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    pageSize = val === 'all' ? 'all' : parseInt(val, 10);
    currentPage = 1;
    renderFamilyList();
  });

  // Previous and Next Page Buttons Handlers
  const btnPrevPage = container.querySelector('#btn-prev-page');
  const btnNextPage = container.querySelector('#btn-next-page');

  btnPrevPage.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderFamilyList();
    }
  });

  btnNextPage.addEventListener('click', () => {
    const totalFamilies = getFilteredFamilies().length;
    const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalFamilies / Number(pageSize)) || 1;
    if (currentPage < totalPages) {
      currentPage++;
      renderFamilyList();
    }
  });

  // Autocomplete Datalists setup
  renderDatalists(container, db);

  // Auto-Learn Datalist helper
  function checkAndLearnDatalist(val, type) {
    if (!val || !val.trim()) return;
    const trimmed = val.trim();

    if (type === 'society') {
      addSharedMasterItem('societies', { id: `s_${Date.now()}`, name: trimmed, area: '', createdAt: todayISO() }, db);
    } else if (type === 'area') {
      addSharedMasterItem('areas', { id: `a_${Date.now()}`, name: trimmed, city: '', pincode: '', createdAt: todayISO() }, db);
    } else if (type === 'allergy') {
      addSharedMasterItem('allergies', { id: `al_${Date.now()}`, name: trimmed, category: 'General', severity: 'None', createdAt: todayISO() }, db);
    }
  }

  headNameInput.addEventListener('input', (e) => {
    headNameInput.value = e.target.value.replace(/,/g, ' ').replace(/\s+/g, ' ').toUpperCase();
  });

  // Form Submit Handler (Handles Create AND Update)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const headName = headNameInput.value.trim().toUpperCase();
    const age = ageInput.value.trim();
    const bloodGroup = bgInput.value.trim();
    const society = societyInput.value.trim();
    const registeredBy = registeredByInput.value;
    const area = areaInput.value.trim();
    const allergy = allergyInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!headName) {
      showToast('Please enter the family head name.', 'error');
      headNameInput.focus();
      return;
    }
    if (headName.length < 3) {
      showToast('Family head name must be at least 3 characters.', 'error');
      headNameInput.focus();
      return;
    }
    if (age && (isNaN(Number(age)) || Number(age) < 0 || Number(age) > 130)) {
      showToast('Please enter a valid age between 0 and 130.', 'error');
      return;
    }
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        showToast('Please enter a valid 10-digit Indian mobile number.', 'error');
        return;
      }
    }

    // Auto-learn new values entered for society, area, and allergy
    checkAndLearnDatalist(society, 'society');
    checkAndLearnDatalist(area, 'area');
    checkAndLearnDatalist(allergy, 'allergy');

    // ==========================================
    // UPDATE EXISTING FAMILY HEAD
    // ==========================================
    if (editingFamId) {
      const targetFamId = editingFamId;
      try {
        await apiFetch(`/families/${targetFamId}`, {
          method: 'PUT',
          body: {
            headName,
            age,
            bloodGroup,
            society,
            registeredBy,
            allergy,
            area,
            phone,
          },
        });
      } catch (err) {
        console.warn('Backend API update error, continuing with local DB', err);
      }

      // Sync local DB
      if (db.families && db.families[targetFamId]) {
        const fam = db.families[targetFamId];
        fam.headName = headName;
        fam.society = society;
        fam.registeredBy = registeredBy;
        fam.area = area;
        fam.phone = phone;

        // Find & update Head patient
        if (fam.patients) {
          const headPatKey = Object.keys(fam.patients).find(k => fam.patients[k].relation === 'Head') || Object.keys(fam.patients)[0];
          if (headPatKey && fam.patients[headPatKey]) {
            const hp = fam.patients[headPatKey];
            hp.name = headName;
            hp.age = age;
            hp.bloodGroup = bloodGroup;
            hp.allergy = allergy;
            hp.society = society;
            hp.area = area;
            hp.phone = phone;
          }
        }
        saveLocalDB(db, clinicId);
      }

      showToast(`Family Head for FAM ${targetFamId} updated successfully!`);
      clearEditMode();
      renderFamilyList();
      return;
    }

    // ==========================================
    // CREATE NEW FAMILY HEAD
    // ==========================================
    const curYr = new Date().getFullYear();
    const curSeq = (db.counters?.family || Object.keys(db.families || {}).length) + 1;
    const computedFamId = generateFamilyId(clinicId, curYr, curSeq);

    // Try backend API first
    let createdFamId = null;
    let createdPatId = null;

    try {
      const res = await apiFetch('/families', {
        method: 'POST',
        body: {
          famId: computedFamId,
          headName,
          age,
          bloodGroup,
          society,
          registeredBy,
          area,
          allergy,
          phone,
        },
      });
      if (res && res.success && res.data) {
        createdFamId = res.data.family?.famId || res.data.family?.id;
        createdPatId = res.data.headPatient?.patId || res.data.headPatient?.id;
      }
    } catch (err) {
      console.warn('Backend API error, continuing with local DB sync', err);
    }

    const finalFamId = createdFamId || computedFamId;
    const famSeqCode = pad(curSeq, 4);
    const finalPatId = createdPatId || `${famSeqCode}0001`;

    const pat = {
      id: finalPatId,
      patId: finalPatId,
      familyId: finalFamId,
      name: headName,
      relation: 'Head',
      age,
      bloodGroup,
      society,
      allergy,
      area,
      phone,
      visits: [],
    };

    const fam = {
      id: finalFamId,
      famId: finalFamId,
      headName,
      society,
      registeredBy,
      area,
      phone,
      year: curYr,
      sequence: curSeq,
      createdAt: todayISO(),
      patients: { [finalPatId]: pat },
    };

    if (!db.counters) db.counters = { family: 0, patient: 0, visit: 0 };
    db.counters.family = Math.max(db.counters.family || 0, curSeq);
    db.counters.patient = (db.counters.patient || 0) + 1;
    if (!db.families) db.families = {};
    db.families[finalFamId] = fam;
    saveLocalDB(db, clinicId);

    showToast(`Family ID ${finalFamId} registered successfully!`);
    form.reset();
    updateSubmitButtonText();

    // Update live preview ID for next family
    const nextSeqAfterSave = (db.counters?.family || Object.keys(db.families || {}).length) + 1;
    if (previewIdTextEl) {
      previewIdTextEl.textContent = generateFamilyId(clinicId, curYr, nextSeqAfterSave);
    }

    // Refresh the registered families directory list immediately
    currentPage = 1;
    renderFamilyList();

    // Redirection according to 'Registration Done By'
    if (registeredBy === 'Family Member') {
      if (onAddedFamily) {
        onAddedFamily(finalFamId, finalPatId);
      } else if (onSelectPatient) {
        onSelectPatient(finalFamId, finalPatId);
      }
    } else {
      // Self selected -> Redirect directly to patient record (case) tab
      if (onSelectPatient) {
        onSelectPatient(finalFamId, finalPatId);
      } else if (onAddedFamily) {
        onAddedFamily(finalFamId, finalPatId);
      }
    }
  });

  // Search Filter Handler
  const searchInput = container.querySelector('#family-search-input');
  searchInput.addEventListener('input', (e) => {
    filterQuery = e.target.value.toLowerCase().trim();
    currentPage = 1;
    renderFamilyList();
  });

  function getFilteredFamilies() {
    const allFamilies = Object.values(db.families || {}).sort((a, b) => {
      const dateA = a.createdAt || '';
      const dateB = b.createdAt || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      return (Number(b.sequence) || 0) - (Number(a.sequence) || 0);
    });

    return allFamilies.filter((f) => {
      if (!filterQuery) return true;
      if (f.headName && f.headName.toLowerCase().includes(filterQuery)) return true;
      if ((f.id || f.famId || '').toLowerCase().includes(filterQuery)) return true;
      if (f.society && f.society.toLowerCase().includes(filterQuery)) return true;
      if (f.area && f.area.toLowerCase().includes(filterQuery)) return true;
      return Object.values(f.patients || {}).some((p) => p.name && p.name.toLowerCase().includes(filterQuery));
    });
  }

  function renderFamilyList() {
    const listContainer = container.querySelector('#family-cards-list');
    if (!listContainer) return;
    const prevScrollTop = listContainer.scrollTop;
    const showingCountEl = container.querySelector('#family-showing-count');
    const badgeTotalEl = container.querySelector('#family-badge-total');
    const pageIndicator = container.querySelector('#family-page-indicator');
    const btnPrev = container.querySelector('#btn-prev-page');
    const btnNext = container.querySelector('#btn-next-page');

    const allFamilies = Object.values(db.families || {});
    const totalAll = allFamilies.length;
    if (badgeTotalEl) {
      badgeTotalEl.textContent = `${totalAll} ${totalAll === 1 ? 'Family' : 'Families'}`;
    }

    const filtered = getFilteredFamilies();
    const totalFiltered = filtered.length;
    const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalFiltered / Number(pageSize)) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = pageSize === 'all' ? 0 : (currentPage - 1) * Number(pageSize);
    const endIndex = pageSize === 'all' ? totalFiltered : startIndex + Number(pageSize);
    const displayed = filtered.slice(startIndex, endIndex);

    // Update pagination controls
    if (pageIndicator) {
      pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    }
    if (btnPrev) {
      btnPrev.disabled = currentPage <= 1;
      btnPrev.style.opacity = currentPage <= 1 ? '0.4' : '1';
    }
    if (btnNext) {
      btnNext.disabled = currentPage >= totalPages || pageSize === 'all';
      btnNext.style.opacity = currentPage >= totalPages || pageSize === 'all' ? '0.4' : '1';
    }

    if (showingCountEl) {
      if (totalFiltered === 0) {
        showingCountEl.textContent = '0 families';
      } else {
        const from = startIndex + 1;
        const to = Math.min(endIndex, totalFiltered);
        showingCountEl.textContent = `${from}-${to} of ${totalFiltered} ${filterQuery ? 'matches' : 'families'}`;
      }
    }

    if (displayed.length === 0) {
      listContainer.innerHTML = `<div style="padding: 35px 10px; text-align: center; color: var(--text-muted); font-size: 13px;">No matching families found.</div>`;
      return;
    }

    listContainer.innerHTML = displayed
      .map((f) => {
        const famIdentifier = f.famId || f.id;
        const isExpanded = expandedFamId === famIdentifier || (filterQuery.length > 0 && displayed.length === 1);
        const memberCount = Object.keys(f.patients || {}).length;
        const isCurrentlyEditing = editingFamId === famIdentifier;

        const membersHTML = Object.values(f.patients || {})
          .map(
            (p) => `
          <div class="cms-member-item cms-clickable" data-famid="${famIdentifier}" data-patid="${p.id || p.patId}" style="display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; font-size: 12.5px; cursor: pointer; min-height: 32px; box-sizing: border-box; flex-shrink: 0;">
            <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
              <b style="color: var(--text);">${p.name}</b>
              <span style="color: var(--text-muted); font-size: 11px;">(${p.relation || 'Member'})</span>
              ${p.age ? `<span class="cms-pill" style="font-size: 9.5px; padding: 1px 5px;">${p.age} Yrs</span>` : ''}
              ${p.bloodGroup ? `<span class="cms-pill cms-badge-danger" style="font-size: 9.5px; padding: 1px 5px;">${p.bloodGroup}</span>` : ''}
              ${p.allergy ? `<span class="cms-pill cms-badge-warning" style="font-size: 9.5px; padding: 1px 5px;">Allergy: ${p.allergy}</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
              <span class="cms-kbd font-mono" style="font-size: 10px; padding: 1px 5px;">${p.patId || p.id}</span>
              <i class="fa-solid fa-arrow-right" style="color: var(--primary); font-size: 10.5px;"></i>
            </div>
          </div>
        `
          )
          .join('');

        return `
        <div class="cms-family-block" style="border: ${isCurrentlyEditing ? '2px solid #ea580c' : '1px solid var(--border)'}; border-radius: 12px; background: ${isCurrentlyEditing ? 'rgba(234, 88, 12, 0.04)' : 'var(--surface-alt)'}; overflow: hidden; transition: border-color 0.2s ease; flex-shrink: 0;">
          <div class="cms-family-header" data-toggle="${famIdentifier}" style="padding: 9px 13px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--text); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>${f.headName}</span>
                ${isCurrentlyEditing ? `<span class="cms-pill cms-badge-warning" style="font-size: 9.5px; padding: 1px 5px; background: rgba(234,88,12,0.15); color: #ea580c; font-weight: 700;"><i class="fa-solid fa-pen"></i> Editing</span>` : ''}
                ${f.registeredBy ? `<span class="cms-pill" style="font-size: 10px; padding: 1px 5px; background: rgba(0,0,0,0.04); font-weight: 600;">By ${f.registeredBy}</span>` : ''}
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                ${f.society ? `<b>${f.society}</b> &middot; ` : ''}${f.area || 'No Area'} &middot; ${memberCount} Member(s) &middot; <i class="fa-solid fa-phone" style="font-size: 10.5px;"></i> ${f.phone || 'N/A'}
              </div>
            </div>
            
            <!-- Actions: Edit & Delete Buttons -->
            <div style="display: flex; align-items: center; gap: 6px; margin-left: 8px;">
              <span class="cms-pill cms-badge-paid font-mono" style="font-size: 11px;">FAM ${famIdentifier}</span>
              <button type="button" class="cms-btn cms-btn-ghost cms-btn-edit-fam" data-famid="${famIdentifier}" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid var(--border);" title="Edit Family Head Details">
                <i class="fa-solid fa-pen-to-square" style="color: var(--primary);"></i> Edit
              </button>
              <button type="button" class="cms-btn-danger cms-btn-del-fam" data-famid="${famIdentifier}" style="padding: 4px 8px;" title="Delete Family">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

          ${
            isExpanded
              ? `
            <div style="padding: 8px 12px 10px; background: rgba(0,0,0,0.025); border-top: 1px solid var(--border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: flex; align-items: center; gap: 5px;">
                  <i class="fa-solid fa-users" style="color: var(--primary);"></i> Family Members (${memberCount}):
                </div>
                <span style="font-size: 10.5px; color: var(--primary); font-weight: 600;"><i class="fa-solid fa-arrows-up-down"></i> Scroll to view all &bull; Click to open</span>
              </div>
              <div class="cms-scrollbar cms-family-members-viewport" style="max-height: 105px; min-height: 38px; overflow-y: scroll !important; overflow-x: hidden; padding-right: 4px; display: flex; flex-direction: column; gap: 4px; scrollbar-width: thin; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;">
                ${membersHTML || '<div style="padding: 10px; text-align: center; color: var(--text-muted); font-size: 12px; font-style: italic;">No members registered under this family head yet.</div>'}
              </div>
            </div>
          `
              : ''
          }
        </div>
      `;
      })
      .join('');

    // Restore scroll position
    if (prevScrollTop) {
      listContainer.scrollTop = prevScrollTop;
    }

    // Direct wheel scroll handler on members viewport for immediate scrolling
    listContainer.querySelectorAll('.cms-family-members-viewport').forEach((vp) => {
      vp.addEventListener('wheel', (e) => {
        vp.scrollTop += e.deltaY;
        e.stopPropagation();
      }, { passive: true });
    });

    // Accordion Toggle Handlers
    listContainer.querySelectorAll('.cms-family-header').forEach((hdr) => {
      hdr.addEventListener('click', (e) => {
        if (e.target.closest('.cms-btn-del-fam') || e.target.closest('.cms-btn-edit-fam')) return;
        const famId = hdr.getAttribute('data-toggle');
        expandedFamId = expandedFamId === famId ? null : famId;
        renderFamilyList();
        if (expandedFamId) {
          setTimeout(() => {
            const block = listContainer.querySelector(`[data-toggle="${famId}"]`)?.closest('.cms-family-block');
            if (block) {
              block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 40);
        }
      });
    });

    // Edit Button Handlers
    listContainer.querySelectorAll('.cms-btn-edit-fam').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const famId = btn.getAttribute('data-famid');
        setEditMode(famId);
        renderFamilyList();
      });
    });

    // Member Click Handlers (Navigate to patient case record)
    listContainer.querySelectorAll('.cms-member-item').forEach((item) => {
      item.addEventListener('click', () => {
        const famId = item.getAttribute('data-famid');
        const patId = item.getAttribute('data-patid');
        if (famId && patId && onSelectPatient) {
          onSelectPatient(famId, patId);
        }
      });
    });

    // Delete Family Handler
    listContainer.querySelectorAll('.cms-btn-del-fam').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const famId = btn.getAttribute('data-famid');
        if (confirm(`Are you sure you want to permanently delete Family ID ${famId}? This will erase all members and visits.`)) {
          try {
            await apiFetch(`/families/${famId}`, { method: 'DELETE' });
          } catch (err) {}
          delete db.families[famId];
          saveLocalDB(db, clinicId);
          if (editingFamId === famId) {
            clearEditMode();
          }
          showToast(`Deleted Family ID ${famId}`, 'error');
          renderFamilyList();
        }
      });
    });
  }

  function getKnownSocieties(db) {
    const sharedSocs = getSharedMasterCollection('societies').map(s => s.name.trim());
    const societies = new Set(sharedSocs);
    (db.masterSocieties || []).forEach(s => societies.add(s.name.trim()));
    Object.values(db.families || {}).forEach((f) => {
      if (f.society) societies.add(f.society.trim());
    });
    (db.customSocieties || []).forEach((s) => societies.add(s.trim()));
    const normalized = new Set();
    societies.forEach(s => normalized.add(s.toLowerCase()));
    return normalized;
  }

  function getKnownAreas(db) {
    const sharedAreas = getSharedMasterCollection('areas').map(a => a.name.trim());
    const areas = new Set(sharedAreas);
    (db.masterAreas || []).forEach(a => areas.add(a.name.trim()));
    Object.values(db.families || {}).forEach((f) => {
      if (f.area) areas.add(f.area.trim());
    });
    (db.customAreas || []).forEach((a) => areas.add(a.trim()));
    const normalized = new Set();
    areas.forEach(a => normalized.add(a.toLowerCase()));
    return normalized;
  }

  function getKnownAllergies(db) {
    const sharedAllergies = getSharedMasterCollection('allergies').map(a => a.name.trim());
    const allergies = new Set(sharedAllergies);
    (db.masterAllergies || []).forEach(al => allergies.add(al.name.trim()));
    Object.values(db.families || {}).forEach((f) => {
      Object.values(f.patients || {}).forEach(p => {
        if (p.allergy) allergies.add(p.allergy.trim());
      });
    });
    (db.customAllergies || []).forEach((a) => allergies.add(a.trim()));
    const normalized = new Set();
    allergies.forEach(a => normalized.add(a.toLowerCase()));
    return normalized;
  }

  function renderDatalists(parent, db) {
    // Area Datalist
    let dlArea = document.getElementById('dl-area-list');
    if (dlArea) dlArea.remove();
    dlArea = document.createElement('datalist');
    dlArea.id = 'dl-area-list';
    const sharedAreas = getSharedMasterCollection('areas').map(a => a.name.trim());
    const areas = new Set(sharedAreas);
    (db.masterAreas || []).forEach(a => areas.add(a.name.trim()));
    Object.values(db.families || {}).forEach((f) => {
      if (f.area) areas.add(f.area.trim());
    });
    (db.customAreas || []).forEach((a) => areas.add(a.trim()));
    areas.forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a;
      dlArea.appendChild(opt);
    });
    document.body.appendChild(dlArea);

    // Society Datalist
    let dlSociety = document.getElementById('dl-society-list');
    if (dlSociety) dlSociety.remove();
    dlSociety = document.createElement('datalist');
    dlSociety.id = 'dl-society-list';
    const sharedSocs = getSharedMasterCollection('societies').map(s => s.name.trim());
    const societies = new Set(sharedSocs);
    (db.masterSocieties || []).forEach(s => societies.add(s.name.trim()));
    Object.values(db.families || {}).forEach((f) => {
      if (f.society) societies.add(f.society.trim());
    });
    (db.customSocieties || []).forEach((s) => societies.add(s.trim()));
    societies.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      dlSociety.appendChild(opt);
    });
    document.body.appendChild(dlSociety);

    // Allergies Datalist
    let dlAllergy = document.getElementById('dl-allergy-list');
    if (dlAllergy) dlAllergy.remove();
    dlAllergy = document.createElement('datalist');
    dlAllergy.id = 'dl-allergy-list';
    const sharedAllergies = getSharedMasterCollection('allergies').map(a => a.name.trim());
    const allergies = new Set(sharedAllergies);
    (db.masterAllergies || []).forEach(al => allergies.add(al.name.trim()));
    Object.values(db.families || {}).forEach((f) => {
      Object.values(f.patients || {}).forEach(p => {
        if (p.allergy) allergies.add(p.allergy.trim());
      });
    });
    (db.customAllergies || []).forEach((a) => allergies.add(a.trim()));
    allergies.forEach((alg) => {
      const opt = document.createElement('option');
      opt.value = alg;
      dlAllergy.appendChild(opt);
    });
    document.body.appendChild(dlAllergy);
  }

  // Initial List Render
  renderFamilyList();
}
