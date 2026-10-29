/**
 * =========================================================
 * PATIENT & FAMILY MEMBER MANAGEMENT
 * Interactive Family Head Search, Auto-fill Area/Society,
 * Member Registration, Member Details Update & Auto-Learning Datalists
 * =========================================================
 */

import { apiFetch, getLocalDB, saveLocalDB, getAuthSession, pad, showToast, getClinicPrefix, getSharedMasterCollection, addSharedMasterItem, todayISO } from './api.js';

export function renderPatientRegistration(container, presetFamId = null, onSelectPatient, isRedirectFromHeadReg = false, onGoToFamilyReg = null, editPatientId = null) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';
  const db = getLocalDB(clinicId);

  // Initialize custom datalists if missing
  if (!db.customRelations) db.customRelations = [];
  if (!db.customSocieties) db.customSocieties = [];
  if (!db.customAreas) db.customAreas = [];
  if (!db.customAllergies) db.customAllergies = [];

  let selectedFamId = presetFamId || null;
  let targetFamily = selectedFamId
    ? (db.families?.[selectedFamId] || Object.values(db.families || {}).find(f => f.famId === selectedFamId || f.id === selectedFamId))
    : null;

  // Check if editing an existing patient
  let editingPatient = (editPatientId && targetFamily?.patients)
    ? (targetFamily.patients[editPatientId] || Object.values(targetFamily.patients).find(p => p.id === editPatientId || p.patId === editPatientId))
    : null;

  function renderView() {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 900px; margin: 0 auto; width: 100%;">
        <div class="cms-card" style="display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; border-top: 3px solid ${editingPatient ? 'var(--warning)' : 'var(--primary)'};">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
            <div class="font-display" style="font-weight: 800; font-size: 16px;">
              ${
                editingPatient
                  ? `✏️ Edit Patient Details &middot; ${editingPatient.name}`
                  : targetFamily
                  ? (isRedirectFromHeadReg ? 'Step 2 &middot; Add Member to New Family' : `Add Member to Family &middot; ${targetFamily.headName}`)
                  : 'Add Family Member'
              }
            </div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: ${editingPatient ? 'rgba(245,158,11,0.15)' : 'rgba(37,99,235,0.1)'}; color: ${editingPatient ? 'var(--warning-dark, #b45309)' : 'var(--primary)'}; font-weight: 700;">
              <i class="fa-solid ${editingPatient ? 'fa-pen-to-square' : 'fa-user-plus'}"></i> ${editingPatient ? 'Editing Mode' : 'Member Registration'}
            </span>
          </div>

          <!-- Family Head Selection / Search Area -->
          ${
            targetFamily
              ? `
            <!-- Selected / Pinned Family Head Card -->
            <div style="background: linear-gradient(135deg, rgba(37,99,235,0.07), rgba(59,130,246,0.14)); border: 1.5px solid var(--primary); border-radius: var(--radius-md); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm); flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 17px;">
                  <i class="fa-solid fa-people-roof"></i>
                </div>
                <div>
                  <div style="font-size: 10.5px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px;">
                    ${isRedirectFromHeadReg ? 'Family Head &middot; Auto-Assigned' : 'Selected Family Head'}
                  </div>
                  <div style="font-size: 15px; font-weight: 800; color: var(--text);">
                    ${targetFamily.headName}
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">
                    ${targetFamily.society ? `<b>${targetFamily.society}</b> &middot; ` : ''}${targetFamily.area || 'No Area'} &middot; <i class="fa-solid fa-phone" style="font-size: 10px;"></i> ${targetFamily.phone || 'N/A'}
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="cms-pill cms-badge-paid font-mono" style="font-size: 12px; font-weight: 800;">FAM ${selectedFamId}</span>
                ${
                  !isRedirectFromHeadReg && !editingPatient
                    ? `
                  <button type="button" id="btn-change-family" class="cms-btn cms-btn-ghost cms-btn-sm" style="padding: 4px 10px; font-size: 11.5px; border: 1px solid var(--border);" title="Select a different family">
                    <i class="fa-solid fa-arrows-rotate"></i> Change Family
                  </button>
                `
                    : ''
                }
              </div>
            </div>
          `
              : `
            <!-- Family Head Search Input & Results -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label class="cms-label" style="font-size: 12.5px; font-weight: 700; margin-bottom: 2px;">
                <i class="fa-solid fa-magnifying-glass" style="color: var(--primary);"></i> Search Family Head *
              </label>
              <div style="position: relative;">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 13px;"></i>
                <input type="text" id="member-search-family-input" class="cms-input" placeholder="Type family head name, FAM ID, society, or area..." autofocus style="padding-left: 34px; padding-top: 10px; padding-bottom: 10px; font-size: 13.5px;" />
              </div>
              
              <!-- Suggestions Box / Not Found Banner -->
              <div id="family-search-suggestions-container" style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;"></div>
            </div>
          `
          }

          <!-- Member Form Fields (Shown only when a Family Head is selected) -->
          ${
            targetFamily
              ? `
            <form id="form-add-member" style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Member Name & Relation -->
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
                <div class="cms-form-group" style="margin-bottom: 0;">
                  <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Member Full Name *</label>
                  <input type="text" id="member-name-input" class="cms-input" required placeholder="(SURNAME NAME FATHER/HUSBAND'S NAME)" value="${editingPatient?.name || ''}" autofocus style="padding: 7px 10px;" />
                </div>

                <div class="cms-form-group" style="margin-bottom: 0;">
                  <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Relation to Head *</label>
                  <input type="text" id="member-rel-input" class="cms-input" list="dl-relation-list" required placeholder="e.g. Wife, Son, Mother" value="${editingPatient?.relation || ''}" style="padding: 7px 10px;" />
                </div>
              </div>

              <!-- Age, Blood Group & Known Allergies -->
              <div style="display: grid; grid-template-columns: 0.8fr 1fr 1.2fr; gap: 8px;">
                <div class="cms-form-group" style="margin-bottom: 0;">
                  <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Age</label>
                  <input type="text" id="member-age-input" class="cms-input" placeholder="e.g. 35, 6M" value="${editingPatient?.age || ''}" style="padding: 7px 10px;" />
                </div>

                <div class="cms-form-group" style="margin-bottom: 0;">
                  <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Blood Group</label>
                  <select id="member-blood-input" class="cms-select cms-input" style="padding: 7px 10px;">
                    <option value="">-- Select --</option>
                    <option value="A+" ${editingPatient?.bloodGroup === 'A+' ? 'selected' : ''}>A+</option>
                    <option value="A-" ${editingPatient?.bloodGroup === 'A-' ? 'selected' : ''}>A-</option>
                    <option value="B+" ${editingPatient?.bloodGroup === 'B+' ? 'selected' : ''}>B+</option>
                    <option value="B-" ${editingPatient?.bloodGroup === 'B-' ? 'selected' : ''}>B-</option>
                    <option value="AB+" ${editingPatient?.bloodGroup === 'AB+' ? 'selected' : ''}>AB+</option>
                    <option value="AB-" ${editingPatient?.bloodGroup === 'AB-' ? 'selected' : ''}>AB-</option>
                    <option value="O+" ${editingPatient?.bloodGroup === 'O+' ? 'selected' : ''}>O+</option>
                    <option value="O-" ${editingPatient?.bloodGroup === 'O-' ? 'selected' : ''}>O-</option>
                    <option value="Unknown" ${editingPatient?.bloodGroup === 'Unknown' ? 'selected' : ''}>Unknown</option>
                  </select>
                </div>

                <div class="cms-form-group" style="margin-bottom: 0;">
                  <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Known Allergies</label>
                  <input type="text" id="member-allergy-input" class="cms-input" list="dl-member-allergy-list" value="${editingPatient?.allergy || ''}" placeholder="e.g. Penicillin, None" style="padding: 7px 10px;" />
                </div>
              </div>

              <!-- Society / Flat & Area / Location (Auto-filled from Head, but Doctor Can Edit) -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="cms-form-group" style="margin-bottom: 0;">
                  <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">
                    Society / Flat <span style="font-size: 10.5px; color: var(--text-muted); font-weight: normal;">(Auto-filled, editable)</span>
                  </label>
                  <input type="text" id="member-society-input" class="cms-input" list="dl-member-society-list" value="${editingPatient?.society || targetFamily.society || ''}" placeholder="e.g. Shanti Niketan Apt" style="padding: 7px 10px;" />
                </div>

                <div class="cms-form-group" style="margin-bottom: 0;">
                  <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">
                    Area / Location <span style="font-size: 10.5px; color: var(--text-muted); font-weight: normal;">(Auto-filled, editable)</span>
                  </label>
                  <input type="text" id="member-area-input" class="cms-input" list="dl-member-area-list" value="${editingPatient?.area || targetFamily.area || ''}" placeholder="e.g. Vastrapur, Satellite" style="padding: 7px 10px;" />
                </div>
              </div>

              <!-- Mobile Phone (Optional) -->
              <div class="cms-form-group" style="margin-bottom: 0;">
                <label class="cms-label" style="font-size: 12px; margin-bottom: 3px;">Contact Phone (Optional)</label>
                <input type="tel" id="member-phone-input" class="cms-input" value="${editingPatient?.phone || targetFamily.phone || ''}" placeholder="10-digit mobile" style="padding: 7px 10px;" />
              </div>

              <!-- Action Buttons -->
              <div style="display: flex; gap: 8px; margin-top: 4px; padding-top: 4px;">
                ${
                  editingPatient
                    ? `
                  <button type="button" id="btn-cancel-edit-member" class="cms-btn cms-btn-ghost" style="flex: 1; border: 1px solid var(--border); padding: 10px 16px; font-weight: 700;">
                    <i class="fa-solid fa-xmark"></i> Cancel
                  </button>
                `
                    : ''
                }
                <button type="submit" id="btn-submit-member" class="cms-btn ${editingPatient ? 'cms-btn-warning' : 'cms-btn-primary'}" style="flex: 2; padding: 10px 16px;">
                  <span><i class="fa-solid ${editingPatient ? 'fa-floppy-disk' : 'fa-user-plus'}"></i></span>
                  <span>${editingPatient ? 'Update Member & Return to Patient Record' : 'Save Member & Open Patient Record'}</span>
                  <span class="cms-kbd">Enter</span>
                </button>
              </div>
            </form>
          `
              : `
            <!-- Prompt when no family is selected -->
            <div style="padding: 30px 20px; text-align: center; color: var(--text-muted); background: var(--surface-alt); border-radius: var(--radius-md); border: 1px dashed var(--border);">
              <div style="font-size: 32px; color: var(--primary); margin-bottom: 8px; opacity: 0.8;"><i class="fa-solid fa-magnifying-glass"></i></div>
              <div style="font-size: 14px; font-weight: 700; color: var(--text);">Search and select a Family Head above</div>
              <div style="font-size: 12px; margin-top: 3px;">Once a family head is selected, the member details form will appear.</div>
            </div>
          `
          }
        </div>
      </div>
    `;

    // Render Datalists
    renderMemberDatalists(db);

    // Cancel Edit Button
    const btnCancelEdit = container.querySelector('#btn-cancel-edit-member');
    if (btnCancelEdit) {
      btnCancelEdit.addEventListener('click', () => {
        if (onSelectPatient) {
          onSelectPatient(selectedFamId, editPatientId);
        }
      });
    }

    // Wire Change Family Button
    const btnChangeFam = container.querySelector('#btn-change-family');
    if (btnChangeFam) {
      btnChangeFam.addEventListener('click', () => {
        selectedFamId = null;
        targetFamily = null;
        editingPatient = null;
        isRedirectFromHeadReg = false;
        renderView();
      });
    }

    // Wire Search Input
    const searchInput = container.querySelector('#member-search-family-input');
    const suggestionsContainer = container.querySelector('#family-search-suggestions-container');

    if (searchInput && suggestionsContainer) {
      function updateSearchResults() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
          const allFams = Object.values(db.families || {}).slice(0, 5);
          if (allFams.length === 0) {
            suggestionsContainer.innerHTML = `
              <div style="background: rgba(239,68,68,0.06); border: 1.5px dashed var(--danger); border-radius: var(--radius-md); padding: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div style="color: var(--danger); font-size: 24px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div style="font-size: 14px; font-weight: 700; color: var(--danger);">No registered families found in database</div>
                <div style="font-size: 12px; color: var(--text-muted);">Please register a family head first before adding members.</div>
                <button type="button" id="btn-goto-family-reg" class="cms-btn cms-btn-primary" style="font-size: 12px; padding: 7px 16px; margin-top: 4px;">
                  <i class="fa-solid fa-user-plus"></i> Register Family Head
                </button>
              </div>
            `;
            const btnGo = suggestionsContainer.querySelector('#btn-goto-family-reg');
            if (btnGo) {
              btnGo.addEventListener('click', () => {
                if (onGoToFamilyReg) onGoToFamilyReg();
              });
            }
            return;
          }

          suggestionsContainer.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px;">
              Recent Families (Click to Select):
            </div>
            ${allFams
              .map((f) => {
                const fid = f.famId || f.id;
                const memberCount = Object.keys(f.patients || {}).length;
                return `
              <div class="cms-card cms-clickable family-select-item" data-famid="${fid}" style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); margin-bottom: 4px; border-radius: 8px; transition: all 0.15s ease;">
                <div>
                  <div style="font-weight: 800; font-size: 13.5px; color: var(--text);">${f.headName}</div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                    ${f.society ? `<b>${f.society}</b> &middot; ` : ''}${f.area || 'No Area'} &middot; ${memberCount} Member(s) &middot; <i class="fa-solid fa-phone" style="font-size: 10px;"></i> ${f.phone || 'N/A'}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="cms-pill cms-badge-paid font-mono" style="font-size: 11px;">FAM ${fid}</span>
                  <i class="fa-solid fa-arrow-right" style="color: var(--primary);"></i>
                </div>
              </div>
            `;
              })
              .join('')}
          `;

          suggestionsContainer.querySelectorAll('.family-select-item').forEach((item) => {
            item.addEventListener('click', () => {
              const fid = item.getAttribute('data-famid');
              selectedFamId = fid;
              targetFamily = db.families?.[fid] || Object.values(db.families || {}).find(f => f.famId === fid || f.id === fid);
              renderView();
            });
          });
          return;
        }

        // Filter families by query
        const allFams = Object.values(db.families || {});
        const matches = allFams.filter((f) => {
          const fid = (f.famId || f.id || '').toLowerCase();
          const name = (f.headName || '').toLowerCase();
          const society = (f.society || '').toLowerCase();
          const area = (f.area || '').toLowerCase();
          const phone = (f.phone || '').toLowerCase();
          return fid.includes(query) || name.includes(query) || society.includes(query) || area.includes(query) || phone.includes(query);
        });

        if (matches.length === 0) {
          suggestionsContainer.innerHTML = `
            <div style="background: rgba(239,68,68,0.06); border: 1.5px dashed var(--danger); border-radius: var(--radius-md); padding: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 4px;">
              <div style="color: var(--danger); font-size: 24px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
              <div style="font-size: 14px; font-weight: 700; color: var(--danger);">Family head not exists</div>
              <div style="font-size: 12px; color: var(--text-muted);">No family found matching "<b>${query}</b>". Please register family head first.</div>
              <button type="button" id="btn-goto-family-reg" class="cms-btn cms-btn-primary" style="font-size: 12px; padding: 7px 16px; margin-top: 4px;">
                <i class="fa-solid fa-user-plus"></i> Register Family Head
              </button>
            </div>
          `;
          const btnGo = suggestionsContainer.querySelector('#btn-goto-family-reg');
          if (btnGo) {
            btnGo.addEventListener('click', () => {
              if (onGoToFamilyReg) onGoToFamilyReg();
            });
          }
        } else {
          suggestionsContainer.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 2px;">
              Matching Families (${matches.length}):
            </div>
            ${matches
              .map((f) => {
                const fid = f.famId || f.id;
                const memberCount = Object.keys(f.patients || {}).length;
                return `
              <div class="cms-card cms-clickable family-select-item" data-famid="${fid}" style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); margin-bottom: 4px; border-radius: 8px; transition: all 0.15s ease;">
                <div>
                  <div style="font-weight: 800; font-size: 13.5px; color: var(--text);">${f.headName}</div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                    ${f.society ? `<b>${f.society}</b> &middot; ` : ''}${f.area || 'No Area'} &middot; ${memberCount} Member(s) &middot; <i class="fa-solid fa-phone" style="font-size: 10px;"></i> ${f.phone || 'N/A'}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="cms-pill cms-badge-paid font-mono" style="font-size: 11px;">FAM ${fid}</span>
                  <i class="fa-solid fa-arrow-right" style="color: var(--primary);"></i>
                </div>
              </div>
            `;
              })
              .join('')}
          `;

          suggestionsContainer.querySelectorAll('.family-select-item').forEach((item) => {
            item.addEventListener('click', () => {
              const fid = item.getAttribute('data-famid');
              selectedFamId = fid;
              targetFamily = db.families?.[fid] || Object.values(db.families || {}).find(f => f.famId === fid || f.id === fid);
              renderView();
            });
          });
        }
      }

      searchInput.addEventListener('input', updateSearchResults);
      updateSearchResults();
    }

    // Wire Form Submission
    const memberForm = container.querySelector('#form-add-member');
    if (memberForm) {
      const nameInput = container.querySelector('#member-name-input');
      const relInput = container.querySelector('#member-rel-input');
      const ageInput = container.querySelector('#member-age-input');
      const bloodInput = container.querySelector('#member-blood-input');
      const allergyInput = container.querySelector('#member-allergy-input');
      const societyInput = container.querySelector('#member-society-input');
      const areaInput = container.querySelector('#member-area-input');
      const phoneInput = container.querySelector('#member-phone-input');

      nameInput.addEventListener('input', (e) => {
        nameInput.value = e.target.value.replace(/,/g, ' ').replace(/\s+/g, ' ').toUpperCase();
      });

      memberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const famId = selectedFamId;
        const name = nameInput.value.trim().toUpperCase();
        const relation = relInput.value.trim();
        const age = ageInput.value.trim();
        const bloodGroup = bloodInput.value;
        const allergy = allergyInput.value.trim();
        const society = societyInput.value.trim();
        const area = areaInput.value.trim();
        const phone = phoneInput.value.trim();

        if (!famId) {
          showToast('Please select a family head first', 'error');
          return;
        }
        if (!name) {
          showToast('Please enter member name', 'error');
          return;
        }

        // Auto-Learn new datalist values with Doctor-Friendly popups
        // Calling addSharedMasterItem natively handles duplicates within the shared catalogue. 
        // We run it universally to forcefully migrate legacy local `customX` into the global shared collections!
        if (relation) {
          addSharedMasterItem('relations', { id: `r_${Date.now()}`, name: relation, category: 'General', createdAt: todayISO() }, db);
        }
        if (society) {
          addSharedMasterItem('societies', { id: `s_${Date.now()}`, name: society, area: '', createdAt: todayISO() }, db);
        }
        if (area) {
          addSharedMasterItem('areas', { id: `a_${Date.now()}`, name: area, city: '', pincode: '', createdAt: todayISO() }, db);
        }
        if (allergy) {
          addSharedMasterItem('allergies', { id: `al_${Date.now()}`, name: allergy, category: 'General', severity: 'None', createdAt: todayISO() }, db);
        }

        if (editingPatient) {
          // Editing existing patient
          editingPatient.name = name;
          editingPatient.relation = relation;
          editingPatient.age = age;
          editingPatient.bloodGroup = bloodGroup;
          editingPatient.allergy = allergy;
          editingPatient.society = society;
          editingPatient.area = area;
          editingPatient.phone = phone;

          // If this patient is Head, also keep family meta synced
          if (editingPatient.relation === 'Head' || relation === 'Head') {
            if (targetFamily) {
              targetFamily.headName = name;
              targetFamily.society = society;
              targetFamily.area = area;
              targetFamily.phone = phone;
            }
          }

          saveLocalDB(db, clinicId);
          showToast(`✨ Details for "${name}" updated successfully!`);

          if (onSelectPatient) {
            onSelectPatient(famId, editingPatient.id || editingPatient.patId);
          }
          return;
        }

        // New member addition
        let createdPatId = null;
        try {
          const res = await apiFetch('/patients/member', {
            method: 'POST',
            body: {
              familyId: famId,
              name,
              relation,
              age,
              bloodGroup,
              allergy,
              society,
              area,
              phone,
            },
          });
          if (res && res.success && res.data) {
            createdPatId = res.data.patId || res.data.id;
          }
        } catch (err) {
          console.warn('Backend API member create error, continuing with local DB', err);
        }

        const famSeqCode = (famId || '').slice(-4) || '0001';
        const nextMemberSeq = pad((db.families[famId]?.patients ? Object.keys(db.families[famId].patients).length : 0) + 1, 4);
        const finalPatId = createdPatId || `${famSeqCode}${nextMemberSeq}`;

        const pat = {
          id: finalPatId,
          patId: finalPatId,
          familyId: famId,
          name,
          relation,
          age,
          bloodGroup,
          allergy,
          society,
          area,
          phone,
          visits: [],
        };

        if (!db.counters) db.counters = { family: 0, patient: 0, visit: 0 };
        db.counters.patient = (db.counters.patient || 0) + 1;

        if (db.families && db.families[famId]) {
          if (!db.families[famId].patients) db.families[famId].patients = {};
          db.families[famId].patients[finalPatId] = pat;
        }
        saveLocalDB(db, clinicId);

        showToast(`${name} added to Family ${famId}!`);
        memberForm.reset();

        if (onSelectPatient) {
          onSelectPatient(famId, finalPatId);
        }
      });
    }
  }

  function getKnownRelations(db) {
    const defaultRelations = ['Head', 'Wife', 'Husband', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Other'];
    const rels = new Set(defaultRelations);
    (db.customRelations || []).forEach(r => rels.add(r.trim()));
    const normalized = new Set();
    rels.forEach(r => normalized.add(r.toLowerCase()));
    return normalized;
  }

  function getKnownSocieties(db) {
    const shared = getSharedMasterCollection('societies').map(s => s.name.trim());
    const socs = new Set(shared);
    (db.customSocieties || []).forEach(s => socs.add(s.trim()));
    (db.masterSocieties || []).forEach(s => socs.add(s.name.trim()));
    const normalized = new Set();
    socs.forEach(s => normalized.add(s.toLowerCase()));
    return normalized;
  }

  function getKnownAreas(db) {
    const shared = getSharedMasterCollection('areas').map(a => a.name.trim());
    const areas = new Set(shared);
    (db.customAreas || []).forEach(a => areas.add(a.trim()));
    (db.masterAreas || []).forEach(a => areas.add(a.name.trim()));
    const normalized = new Set();
    areas.forEach(a => normalized.add(a.toLowerCase()));
    return normalized;
  }

  function getKnownAllergies(db) {
    const shared = getSharedMasterCollection('allergies').map(a => a.name.trim());
    const als = new Set(shared);
    (db.customAllergies || []).forEach(a => als.add(a.trim()));
    (db.masterAllergies || []).forEach(a => als.add(a.name.trim()));
    const normalized = new Set();
    als.forEach(a => normalized.add(a.toLowerCase()));
    return normalized;
  }

  function renderMemberDatalists(db) {
    let dlRel = document.getElementById('dl-relation-list');
    if (!dlRel) {
      dlRel = document.createElement('datalist');
      dlRel.id = 'dl-relation-list';
      document.body.appendChild(dlRel);
    }
    const sharedRels = getSharedMasterCollection('relations').map(r => r.name);
    const allRels = [...sharedRels, ...(db.customRelations || [])];
    dlRel.innerHTML = Array.from(new Set(allRels)).map(r => `<option value="${r}"></option>`).join('');

    let dlSoc = document.getElementById('dl-member-society-list');
    if (!dlSoc) {
      dlSoc = document.createElement('datalist');
      dlSoc.id = 'dl-member-society-list';
      document.body.appendChild(dlSoc);
    }
    const sharedSocs = getSharedMasterCollection('societies').map(s => s.name);
    const allSocs = [...sharedSocs, ...(db.customSocieties || []), ...(db.masterSocieties || []).map(s => s.name)];
    dlSoc.innerHTML = Array.from(new Set(allSocs)).map(s => `<option value="${s}"></option>`).join('');

    let dlArea = document.getElementById('dl-member-area-list');
    if (!dlArea) {
      dlArea = document.createElement('datalist');
      dlArea.id = 'dl-member-area-list';
      document.body.appendChild(dlArea);
    }
    const sharedAreas = getSharedMasterCollection('areas').map(a => a.name);
    const allAreas = [...sharedAreas, ...(db.customAreas || []), ...(db.masterAreas || []).map(a => a.name)];
    dlArea.innerHTML = Array.from(new Set(allAreas)).map(a => `<option value="${a}"></option>`).join('');

    let dlAllergy = document.getElementById('dl-member-allergy-list');
    if (!dlAllergy) {
      dlAllergy = document.createElement('datalist');
      dlAllergy.id = 'dl-member-allergy-list';
      document.body.appendChild(dlAllergy);
    }
    const sharedAllergies = getSharedMasterCollection('allergies').map(a => a.name);
    const allAllergies = [...sharedAllergies, ...(db.customAllergies || []), ...(db.masterAllergies || []).map(a => a.name)];
    dlAllergy.innerHTML = Array.from(new Set(allAllergies)).map(a => `<option value="${a}"></option>`).join('');
  }

  // Initial render
  renderView();
}
