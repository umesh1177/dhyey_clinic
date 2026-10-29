/**
 * =========================================================
 * CLINICAL MASTER DATA MANAGEMENT CONTROLLER
 * Dietary Suggestions, Clinical Complaints, Lab Investigations,
 * Area/Locations, Medicine Catalogue, Known Allergies,
 * Relation Hierarchy, Society/Flat, and Keyboard Shortcuts Masters
 *
 * Features:
 * - All Add/Edit forms open in sleek Modal dialogs
 * - Fixed-height Data Table Box with smooth internal record scrolling
 * - Page Size selector (20, 50, 100, View All - View All selected by default)
 * - Next / Previous pagination controls
 * - Compact column spacing to eliminate large gaps
 * - Real-time instant search filtering across all tabs
 * =========================================================
 */

import { apiFetch, getLocalDB, saveLocalDB, getAuthSession, todayISO, fmtDate, showToast, getSharedMasterCollection, saveSharedMasterCollection, addSharedMasterItem, updateSharedMasterItem, deleteSharedMasterItem } from './api.js';

export const AVAILABLE_SHORTCUT_TARGETS = [
  // --- Navigation Tabs ---
  { category: 'Navigation', title: 'Clinical Dashboard', target: 'dashboard', keyHint: 'F4' },
  { category: 'Navigation', title: 'Family Head Registration', target: 'family', keyHint: 'F1' },
  { category: 'Navigation', title: 'Add Family Member / Patient', target: 'patient', keyHint: 'F2' },
  { category: 'Navigation', title: 'Patient Record & Case Consultation', target: 'case', keyHint: 'F3' },
  { category: 'Navigation', title: 'Billing & Cash Counter', target: 'billing', keyHint: 'Alt+B' },
  { category: 'Navigation', title: 'Inventory & Pharmacy Stock', target: 'inventory', keyHint: 'Alt+I' },
  { category: 'Navigation', title: 'Medicine Directory List', target: 'medicines', keyHint: 'Alt+M' },
  { category: 'Navigation', title: 'Medical Certificate Generator', target: 'certificates', keyHint: 'F6' },
  { category: 'Navigation', title: 'Follow-up Tracker', target: 'followups', keyHint: 'Alt+U' },
  { category: 'Navigation', title: 'Clinical Reports & Analytics', target: 'reports', keyHint: 'F5' },
  { category: 'Navigation', title: 'Send Complaint & Feedback Helpdesk', target: 'feedback', keyHint: 'F8' },
  { category: 'Navigation', title: 'Clinical Master Data Setup', target: 'masters', keyHint: 'F7' },

  // --- Master Data Sub-Tabs ---
  { category: 'Navigation', title: 'Master Tab: Dietary Suggestions', target: 'master_dietary', keyHint: 'Alt+1' },
  { category: 'Navigation', title: 'Master Tab: Complaints', target: 'master_complaints', keyHint: 'Alt+2' },
  { category: 'Navigation', title: 'Master Tab: Investigations', target: 'master_investigations', keyHint: 'Alt+3' },
  { category: 'Navigation', title: 'Master Tab: Area / Location', target: 'master_areas', keyHint: 'Alt+4' },
  { category: 'Navigation', title: 'Master Tab: Medicine Catalogue', target: 'master_medicines', keyHint: 'Alt+5' },
  { category: 'Navigation', title: 'Master Tab: Known Allergies', target: 'master_allergies', keyHint: 'Alt+6' },
  { category: 'Navigation', title: 'Master Tab: Relation to Head', target: 'master_relations', keyHint: 'Alt+7' },
  { category: 'Navigation', title: 'Master Tab: Society / Flat', target: 'master_societies', keyHint: 'Alt+8' },
  { category: 'Navigation', title: 'Master Tab: Navigation Shortcuts', target: 'master_shortcuts', keyHint: 'Alt+9' },

  // --- Form & Modal Openers (Buttons without default shortcut or customizable) ---
  { category: 'Form', title: '+ Open New Patient Case Entry Form', target: 'open_new_case', keyHint: 'Alt+N' },
  { category: 'Form', title: '+ Open Add Family Head Form', target: 'open_add_family', keyHint: 'Alt+H' },
  { category: 'Form', title: '+ Open Add Family Member Form', target: 'open_add_member', keyHint: 'Alt+M' },
  { category: 'Form', title: '+ Open Add Dietary Suggestion Modal', target: 'open_add_dietary', keyHint: 'Alt+D' },
  { category: 'Form', title: '+ Open Add Clinical Complaint Modal', target: 'open_add_complaint', keyHint: 'Alt+C' },
  { category: 'Form', title: '+ Open Add Lab Investigation Modal', target: 'open_add_investigation', keyHint: 'Alt+L' },
  { category: 'Form', title: '+ Open Add Area / Locality Modal', target: 'open_add_area', keyHint: 'Alt+R' },
  { category: 'Form', title: '+ Open Add Medicine Modal', target: 'open_add_medicine', keyHint: 'Alt+E' },
  { category: 'Form', title: '+ Open Add Known Allergy Modal', target: 'open_add_allergy', keyHint: 'Alt+Y' },
  { category: 'Form', title: '+ Open Add Relation to Head Modal', target: 'open_add_relation', keyHint: 'Alt+T' },
  { category: 'Form', title: '+ Open Add Society / Flat Modal', target: 'open_add_society', keyHint: 'Alt+O' },
  { category: 'Form', title: '+ Open Add Navigation Shortcut Modal', target: 'open_add_shortcut', keyHint: 'Alt+K' },
  { category: 'Form', title: '+ Open Attach Lab Report Photos Modal', target: 'open_attach_lab', keyHint: 'Alt+P' },

  // --- Clinical Actions & Button Triggers ---
  { category: 'Action', title: 'Quick Global Search (Focus Top Search)', target: 'quick_search', keyHint: '/' },
  { category: 'Action', title: 'Print Prescription Preview Modal', target: 'print_prescription', keyHint: 'Ctrl+P' },
  { category: 'Action', title: 'Save / Submit Current Case Record', target: 'submit_case', keyHint: 'Ctrl+S' },
  { category: 'Action', title: 'Close Modal / Unfocus / Cancel Drawer', target: 'close_modal', keyHint: 'Esc' },
  { category: 'Action', title: 'Toggle Light / Dark Theme Mode', target: 'toggle_theme', keyHint: 'Alt+T' },
];

export function renderMastersView(container) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';
  const db = getLocalDB(clinicId);

  // Ensure clinic-specific structures exist in db
  if (!db.dietary) db.dietary = {};
  if (!db.clinicShortcuts) {
    db.clinicShortcuts = {
      medicines: {},
      complaints: {},
      investigations: {},
      allergies: {},
      relations: {},
      areas: {},
      societies: {},
    };
  }
  if (!db.customShortcuts || db.customShortcuts.length === 0) {
    db.customShortcuts = [
      { id: 'sc1', key: 'F1', target: 'family', title: 'Family Head Registration', category: 'Navigation' },
      { id: 'sc2', key: 'F2', target: 'patient', title: 'Add Family Member', category: 'Navigation' },
      { id: 'sc3', key: 'F3', target: 'case', title: 'Patient Record & Case', category: 'Navigation' },
      { id: 'sc4', key: 'F4', target: 'dashboard', title: 'Clinical Dashboard', category: 'Navigation' },
      { id: 'sc5', key: 'F5', target: 'reports', title: 'Clinical Reports', category: 'Navigation' },
      { id: 'sc6', key: 'F6', target: 'certificates', title: 'Medical Certificate', category: 'Navigation' },
      { id: 'sc7', key: 'F7', target: 'masters', title: 'Master Data Setup', category: 'Navigation' },
      { id: 'sc8', key: '/', target: 'quick_search', title: 'Quick Global Search', category: 'Action' },
      { id: 'sc9', key: 'Alt+N', target: 'open_new_case', title: '+ Open New Case Form', category: 'Form' },
      { id: 'sc10', key: 'Esc', target: 'close_modal', title: 'Close Modal / Unfocus', category: 'Action' },
    ];
  }

  // Ensure persistent IDs on custom shortcuts
  (db.customShortcuts || []).forEach((sc, idx) => {
    if (!sc.id) sc.id = `sc_${idx + 1}_${(sc.key || '').toLowerCase()}`;
  });
  saveLocalDB(db, clinicId);

  // Active sub-tab state: 'dietary' | 'complaints' | 'investigations' | 'areas' | 'medicines' | 'allergies' | 'relations' | 'societies' | 'shortcuts'
  let activeTab = 'dietary';
  let searchQuery = '';
  let pageSize = 'all'; // Default: View All
  let currentPage = 1;

  function renderView() {
    container.innerHTML = `
      <div class="cms-master-container">
        
        <!-- Header Banner -->
        <div class="cms-card" style="padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: linear-gradient(135deg, var(--surface), rgba(15, 81, 50, 0.04)); border: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: #0f5132; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: var(--shadow-sm);">
              <i class="fa-solid fa-layer-group"></i>
            </div>
            <div>
              <h1 class="font-display" style="font-size: 17px; font-weight: 800; margin: 0; color: var(--text);">Clinical Master Data &amp; Shortcuts</h1>
              <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">Manage shared clinical master catalogues, clinic-specific shortcuts, and navigation hotkeys.</p>
            </div>
          </div>
          <span class="cms-pill cms-badge-paid font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132;">
            <i class="fa-solid fa-database"></i> Auto-Synced Master
          </span>
        </div>

        <!-- 2-Row Wrapping Sub-Navigation Tabs Bar (No horizontal scrolling) -->
        <div class="cms-master-tabs-nav" id="master-tabs-bar">
          <button type="button" class="cms-master-tab-btn ${activeTab === 'dietary' ? 'active' : ''}" data-tab="dietary">
            <i class="fa-solid fa-utensils"></i>
            <span>Dietary Suggestions</span>
            <span class="cms-pill" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.08);">${Object.keys(db.dietary || {}).length}</span>
          </button>
          
          <button type="button" class="cms-master-tab-btn ${activeTab === 'complaints' ? 'active' : ''}" data-tab="complaints">
            <i class="fa-solid fa-notes-medical"></i>
            <span>Complaints</span>
            <span class="cms-pill" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.08);">${getSharedMasterCollection('complaints').length}</span>
          </button>

          <button type="button" class="cms-master-tab-btn ${activeTab === 'investigations' ? 'active' : ''}" data-tab="investigations">
            <i class="fa-solid fa-flask-vial"></i>
            <span>Investigations (Reports)</span>
            <span class="cms-pill" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.08);">${getSharedMasterCollection('investigations').length}</span>
          </button>

          <button type="button" class="cms-master-tab-btn ${activeTab === 'areas' ? 'active' : ''}" data-tab="areas">
            <i class="fa-solid fa-map-location-dot"></i>
            <span>Area / Location</span>
            <span class="cms-pill" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.08);">${getSharedMasterCollection('areas').length}</span>
          </button>

          <button type="button" class="cms-master-tab-btn ${activeTab === 'medicines' ? 'active' : ''}" data-tab="medicines">
            <i class="fa-solid fa-pills"></i>
            <span>Medicine Catalogue</span>
            <span class="cms-pill" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.08);">${getSharedMasterCollection('medicines').length}</span>
          </button>

          <button type="button" class="cms-master-tab-btn ${activeTab === 'allergies' ? 'active' : ''}" data-tab="allergies">
            <i class="fa-solid fa-shield-virus"></i>
            <span>Known Allergies</span>
            <span class="cms-pill" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.08);">${getSharedMasterCollection('allergies').length}</span>
          </button>

          <button type="button" class="cms-master-tab-btn ${activeTab === 'relations' ? 'active' : ''}" data-tab="relations">
            <i class="fa-solid fa-people-arrows"></i>
            <span>Relation to Head</span>
            <span class="cms-pill" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.08);">${getSharedMasterCollection('relations').length}</span>
          </button>

          <button type="button" class="cms-master-tab-btn ${activeTab === 'societies' ? 'active' : ''}" data-tab="societies">
            <i class="fa-solid fa-building"></i>
            <span>Society / Flat</span>
            <span class="cms-pill" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.08);">${getSharedMasterCollection('societies').length}</span>
          </button>

          <button type="button" class="cms-master-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}" data-tab="shortcuts">
            <i class="fa-solid fa-keyboard"></i>
            <span>Navigation Shortcuts</span>
            <span class="cms-pill" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.08);">${(db.customShortcuts || []).length}</span>
          </button>
        </div>

        <!-- Master Data Content (Fixed Height Card with Internal Scroll & Pagination) -->
        <div id="master-tab-content">
          ${renderActiveTabContent()}
        </div>
      </div>
    `;

    attachTabEventListeners();
  }

  function renderActiveTabContent() {
    if (activeTab === 'dietary') return renderDietaryTab();
    if (activeTab === 'complaints') return renderComplaintsTab();
    if (activeTab === 'investigations') return renderInvestigationsTab();
    if (activeTab === 'areas') return renderAreasTab();
    if (activeTab === 'medicines') return renderMedicinesTab();
    if (activeTab === 'allergies') return renderAllergiesTab();
    if (activeTab === 'relations') return renderRelationsTab();
    if (activeTab === 'societies') return renderSocietiesTab();
    if (activeTab === 'shortcuts') return renderShortcutsTab();
    return '';
  }

  // Generic pagination helper
  function paginateItems(items) {
    const total = items.length;
    if (pageSize === 'all') {
      return {
        pagedList: items,
        totalPages: 1,
        currentPage: 1,
        startIdx: 0,
        endIdx: total,
        total,
      };
    }

    const num = Number(pageSize);
    const totalPages = Math.max(1, Math.ceil(total / num));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * num;
    const endIdx = Math.min(startIdx + num, total);
    const pagedList = items.slice(startIdx, endIdx);

    return {
      pagedList,
      totalPages,
      currentPage,
      startIdx,
      endIdx,
      total,
    };
  }

  function renderPaginationBar(paginationInfo) {
    const { total, startIdx, endIdx, totalPages, currentPage } = paginationInfo;
    const showingText = total === 0 ? 'No records' : `Showing ${startIdx + 1} to ${endIdx} of ${total} entries`;

    return `
      <div class="cms-master-pagination-bar">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>${showingText}</span>
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            <label for="master-page-size" style="font-size: 11.5px; color: var(--text-muted);">Rows per page:</label>
            <select id="master-page-size" class="cms-input cms-input-sm" style="padding: 2px 6px; font-size: 11.5px; width: auto; height: 28px; border-radius: 6px;">
              <option value="20" ${pageSize === '20' ? 'selected' : ''}>20</option>
              <option value="50" ${pageSize === '50' ? 'selected' : ''}>50</option>
              <option value="100" ${pageSize === '100' ? 'selected' : ''}>100</option>
              <option value="all" ${pageSize === 'all' ? 'selected' : ''}>View All</option>
            </select>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" id="btn-master-prev" class="cms-page-btn" ${currentPage <= 1 || pageSize === 'all' ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i> Prev
          </button>
          <span style="font-weight: 700; font-size: 11.5px; padding: 0 4px;">
            Page ${currentPage} of ${totalPages}
          </span>
          <button type="button" id="btn-master-next" class="cms-page-btn" ${currentPage >= totalPages || pageSize === 'all' ? 'disabled' : ''}>
            Next <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================
  // TAB 1: DIETARY SUGGESTIONS
  // ==========================================
  function renderDietaryTab() {
    const list = Object.values(db.dietary || {}).map((item, idx) => ({
      seq: idx + 1,
      id: item.id || item.code,
      code: item.code,
      eat: item.eat || '',
      avoid: item.avoid || '',
      createdAt: item.createdAt || todayISO(),
    }));

    const filtered = list.filter((d) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (d.code || '').toLowerCase().includes(q) ||
        (d.eat || '').toLowerCase().includes(q) ||
        (d.avoid || '').toLowerCase().includes(q)
      );
    });

    const pag = paginateItems(filtered);

    return `
      <div class="cms-master-table-card">
        <!-- Top Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cms-card-title" style="font-size: 15px; font-weight: 800; color: #0f5132;">Dietary Suggestion Templates</div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132; font-weight: 800;">${list.length} Templates</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; min-width: 240px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 11px;"></i>
              <input type="text" id="master-search-input" class="cms-input cms-input-sm" style="padding-left: 30px; font-size: 12px; height: 32px;" placeholder="Search shortcut or food items..." value="${searchQuery}" autocomplete="off" />
            </div>

            <button type="button" class="cms-btn cms-btn-primary btn-open-add-modal" data-type="dietary" style="background: #0f5132; border-color: #0f5132; padding: 6px 14px; font-size: 12px; font-weight: 700; height: 32px;">
              <i class="fa-solid fa-plus"></i> Add Dietary Suggestion
            </button>
          </div>
        </div>

        <!-- Fixed Height Scrollable Table -->
        <div class="cms-master-table-scroll">
          <table class="cms-table cms-compact-table" id="master-data-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th style="width: 120px;">Shortcut Code</th>
                <th>Recommended (What to Eat)</th>
                <th>Restricted (What NOT to Eat)</th>
                <th style="width: 100px;">Added On</th>
                <th style="width: 80px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                pag.pagedList.length === 0
                  ? `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">No dietary suggestions found.</td></tr>`
                  : pag.pagedList
                      .map(
                        (d, i) => `
                    <tr>
                      <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${pag.startIdx + i + 1}</td>
                      <td>
                        <span class="cms-kbd font-mono" style="font-size: 11px; font-weight: 800; padding: 2px 7px; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;">
                          ${d.code}
                        </span>
                      </td>
                      <td style="color: #065f46; font-size: 12px;">
                        <i class="fa-solid fa-circle-check" style="font-size: 10px; margin-right: 4px; color: #10b981;"></i>
                        <span>${d.eat || '—'}</span>
                      </td>
                      <td style="color: #991b1b; font-size: 12px;">
                        <i class="fa-solid fa-ban" style="font-size: 10px; margin-right: 4px; color: #ef4444;"></i>
                        <span>${d.avoid || '—'}</span>
                      </td>
                      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${fmtDate(d.createdAt)}</td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button type="button" class="cms-btn-ghost btn-edit-item" data-type="dietary" data-id="${d.id || d.code}" data-code="${d.code}" data-name="${encodeURIComponent(d.code || '')}" style="padding: 3px 6px; font-size: 12px; color: #0284c7;" title="Edit Template">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button type="button" class="cms-btn-ghost btn-delete-item" data-type="dietary" data-id="${d.id || d.code}" data-code="${d.code}" data-name="${encodeURIComponent(d.code || '')}" style="padding: 3px 6px; font-size: 12px; color: #dc2626;" title="Delete Template">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        ${renderPaginationBar(pag)}
      </div>
    `;
  }

  // ==========================================
  // TAB 2: CLINICAL COMPLAINTS / SYMPTOMS
  // ==========================================
  function renderComplaintsTab() {
    const shared = getSharedMasterCollection('complaints');
    const list = shared.map((item, idx) => {
      const code = db.clinicShortcuts?.complaints?.[item.name] || db.clinicShortcuts?.complaints?.[item.id] || '';
      return {
        seq: idx + 1,
        id: item.id || `c_${idx + 1}`,
        code,
        name: item.name,
        createdAt: item.createdAt || todayISO(),
      };
    });

    const filtered = list.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q);
    });

    const pag = paginateItems(filtered);

    return `
      <div class="cms-master-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cms-card-title" style="font-size: 15px; font-weight: 800; color: #0f5132;">All Clinical Complaints &amp; Symptoms</div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132; font-weight: 800;">${list.length} Complaints</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; min-width: 240px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 11px;"></i>
              <input type="text" id="master-search-input" class="cms-input cms-input-sm" style="padding-left: 30px; font-size: 12px; height: 32px;" placeholder="Search complaint name or code..." value="${searchQuery}" autocomplete="off" />
            </div>

            <button type="button" class="cms-btn cms-btn-primary btn-open-add-modal" data-type="complaints" style="background: #0f5132; border-color: #0f5132; padding: 6px 14px; font-size: 12px; font-weight: 700; height: 32px;">
              <i class="fa-solid fa-plus"></i> Add Complaint
            </button>
          </div>
        </div>

        <div class="cms-master-table-scroll">
          <table class="cms-table cms-compact-table" id="master-data-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th style="width: 130px;">Shortcut / Code</th>
                <th>Complaint / Symptom Full Name</th>
                <th style="width: 110px;">Added On</th>
                <th style="width: 80px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                pag.pagedList.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No clinical complaints found.</td></tr>`
                  : pag.pagedList
                      .map(
                        (c, i) => `
                    <tr>
                      <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${pag.startIdx + i + 1}</td>
                      <td>
                        <span class="cms-kbd font-mono" style="font-size: 11px; font-weight: 800; padding: 2px 7px; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0;">
                          ${c.code || '-'}
                        </span>
                      </td>
                      <td style="font-weight: 700; color: var(--text); font-size: 12.5px;">${c.name}</td>
                      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${fmtDate(c.createdAt)}</td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button type="button" class="cms-btn-ghost btn-edit-item" data-type="complaints" data-id="${c.id}" data-code="${c.code || ''}" data-name="${encodeURIComponent(c.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #0284c7;" title="Edit Complaint">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button type="button" class="cms-btn-ghost btn-delete-item" data-type="complaints" data-id="${c.id}" data-code="${c.code || ''}" data-name="${encodeURIComponent(c.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #dc2626;" title="Delete Complaint">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        ${renderPaginationBar(pag)}
      </div>
    `;
  }

  // ==========================================
  // TAB 3: LAB INVESTIGATIONS (REPORTS)
  // ==========================================
  function renderInvestigationsTab() {
    const shared = getSharedMasterCollection('investigations');
    const list = shared.map((item, idx) => {
      const code = db.clinicShortcuts?.investigations?.[item.name] || db.clinicShortcuts?.investigations?.[item.id] || '';
      return {
        seq: idx + 1,
        id: item.id || `inv_${idx + 1}`,
        code,
        name: item.name,
        createdAt: item.createdAt || todayISO(),
      };
    });

    const filtered = list.filter((inv) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (inv.name || '').toLowerCase().includes(q) || (inv.code || '').toLowerCase().includes(q);
    });

    const pag = paginateItems(filtered);

    return `
      <div class="cms-master-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cms-card-title" style="font-size: 15px; font-weight: 800; color: #0f5132;">Laboratory &amp; Diagnostic Investigations</div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132; font-weight: 800;">${list.length} Tests</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; min-width: 240px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 11px;"></i>
              <input type="text" id="master-search-input" class="cms-input cms-input-sm" style="padding-left: 30px; font-size: 12px; height: 32px;" placeholder="Search test name or code..." value="${searchQuery}" autocomplete="off" />
            </div>

            <button type="button" class="cms-btn cms-btn-primary btn-open-add-modal" data-type="investigations" style="background: #0f5132; border-color: #0f5132; padding: 6px 14px; font-size: 12px; font-weight: 700; height: 32px;">
              <i class="fa-solid fa-plus"></i> Add Investigation
            </button>
          </div>
        </div>

        <div class="cms-master-table-scroll">
          <table class="cms-table cms-compact-table" id="master-data-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th style="width: 130px;">Shortcut / Code</th>
                <th>Investigation / Lab Test Full Name</th>
                <th style="width: 110px;">Added On</th>
                <th style="width: 80px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                pag.pagedList.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No lab investigations found.</td></tr>`
                  : pag.pagedList
                      .map(
                        (inv, i) => `
                    <tr>
                      <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${pag.startIdx + i + 1}</td>
                      <td>
                        <span class="cms-kbd font-mono" style="font-size: 11px; font-weight: 800; padding: 2px 7px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">
                          ${inv.code || '-'}
                        </span>
                      </td>
                      <td style="font-weight: 700; color: var(--text); font-size: 12.5px;">${inv.name}</td>
                      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${fmtDate(inv.createdAt)}</td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button type="button" class="cms-btn-ghost btn-edit-item" data-type="investigations" data-id="${inv.id}" data-code="${inv.code || ''}" data-name="${encodeURIComponent(inv.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #0284c7;" title="Edit Investigation">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button type="button" class="cms-btn-ghost btn-delete-item" data-type="investigations" data-id="${inv.id}" data-code="${inv.code || ''}" data-name="${encodeURIComponent(inv.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #dc2626;" title="Delete Investigation">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        ${renderPaginationBar(pag)}
      </div>
    `;
  }

  // ==========================================
  // TAB 4: AREA / LOCATIONS
  // ==========================================
  function renderAreasTab() {
    const shared = getSharedMasterCollection('areas');
    const list = shared.map((item, idx) => ({
      seq: idx + 1,
      id: item.id || `a_${idx + 1}`,
      name: item.name,
      city: item.city || 'Ahmedabad',
      createdAt: item.createdAt || todayISO(),
    }));

    const filtered = list.filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (a.name || '').toLowerCase().includes(q) || (a.city || '').toLowerCase().includes(q);
    });

    const pag = paginateItems(filtered);

    return `
      <div class="cms-master-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cms-card-title" style="font-size: 15px; font-weight: 800; color: #0f5132;">Area &amp; Locality Master</div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132; font-weight: 800;">${list.length} Areas</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; min-width: 240px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 11px;"></i>
              <input type="text" id="master-search-input" class="cms-input cms-input-sm" style="padding-left: 30px; font-size: 12px; height: 32px;" placeholder="Search area name or city..." value="${searchQuery}" autocomplete="off" />
            </div>

            <button type="button" class="cms-btn cms-btn-primary btn-open-add-modal" data-type="areas" style="background: #0f5132; border-color: #0f5132; padding: 6px 14px; font-size: 12px; font-weight: 700; height: 32px;">
              <i class="fa-solid fa-plus"></i> Add Area
            </button>
          </div>
        </div>

        <div class="cms-master-table-scroll">
          <table class="cms-table cms-compact-table" id="master-data-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th>Area / Locality Name</th>
                <th style="width: 220px;">City / District</th>
                <th style="width: 110px;">Added On</th>
                <th style="width: 80px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                pag.pagedList.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No areas found.</td></tr>`
                  : pag.pagedList
                      .map(
                        (a, i) => `
                    <tr>
                      <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${pag.startIdx + i + 1}</td>
                      <td style="font-weight: 700; color: var(--text); font-size: 12.5px;">
                        <i class="fa-solid fa-location-dot" style="color: #0f5132; font-size: 11px; margin-right: 4px;"></i>
                        <span>${a.name}</span>
                      </td>
                      <td style="color: var(--text-muted); font-size: 12px;">${a.city}</td>
                      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${fmtDate(a.createdAt)}</td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button type="button" class="cms-btn-ghost btn-edit-item" data-type="areas" data-id="${a.id}" data-name="${encodeURIComponent(a.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #0284c7;" title="Edit Area">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button type="button" class="cms-btn-ghost btn-delete-item" data-type="areas" data-id="${a.id}" data-name="${encodeURIComponent(a.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #dc2626;" title="Delete Area">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        ${renderPaginationBar(pag)}
      </div>
    `;
  }

  // ==========================================
  // TAB 5: MEDICINE CATALOGUE
  // ==========================================
  function renderMedicinesTab() {
    const shared = getSharedMasterCollection('medicines');
    const list = shared.map((item, idx) => {
      const code = db.clinicShortcuts?.medicines?.[item.name] || db.clinicShortcuts?.medicines?.[item.id] || '';
      return {
        seq: idx + 1,
        id: item.id || `m_${idx + 1}`,
        code,
        name: item.name,
        createdAt: item.createdAt || todayISO(),
      };
    });

    const filtered = list.filter((m) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q);
    });

    const pag = paginateItems(filtered);

    return `
      <div class="cms-master-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cms-card-title" style="font-size: 15px; font-weight: 800; color: #0f5132;">Clinical Medicine Catalogue</div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132; font-weight: 800;">${list.length} Medicines</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; min-width: 240px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 11px;"></i>
              <input type="text" id="master-search-input" class="cms-input cms-input-sm" style="padding-left: 30px; font-size: 12px; height: 32px;" placeholder="Search medicine name or code..." value="${searchQuery}" autocomplete="off" />
            </div>

            <button type="button" class="cms-btn cms-btn-primary btn-open-add-modal" data-type="medicines" style="background: #0f5132; border-color: #0f5132; padding: 6px 14px; font-size: 12px; font-weight: 700; height: 32px;">
              <i class="fa-solid fa-plus"></i> Add Medicine
            </button>
          </div>
        </div>

        <div class="cms-master-table-scroll">
          <table class="cms-table cms-compact-table" id="master-data-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th style="width: 140px;">Shortcut Code</th>
                <th>Medicine / Brand / Generic Name</th>
                <th style="width: 110px;">Added On</th>
                <th style="width: 80px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                pag.pagedList.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No medicines found.</td></tr>`
                  : pag.pagedList
                      .map(
                        (m, i) => `
                    <tr>
                      <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${pag.startIdx + i + 1}</td>
                      <td>
                        <span class="cms-kbd font-mono" style="font-size: 11px; font-weight: 800; padding: 2px 7px; background: #e6fffa; color: #0f766e; border: 1px solid #99f6e4;">
                          ${m.code || '-'}
                        </span>
                      </td>
                      <td style="font-weight: 700; color: var(--text); font-size: 12.5px;">
                        <i class="fa-solid fa-pills" style="color: #0d9488; font-size: 11px; margin-right: 4px;"></i>
                        <span>${m.name}</span>
                      </td>
                      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${fmtDate(m.createdAt)}</td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button type="button" class="cms-btn-ghost btn-edit-item" data-type="medicines" data-id="${m.id}" data-code="${m.code || ''}" data-name="${encodeURIComponent(m.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #0284c7;" title="Edit Medicine">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button type="button" class="cms-btn-ghost btn-delete-item" data-type="medicines" data-id="${m.id}" data-code="${m.code || ''}" data-name="${encodeURIComponent(m.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #dc2626;" title="Delete Medicine">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        ${renderPaginationBar(pag)}
      </div>
    `;
  }

  // ==========================================
  // TAB 6: KNOWN ALLERGIES
  // ==========================================
  function renderAllergiesTab() {
    const shared = getSharedMasterCollection('allergies');
    const list = shared.map((item, idx) => {
      const code = db.clinicShortcuts?.allergies?.[item.name] || db.clinicShortcuts?.allergies?.[item.id] || '';
      return {
        seq: idx + 1,
        id: item.id || `al_${idx + 1}`,
        code,
        name: item.name,
        createdAt: item.createdAt || todayISO(),
      };
    });

    const filtered = list.filter((al) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (al.name || '').toLowerCase().includes(q) || (al.code || '').toLowerCase().includes(q);
    });

    const pag = paginateItems(filtered);

    return `
      <div class="cms-master-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cms-card-title" style="font-size: 15px; font-weight: 800; color: #0f5132;">Known Allergies Directory</div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132; font-weight: 800;">${list.length} Allergies</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; min-width: 240px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 11px;"></i>
              <input type="text" id="master-search-input" class="cms-input cms-input-sm" style="padding-left: 30px; font-size: 12px; height: 32px;" placeholder="Search allergy or code..." value="${searchQuery}" autocomplete="off" />
            </div>

            <button type="button" class="cms-btn cms-btn-primary btn-open-add-modal" data-type="allergies" style="background: #0f5132; border-color: #0f5132; padding: 6px 14px; font-size: 12px; font-weight: 700; height: 32px;">
              <i class="fa-solid fa-plus"></i> Add Allergy
            </button>
          </div>
        </div>

        <div class="cms-master-table-scroll">
          <table class="cms-table cms-compact-table" id="master-data-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th style="width: 140px;">Shortcut / Code</th>
                <th>Allergy / Allergen Name</th>
                <th style="width: 110px;">Added On</th>
                <th style="width: 80px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                pag.pagedList.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No allergies found.</td></tr>`
                  : pag.pagedList
                      .map(
                        (al, i) => `
                    <tr>
                      <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${pag.startIdx + i + 1}</td>
                      <td>
                        <span class="cms-kbd font-mono" style="font-size: 11px; font-weight: 800; padding: 2px 7px; background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3;">
                          ${al.code || '-'}
                        </span>
                      </td>
                      <td style="font-weight: 700; color: var(--text); font-size: 12.5px;">
                        <i class="fa-solid fa-triangle-exclamation" style="color: #e11d48; font-size: 11px; margin-right: 4px;"></i>
                        <span>${al.name}</span>
                      </td>
                      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${fmtDate(al.createdAt)}</td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button type="button" class="cms-btn-ghost btn-edit-item" data-type="allergies" data-id="${al.id}" data-code="${al.code || ''}" data-name="${encodeURIComponent(al.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #0284c7;" title="Edit Allergy">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button type="button" class="cms-btn-ghost btn-delete-item" data-type="allergies" data-id="${al.id}" data-code="${al.code || ''}" data-name="${encodeURIComponent(al.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #dc2626;" title="Delete Allergy">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        ${renderPaginationBar(pag)}
      </div>
    `;
  }

  // ==========================================
  // TAB 7: RELATION TO HEAD
  // ==========================================
  function renderRelationsTab() {
    const shared = getSharedMasterCollection('relations');
    const list = shared.map((item, idx) => {
      const code = db.clinicShortcuts?.relations?.[item.name] || db.clinicShortcuts?.relations?.[item.id] || '';
      return {
        seq: idx + 1,
        id: item.id || `r_${idx + 1}`,
        code,
        name: item.name,
        createdAt: item.createdAt || todayISO(),
      };
    });

    const filtered = list.filter((r) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (r.name || '').toLowerCase().includes(q) || (r.code || '').toLowerCase().includes(q);
    });

    const pag = paginateItems(filtered);

    return `
      <div class="cms-master-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cms-card-title" style="font-size: 15px; font-weight: 800; color: #0f5132;">Relation Hierarchy Master</div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132; font-weight: 800;">${list.length} Relations</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; min-width: 240px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 11px;"></i>
              <input type="text" id="master-search-input" class="cms-input cms-input-sm" style="padding-left: 30px; font-size: 12px; height: 32px;" placeholder="Search relation or code..." value="${searchQuery}" autocomplete="off" />
            </div>

            <button type="button" class="cms-btn cms-btn-primary btn-open-add-modal" data-type="relations" style="background: #0f5132; border-color: #0f5132; padding: 6px 14px; font-size: 12px; font-weight: 700; height: 32px;">
              <i class="fa-solid fa-plus"></i> Add Relation
            </button>
          </div>
        </div>

        <div class="cms-master-table-scroll">
          <table class="cms-table cms-compact-table" id="master-data-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th style="width: 140px;">Shortcut / Code</th>
                <th>Family Relation Name</th>
                <th style="width: 110px;">Added On</th>
                <th style="width: 80px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                pag.pagedList.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No relations found.</td></tr>`
                  : pag.pagedList
                      .map(
                        (r, i) => `
                    <tr>
                      <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${pag.startIdx + i + 1}</td>
                      <td>
                        <span class="cms-kbd font-mono" style="font-size: 11px; font-weight: 800; padding: 2px 7px; background: #fdf4ff; color: #86198f; border: 1px solid #f5d0fe;">
                          ${r.code || '-'}
                        </span>
                      </td>
                      <td style="font-weight: 700; color: var(--text); font-size: 12.5px;">
                        <i class="fa-solid fa-user-group" style="color: #a21caf; font-size: 11px; margin-right: 4px;"></i>
                        <span>${r.name}</span>
                      </td>
                      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${fmtDate(r.createdAt)}</td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button type="button" class="cms-btn-ghost btn-edit-item" data-type="relations" data-id="${r.id}" data-code="${r.code || ''}" data-name="${encodeURIComponent(r.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #0284c7;" title="Edit Relation">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button type="button" class="cms-btn-ghost btn-delete-item" data-type="relations" data-id="${r.id}" data-code="${r.code || ''}" data-name="${encodeURIComponent(r.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #dc2626;" title="Delete Relation">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        ${renderPaginationBar(pag)}
      </div>
    `;
  }

  // ==========================================
  // TAB 8: SOCIETY / FLAT
  // ==========================================
  function renderSocietiesTab() {
    const shared = getSharedMasterCollection('societies');
    const list = shared.map((item, idx) => ({
      seq: idx + 1,
      id: item.id || `s_${idx + 1}`,
      name: item.name,
      area: item.area || 'General',
      createdAt: item.createdAt || todayISO(),
    }));

    const filtered = list.filter((s) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (s.name || '').toLowerCase().includes(q) || (s.area || '').toLowerCase().includes(q);
    });

    const pag = paginateItems(filtered);

    return `
      <div class="cms-master-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cms-card-title" style="font-size: 15px; font-weight: 800; color: #0f5132;">Society &amp; Apartment Registry</div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132; font-weight: 800;">${list.length} Societies</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; min-width: 240px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 11px;"></i>
              <input type="text" id="master-search-input" class="cms-input cms-input-sm" style="padding-left: 30px; font-size: 12px; height: 32px;" placeholder="Search society or area..." value="${searchQuery}" autocomplete="off" />
            </div>

            <button type="button" class="cms-btn cms-btn-primary btn-open-add-modal" data-type="societies" style="background: #0f5132; border-color: #0f5132; padding: 6px 14px; font-size: 12px; font-weight: 700; height: 32px;">
              <i class="fa-solid fa-plus"></i> Add Society
            </button>
          </div>
        </div>

        <div class="cms-master-table-scroll">
          <table class="cms-table cms-compact-table" id="master-data-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th>Society / Complex / Flat Name</th>
                <th style="width: 200px;">Area / Locality</th>
                <th style="width: 110px;">Added On</th>
                <th style="width: 80px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                pag.pagedList.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No societies found.</td></tr>`
                  : pag.pagedList
                      .map(
                        (s, i) => `
                    <tr>
                      <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${pag.startIdx + i + 1}</td>
                      <td style="font-weight: 700; color: var(--text); font-size: 12.5px;">
                        <i class="fa-solid fa-building" style="color: #0f5132; font-size: 11px; margin-right: 4px;"></i>
                        <span>${s.name}</span>
                      </td>
                      <td>
                        <span class="cms-pill" style="font-size: 10.5px; background: rgba(0,0,0,0.04);">${s.area}</span>
                      </td>
                      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${fmtDate(s.createdAt)}</td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button type="button" class="cms-btn-ghost btn-edit-item" data-type="societies" data-id="${s.id}" data-name="${encodeURIComponent(s.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #0284c7;" title="Edit Society">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button type="button" class="cms-btn-ghost btn-delete-item" data-type="societies" data-id="${s.id}" data-name="${encodeURIComponent(s.name || '')}" style="padding: 3px 6px; font-size: 12px; color: #dc2626;" title="Delete Society">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        ${renderPaginationBar(pag)}
      </div>
    `;
  }

  // ==========================================
  // TAB 9: NAVIGATION SHORTCUTS
  // ==========================================
  function renderShortcutsTab() {
    const list = (db.customShortcuts || []).map((item, idx) => ({
      seq: idx + 1,
      id: item.id || `sc_${idx + 1}`,
      key: item.key,
      target: item.target,
      title: item.title,
      category: item.category || (item.key.startsWith('F') ? 'Navigation' : 'Action'),
    }));

    const filtered = list.filter((sc) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (sc.key || '').toLowerCase().includes(q) || (sc.title || '').toLowerCase().includes(q) || (sc.category || '').toLowerCase().includes(q);
    });

    const pag = paginateItems(filtered);

    return `
      <div class="cms-master-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cms-card-title" style="font-size: 15px; font-weight: 800; color: #0f5132;">Application Navigation Shortcuts</div>
            <span class="cms-pill font-mono" style="font-size: 11px; background: rgba(15, 81, 50, 0.1); color: #0f5132; font-weight: 800;">${list.length} Shortcuts</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="position: relative; min-width: 240px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 11px;"></i>
              <input type="text" id="master-search-input" class="cms-input cms-input-sm" style="padding-left: 30px; font-size: 12px; height: 32px;" placeholder="Search shortcut key or action..." value="${searchQuery}" autocomplete="off" />
            </div>

            <button type="button" class="cms-btn cms-btn-primary btn-open-add-modal" data-type="shortcuts" style="background: #0f5132; border-color: #0f5132; padding: 6px 14px; font-size: 12px; font-weight: 700; height: 32px;">
              <i class="fa-solid fa-plus"></i> Add Shortcut
            </button>
          </div>
        </div>

        <div class="cms-master-table-scroll">
          <table class="cms-table cms-compact-table" id="master-data-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th style="width: 120px;">Shortcut Key</th>
                <th>Target View / Action</th>
                <th style="width: 140px;">Category</th>
                <th style="width: 80px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                pag.pagedList.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No shortcuts found.</td></tr>`
                  : pag.pagedList
                      .map(
                        (sc, i) => `
                    <tr>
                      <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${pag.startIdx + i + 1}</td>
                      <td>
                        <span class="cms-kbd font-mono" style="font-size: 12px; font-weight: 800; padding: 3px 8px; background: #0f5132; color: #ffffff; border-radius: 4px;">
                          ${sc.key}
                        </span>
                      </td>
                      <td style="font-weight: 700; color: var(--text); font-size: 12.5px;">${sc.title}</td>
                      <td>
                        <span class="cms-pill" style="font-size: 10px; background: rgba(0,0,0,0.06);">${sc.category}</span>
                      </td>
                      <td style="text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                          <button type="button" class="cms-btn-ghost btn-edit-item" data-type="shortcuts" data-id="${sc.id}" data-code="${sc.key}" data-name="${encodeURIComponent(sc.title || '')}" style="padding: 3px 6px; font-size: 12px; color: #0284c7;" title="Edit Shortcut">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button type="button" class="cms-btn-ghost btn-delete-item" data-type="shortcuts" data-id="${sc.id}" data-code="${sc.key}" data-name="${encodeURIComponent(sc.title || '')}" style="padding: 3px 6px; font-size: 12px; color: #dc2626;" title="Delete Shortcut">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        ${renderPaginationBar(pag)}
      </div>
    `;
  }

  // ==========================================
  // MODAL FORM POPUP SYSTEM
  // ==========================================
  function openMasterFormModal(type, isEdit = false, itemData = null) {
    const existing = document.getElementById('master-form-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'master-form-modal-backdrop';
    backdrop.className = 'cms-master-modal-backdrop';

    let titleText = '';
    let formFieldsHTML = '';

    if (type === 'dietary') {
      titleText = isEdit ? `Edit Dietary Suggestion (${itemData?.code})` : 'Add New Dietary Suggestion Template';
      formFieldsHTML = `
        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: #0f5132;">
            <i class="fa-solid fa-barcode"></i> Shortcut Code *
          </label>
          <input type="text" id="modal-dietary-code" class="cms-input" required placeholder="e.g. DB, BP, ACID" value="${itemData?.code || ''}" ${isEdit ? 'readonly style="background: rgba(0,0,0,0.04); font-weight: 800;"' : 'autofocus'} style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 700; height: 38px;" />
          <span style="font-size: 11px; color: var(--text-muted);">Quick code doctor types to auto-fill (e.g. DB, BP)</span>
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: #059669;">
            <i class="fa-solid fa-circle-check"></i> What to Eat (Recommended Foods) *
          </label>
          <textarea id="modal-dietary-eat" class="cms-textarea" rows="3" required placeholder="e.g. Green leafy vegetables, whole grains, salads, fresh water..." style="font-size: 12.5px;">${itemData?.eat || ''}</textarea>
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: #dc2626;">
            <i class="fa-solid fa-ban"></i> What NOT to Eat (Restricted Foods) *
          </label>
          <textarea id="modal-dietary-avoid" class="cms-textarea" rows="3" required placeholder="e.g. Direct sugar, sweets, potatoes, cold drinks..." style="font-size: 12.5px;">${itemData?.avoid || ''}</textarea>
        </div>
      `;
    } else if (type === 'complaints') {
      titleText = isEdit ? `Edit Complaint (${itemData?.code || itemData?.name})` : 'Add New Clinical Complaint';
      formFieldsHTML = `
        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-barcode"></i> Clinic Shortcut Code (Optional)
          </label>
          <input type="text" id="modal-complaint-code" class="cms-input" placeholder="e.g. FEV, COUGH, HEAD (Clinic-specific)" value="${itemData?.code || ''}" style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 700; height: 38px;" />
          <span style="font-size: 11px; color: var(--text-muted);">Shortcut key saved only for your active clinic</span>
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-notes-medical"></i> Complaint / Symptom Full Name *
          </label>
          <input type="text" id="modal-complaint-name" class="cms-input" required placeholder="e.g. High Grade Fever with Chills" value="${itemData?.name || ''}" autofocus style="height: 38px;" />
          <span style="font-size: 11px; color: var(--text-muted);">Full name displayed in consultation and prescription</span>
        </div>
      `;
    } else if (type === 'investigations') {
      titleText = isEdit ? `Edit Investigation (${itemData?.code || itemData?.name})` : 'Add New Lab Investigation';
      formFieldsHTML = `
        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-barcode"></i> Clinic Shortcut Code (Optional)
          </label>
          <input type="text" id="modal-inv-code" class="cms-input" placeholder="e.g. CBC, LFT, RFT, URINE (Clinic-specific)" value="${itemData?.code || ''}" style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 700; height: 38px;" />
          <span style="font-size: 11px; color: var(--text-muted);">Shortcut key saved only for your active clinic</span>
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-flask-vial"></i> Investigation / Test Full Name *
          </label>
          <input type="text" id="modal-inv-name" class="cms-input" required placeholder="e.g. Complete Blood Count (CBC)" value="${itemData?.name || ''}" autofocus style="height: 38px;" />
        </div>
      `;
    } else if (type === 'areas') {
      titleText = isEdit ? `Edit Area / Location (${itemData?.name})` : 'Add New Area / Locality';
      formFieldsHTML = `
        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-map-location-dot"></i> Area / Locality Name *
          </label>
          <input type="text" id="modal-area-name" class="cms-input" required placeholder="e.g. Vastrapur, Satellite, Bopal" value="${itemData?.name || ''}" autofocus style="height: 38px;" />
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-city"></i> City / District *
          </label>
          <input type="text" id="modal-area-city" class="cms-input" required placeholder="e.g. Ahmedabad, Surat" value="${itemData?.city || 'Ahmedabad'}" style="height: 38px;" />
        </div>
      `;
    } else if (type === 'medicines') {
      titleText = isEdit ? `Edit Medicine (${itemData?.code || itemData?.name})` : 'Add New Medicine to Catalogue';
      formFieldsHTML = `
        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-barcode"></i> Clinic Shortcut Code (Optional)
          </label>
          <input type="text" id="modal-med-code" class="cms-input" placeholder="e.g. PCM, PANTO, AMOX, CET (Clinic-specific)" value="${itemData?.code || ''}" style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 700; height: 38px;" />
          <span style="font-size: 11px; color: var(--text-muted);">Shortcut key saved only for your active clinic</span>
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-pills"></i> Medicine / Generic / Brand Name *
          </label>
          <input type="text" id="modal-med-name" class="cms-input" required placeholder="e.g. Paracetamol 650mg, Pantoprazole 40mg" value="${itemData?.name || ''}" autofocus style="height: 38px;" />
        </div>
      `;
    } else if (type === 'allergies') {
      titleText = isEdit ? `Edit Known Allergy (${itemData?.name})` : 'Add Known Allergy';
      formFieldsHTML = `
        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-barcode"></i> Clinic Shortcut Code (Optional)
          </label>
          <input type="text" id="modal-allergy-code" class="cms-input" placeholder="e.g. PEN, SULFA, DUST (Clinic-specific)" value="${itemData?.code || ''}" style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 700; height: 38px;" />
          <span style="font-size: 11px; color: var(--text-muted);">Shortcut key saved only for your active clinic</span>
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-shield-virus"></i> Allergy / Allergen Name *
          </label>
          <input type="text" id="modal-allergy-name" class="cms-input" required placeholder="e.g. Penicillin, Sulfa Drugs, Dust" value="${itemData?.name || ''}" autofocus style="height: 38px;" />
        </div>
      `;
    } else if (type === 'relations') {
      titleText = isEdit ? `Edit Relation (${itemData?.name})` : 'Add Relation to Head';
      formFieldsHTML = `
        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-barcode"></i> Clinic Shortcut Code (Optional)
          </label>
          <input type="text" id="modal-rel-code" class="cms-input" placeholder="e.g. HEAD, WIFE, SON, DAU (Clinic-specific)" value="${itemData?.code || ''}" style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 700; height: 38px;" />
          <span style="font-size: 11px; color: var(--text-muted);">Shortcut key saved only for your active clinic</span>
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-user-group"></i> Relation Name *
          </label>
          <input type="text" id="modal-rel-name" class="cms-input" required placeholder="e.g. Wife, Husband, Son, Daughter" value="${itemData?.name || ''}" autofocus style="height: 38px;" />
        </div>
      `;
    } else if (type === 'societies') {
      titleText = isEdit ? `Edit Society (${itemData?.name})` : 'Add Society / Apartment';
      const areasList = getSharedMasterCollection('areas').map((a) => a.name);
      formFieldsHTML = `
        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-building"></i> Society / Complex Name *
          </label>
          <input type="text" id="modal-soc-name" class="cms-input" required placeholder="e.g. Shanti Niketan Apt, Gokuldham" value="${itemData?.name || ''}" autofocus style="height: 38px;" />
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-location-dot"></i> Area / Locality *
          </label>
          <input type="text" id="modal-soc-area" class="cms-input" list="modal-areas-list" required placeholder="e.g. Vastrapur" value="${itemData?.area || ''}" style="height: 38px;" />
          <datalist id="modal-areas-list">
            ${areasList.map((a) => `<option value="${a}">${a}</option>`).join('')}
          </datalist>
        </div>
      `;
    } else if (type === 'shortcuts') {
      titleText = isEdit ? `Edit Navigation Shortcut (${itemData?.key})` : 'Add Navigation Shortcut';
      formFieldsHTML = `
        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-keyboard"></i> Shortcut Key *
          </label>
          <div style="position: relative;">
            <input type="text" id="modal-sc-key" class="cms-input" required placeholder="e.g. F1, F8, Alt+N, Ctrl+S, /" value="${itemData?.key || ''}" style="font-family: var(--font-mono); font-weight: 800; height: 38px; padding-right: 95px; text-transform: uppercase;" autofocus autocomplete="off" />
            <span class="cms-pill" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 10px; background: #e0f2fe; color: #0369a1; font-weight: 700; pointer-events: none;">Auto-Detect</span>
          </div>
          <span style="font-size: 11px; color: var(--text-muted);">Press desired shortcut key on keyboard (e.g. F1-F12, Alt+N, Ctrl+S, /)</span>
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-arrow-pointer"></i> Navigation Target / Form Action *
          </label>
          <select id="modal-sc-target-select" class="cms-input" style="height: 38px; font-weight: 700;">
            <option value="">-- Select Navigation Tab or Form Action Button --</option>
            <optgroup label="Navigation Tabs">
              ${AVAILABLE_SHORTCUT_TARGETS.filter((t) => t.category === 'Navigation' && !t.target.startsWith('master_')).map((t) => `<option value="${t.target}" data-title="${t.title}" data-cat="${t.category}" ${itemData?.target === t.target ? 'selected' : ''}>${t.title} (${t.keyHint})</option>`).join('')}
            </optgroup>
            <optgroup label="Master Data Sub-Tabs">
              ${AVAILABLE_SHORTCUT_TARGETS.filter((t) => t.target.startsWith('master_')).map((t) => `<option value="${t.target}" data-title="${t.title}" data-cat="${t.category}" ${itemData?.target === t.target ? 'selected' : ''}>${t.title} (${t.keyHint})</option>`).join('')}
            </optgroup>
            <optgroup label="Form Openers &amp; Modal Buttons">
              ${AVAILABLE_SHORTCUT_TARGETS.filter((t) => t.category === 'Form').map((t) => `<option value="${t.target}" data-title="${t.title}" data-cat="${t.category}" ${itemData?.target === t.target ? 'selected' : ''}>${t.title} (${t.keyHint})</option>`).join('')}
            </optgroup>
            <optgroup label="Clinical Actions &amp; System Shortcuts">
              ${AVAILABLE_SHORTCUT_TARGETS.filter((t) => t.category === 'Action').map((t) => `<option value="${t.target}" data-title="${t.title}" data-cat="${t.category}" ${itemData?.target === t.target ? 'selected' : ''}>${t.title} (${t.keyHint})</option>`).join('')}
            </optgroup>
          </select>
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">
            <i class="fa-solid fa-pen-nib"></i> Action Title / Label *
          </label>
          <input type="text" id="modal-sc-title" class="cms-input" required placeholder="e.g. Family Head Registration" value="${itemData?.title || ''}" style="height: 38px;" />
        </div>

        <div class="cms-master-field-group">
          <label style="font-weight: 800; color: var(--text);">Category</label>
          <select id="modal-sc-cat" class="cms-input" style="height: 38px;">
            <option value="Navigation" ${itemData?.category === 'Navigation' ? 'selected' : ''}>Navigation</option>
            <option value="Form" ${itemData?.category === 'Form' ? 'selected' : ''}>Form Opener / Modal</option>
            <option value="Action" ${itemData?.category === 'Action' ? 'selected' : ''}>Action</option>
          </select>
        </div>
      `;
    }

    backdrop.innerHTML = `
      <div class="cms-master-modal-content">
        <div class="cms-master-modal-header">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 15px; color: #0f5132;">
            <i class="fa-solid ${isEdit ? 'fa-pen-to-square' : 'fa-plus'}"></i>
            <span>${titleText}</span>
          </div>
          <button type="button" id="btn-close-master-modal" class="cms-btn-ghost" style="font-size: 15px; color: var(--text-muted); padding: 4px 8px;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form id="form-master-modal-submit">
          <div class="cms-master-modal-body">
            ${formFieldsHTML}
          </div>

          <div class="cms-master-modal-footer">
            <button type="button" id="btn-cancel-master-modal" class="cms-btn cms-btn-ghost" style="border: 1px solid var(--border); padding: 7px 18px; display: inline-flex; align-items: center; gap: 6px;">
              <span>Cancel</span>
              <span class="cms-kbd font-mono" style="font-size: 10px; opacity: 0.7; padding: 1px 4px;">Esc</span>
            </button>
            <button type="submit" id="btn-submit-master-modal" class="cms-btn cms-btn-primary" style="background: #0f5132; border-color: #0f5132; padding: 7px 22px; font-weight: 800; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid ${isEdit ? 'fa-floppy-disk' : 'fa-plus'}"></i>
              <span>${isEdit ? 'Update Record' : 'Save Record'}</span>
              <span class="cms-kbd font-mono" style="font-size: 10.5px; padding: 2px 7px; background: rgba(255,255,255,0.25); color: #ffffff; border: 1px solid rgba(255,255,255,0.45); border-radius: 4px; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">Enter ↵</span>
            </button>
          </div>
        </form>
      </div>
    `;

    const closeModal = () => backdrop.remove();

    backdrop.querySelector('#btn-close-master-modal')?.addEventListener('click', closeModal);
    backdrop.querySelector('#btn-cancel-master-modal')?.addEventListener('click', closeModal);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Keyboard shortcut handler: Enter submits modal, Shift+Enter makes newline in textarea, Esc cancels
    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'textarea' && e.shiftKey) {
          // Allow Shift+Enter for new line in textarea
          return;
        }
        if (activeTag === 'button' && document.activeElement.id === 'btn-cancel-master-modal') {
          return; // Allow Enter on Cancel button to trigger cancel
        }
        e.preventDefault();
        const submitBtn = backdrop.querySelector('#btn-submit-master-modal');
        if (submitBtn) {
          submitBtn.click();
        } else {
          const form = backdrop.querySelector('#form-master-modal-submit');
          form?.requestSubmit ? form.requestSubmit() : form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    });

    const form = backdrop.querySelector('#form-master-modal-submit');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      if (type === 'dietary') {
        const code = backdrop.querySelector('#modal-dietary-code').value.trim().toUpperCase();
        const eat = backdrop.querySelector('#modal-dietary-eat').value.trim();
        const avoid = backdrop.querySelector('#modal-dietary-avoid').value.trim();
        if (!code || !eat || !avoid) return;

        if (!db.dietary) db.dietary = {};
        const existing = db.dietary[code];
        db.dietary[code] = {
          id: existing?.id || `d_${Date.now()}`,
          code,
          eat,
          avoid,
          text: `${code}: Eat: ${eat} | Avoid: ${avoid}`,
          createdAt: existing?.createdAt || todayISO(),
          updatedAt: todayISO(),
        };

        saveLocalDB(db, clinicId);
        showToast(`✨ Dietary template "${code}" ${isEdit ? 'updated' : 'added'} successfully!`);
      } else if (type === 'complaints') {
        const code = backdrop.querySelector('#modal-complaint-code').value.trim().toUpperCase();
        const name = backdrop.querySelector('#modal-complaint-name').value.trim();
        if (!name) return;

        if (!db.clinicShortcuts) db.clinicShortcuts = {};
        if (!db.clinicShortcuts.complaints) db.clinicShortcuts.complaints = {};
        if (code) {
          db.clinicShortcuts.complaints[name] = code;
          if (itemData?.id) db.clinicShortcuts.complaints[itemData.id] = code;
        } else {
          delete db.clinicShortcuts.complaints[name];
          if (itemData?.name) delete db.clinicShortcuts.complaints[itemData.name];
          if (itemData?.id) delete db.clinicShortcuts.complaints[itemData.id];
        }

        if (isEdit) {
          updateSharedMasterItem('complaints', { id: itemData?.id, name, updatedAt: todayISO() });
        } else {
          addSharedMasterItem('complaints', { id: `c_${Date.now()}`, name, createdAt: todayISO() }, db);
        }
        if (!db.customComplaints) db.customComplaints = [];
        if (!db.customComplaints.includes(name)) db.customComplaints.push(name);

        saveLocalDB(db, clinicId);
        showToast(`✨ Complaint "${name}" ${isEdit ? 'updated' : 'added'} successfully!`);
      } else if (type === 'investigations') {
        const code = backdrop.querySelector('#modal-inv-code').value.trim().toUpperCase();
        const name = backdrop.querySelector('#modal-inv-name').value.trim();
        if (!name) return;

        if (!db.clinicShortcuts) db.clinicShortcuts = {};
        if (!db.clinicShortcuts.investigations) db.clinicShortcuts.investigations = {};
        if (code) {
          db.clinicShortcuts.investigations[name] = code;
          if (itemData?.id) db.clinicShortcuts.investigations[itemData.id] = code;
        } else {
          delete db.clinicShortcuts.investigations[name];
          if (itemData?.name) delete db.clinicShortcuts.investigations[itemData.name];
          if (itemData?.id) delete db.clinicShortcuts.investigations[itemData.id];
        }

        if (isEdit) {
          updateSharedMasterItem('investigations', { id: itemData?.id, name, updatedAt: todayISO() });
        } else {
          addSharedMasterItem('investigations', { id: `inv_${Date.now()}`, name, createdAt: todayISO() }, db);
        }
        if (!db.customInvestigations) db.customInvestigations = [];
        if (!db.customInvestigations.includes(name)) db.customInvestigations.push(name);

        saveLocalDB(db, clinicId);
        showToast(`✨ Investigation "${name}" ${isEdit ? 'updated' : 'added'} successfully!`);
      } else if (type === 'areas') {
        const name = backdrop.querySelector('#modal-area-name').value.trim();
        const city = backdrop.querySelector('#modal-area-city').value.trim();
        if (!name || !city) return;

        if (isEdit) {
          updateSharedMasterItem('areas', { id: itemData?.id, name, city, updatedAt: todayISO() });
        } else {
          addSharedMasterItem('areas', { id: `a_${Date.now()}`, name, city, createdAt: todayISO() }, db);
        }

        saveLocalDB(db, clinicId);
        showToast(`✨ Area "${name}" ${isEdit ? 'updated' : 'added'} successfully!`);
      } else if (type === 'medicines') {
        const code = backdrop.querySelector('#modal-med-code').value.trim().toUpperCase();
        const name = backdrop.querySelector('#modal-med-name').value.trim();
        if (!name) return;

        if (!db.clinicShortcuts) db.clinicShortcuts = {};
        if (!db.clinicShortcuts.medicines) db.clinicShortcuts.medicines = {};
        if (code) {
          db.clinicShortcuts.medicines[name] = code;
          if (itemData?.id) db.clinicShortcuts.medicines[itemData.id] = code;
        } else {
          delete db.clinicShortcuts.medicines[name];
          if (itemData?.name) delete db.clinicShortcuts.medicines[itemData.name];
          if (itemData?.id) delete db.clinicShortcuts.medicines[itemData.id];
        }

        if (isEdit) {
          updateSharedMasterItem('medicines', { id: itemData?.id, name, updatedAt: todayISO() });
        } else {
          addSharedMasterItem('medicines', { id: `m_${Date.now()}`, name, createdAt: todayISO() }, db);
        }

        saveLocalDB(db, clinicId);
        showToast(`✨ Medicine "${name}" ${isEdit ? 'updated' : 'added'} successfully!`);
      } else if (type === 'allergies') {
        const code = backdrop.querySelector('#modal-allergy-code').value.trim().toUpperCase();
        const name = backdrop.querySelector('#modal-allergy-name').value.trim();
        if (!name) return;

        if (!db.clinicShortcuts) db.clinicShortcuts = {};
        if (!db.clinicShortcuts.allergies) db.clinicShortcuts.allergies = {};
        if (code) {
          db.clinicShortcuts.allergies[name] = code;
          if (itemData?.id) db.clinicShortcuts.allergies[itemData.id] = code;
        } else {
          delete db.clinicShortcuts.allergies[name];
          if (itemData?.name) delete db.clinicShortcuts.allergies[itemData.name];
          if (itemData?.id) delete db.clinicShortcuts.allergies[itemData.id];
        }

        if (isEdit) {
          updateSharedMasterItem('allergies', { id: itemData?.id, name, updatedAt: todayISO() });
        } else {
          addSharedMasterItem('allergies', { id: `al_${Date.now()}`, name, createdAt: todayISO() }, db);
        }

        saveLocalDB(db, clinicId);
        showToast(`✨ Allergy "${name}" ${isEdit ? 'updated' : 'added'} successfully!`);
      } else if (type === 'relations') {
        const code = backdrop.querySelector('#modal-rel-code').value.trim().toUpperCase();
        const name = backdrop.querySelector('#modal-rel-name').value.trim();
        if (!name) return;

        if (!db.clinicShortcuts) db.clinicShortcuts = {};
        if (!db.clinicShortcuts.relations) db.clinicShortcuts.relations = {};
        if (code) {
          db.clinicShortcuts.relations[name] = code;
          if (itemData?.id) db.clinicShortcuts.relations[itemData.id] = code;
        } else {
          delete db.clinicShortcuts.relations[name];
          if (itemData?.name) delete db.clinicShortcuts.relations[itemData.name];
          if (itemData?.id) delete db.clinicShortcuts.relations[itemData.id];
        }

        if (isEdit) {
          updateSharedMasterItem('relations', { id: itemData?.id, name, updatedAt: todayISO() });
        } else {
          addSharedMasterItem('relations', { id: `r_${Date.now()}`, name, createdAt: todayISO() }, db);
        }

        saveLocalDB(db, clinicId);
        showToast(`✨ Relation "${name}" ${isEdit ? 'updated' : 'added'} successfully!`);
      } else if (type === 'societies') {
        const name = backdrop.querySelector('#modal-soc-name').value.trim();
        const area = backdrop.querySelector('#modal-soc-area').value.trim();
        if (!name || !area) return;

        if (isEdit) {
          updateSharedMasterItem('societies', { id: itemData?.id, name, area, updatedAt: todayISO() });
        } else {
          addSharedMasterItem('societies', { id: `s_${Date.now()}`, name, area, createdAt: todayISO() }, db);
        }

        saveLocalDB(db, clinicId);
        showToast(`✨ Society "${name}" ${isEdit ? 'updated' : 'added'} successfully!`);
      } else if (type === 'shortcuts') {
        const key = backdrop.querySelector('#modal-sc-key').value.trim().toUpperCase();
        const targetSelect = backdrop.querySelector('#modal-sc-target-select');
        const selectedTarget = targetSelect?.value || '';
        const title = backdrop.querySelector('#modal-sc-title').value.trim();
        const category = backdrop.querySelector('#modal-sc-cat').value;
        const target = selectedTarget || title.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!key || !title) return;

        if (!db.customShortcuts) db.customShortcuts = [];
        if (isEdit) {
          const idx = db.customShortcuts.findIndex((sc) => sc.id === itemData?.id || sc.key === itemData?.key);
          if (idx !== -1) {
            db.customShortcuts[idx] = { ...db.customShortcuts[idx], key, target, title, category };
          }
        } else {
          db.customShortcuts.push({
            id: `sc_${Date.now()}`,
            key,
            target,
            title,
            category,
          });
        }

        saveLocalDB(db, clinicId);
        showToast(`✨ Shortcut "${key}" ${isEdit ? 'updated' : 'added'} successfully!`);
      }

      closeModal();
      renderView();
    });

    // Auto-detect key combinations when typing in shortcut key input
    if (type === 'shortcuts') {
      const keyInput = backdrop.querySelector('#modal-sc-key');
      if (keyInput) {
        keyInput.addEventListener('keydown', (e) => {
          if (['Tab', 'Enter', 'Escape'].includes(e.key)) return;
          e.preventDefault();
          e.stopPropagation();

          let combo = [];
          if (e.ctrlKey) combo.push('Ctrl');
          if (e.altKey) combo.push('Alt');
          if (e.shiftKey && e.key.length > 1) combo.push('Shift');

          let k = e.key;
          if (k === ' ') k = 'Space';
          if (!['Control', 'Alt', 'Shift'].includes(e.key)) {
            combo.push(k);
          }
          keyInput.value = combo.join('+').toUpperCase();
        });
      }

      const targetSelect = backdrop.querySelector('#modal-sc-target-select');
      if (targetSelect) {
        targetSelect.addEventListener('change', () => {
          const opt = targetSelect.selectedOptions[0];
          if (opt && opt.value) {
            const titleInput = backdrop.querySelector('#modal-sc-title');
            const catSelect = backdrop.querySelector('#modal-sc-cat');
            if (titleInput) titleInput.value = opt.getAttribute('data-title') || opt.textContent;
            if (catSelect) catSelect.value = opt.getAttribute('data-cat') || 'Navigation';
          }
        });
      }
    }

    document.body.appendChild(backdrop);

    // Auto-focus first interactive input
    setTimeout(() => {
      const firstInput = backdrop.querySelector('input:not([readonly]), textarea:not([readonly]), select');
      if (firstInput) firstInput.focus();
    }, 50);
  }

  // ==========================================
  // ATTACH EVENT LISTENERS (Container-Level Delegation)
  // ==========================================
  function attachTabEventListeners() {
    // 1. Container-level Click Delegation
    container.onclick = (e) => {
      // (a) Sub-tab switching
      const tabBtn = e.target.closest('.cms-master-tab-btn');
      if (tabBtn) {
        const tab = tabBtn.getAttribute('data-tab');
        if (tab && tab !== activeTab) {
          activeTab = tab;
          searchQuery = '';
          currentPage = 1;
          renderView();
        }
        return;
      }

      // (b) Open "+ Add New ..." Modal Buttons
      const addModalBtn = e.target.closest('.btn-open-add-modal');
      if (addModalBtn) {
        const type = addModalBtn.getAttribute('data-type');
        openMasterFormModal(type, false, null);
        return;
      }

      // (c) Edit Item button
      const editBtn = e.target.closest('.btn-edit-item');
      if (editBtn) {
        const type = editBtn.getAttribute('data-type');
        const code = editBtn.getAttribute('data-code');
        const id = editBtn.getAttribute('data-id');
        const rawName = editBtn.getAttribute('data-name');
        const name = rawName ? decodeURIComponent(rawName) : '';

        let itemData = null;
        if (type === 'dietary') {
          itemData = db.dietary?.[code] || Object.values(db.dietary || {}).find((d) => d.id === id || d.code === code);
        } else if (type === 'complaints') {
          const list = getSharedMasterCollection('complaints');
          const found = list.find((c) => (id && c.id === id) || (name && c.name === name));
          if (found) {
            const clinicCode = db.clinicShortcuts?.complaints?.[found.name] || db.clinicShortcuts?.complaints?.[found.id] || '';
            itemData = { ...found, code: clinicCode };
          }
        } else if (type === 'investigations') {
          const list = getSharedMasterCollection('investigations');
          const found = list.find((inv) => (id && inv.id === id) || (name && inv.name === name));
          if (found) {
            const clinicCode = db.clinicShortcuts?.investigations?.[found.name] || db.clinicShortcuts?.investigations?.[found.id] || '';
            itemData = { ...found, code: clinicCode };
          }
        } else if (type === 'areas') {
          const list = getSharedMasterCollection('areas');
          itemData = list.find((a) => (id && a.id === id) || (name && a.name === name));
        } else if (type === 'medicines') {
          const list = getSharedMasterCollection('medicines');
          const found = list.find((m) => (id && m.id === id) || (name && m.name === name));
          if (found) {
            const clinicCode = db.clinicShortcuts?.medicines?.[found.name] || db.clinicShortcuts?.medicines?.[found.id] || '';
            itemData = { ...found, code: clinicCode };
          }
        } else if (type === 'allergies') {
          const list = getSharedMasterCollection('allergies');
          const found = list.find((al) => (id && al.id === id) || (name && al.name === name));
          if (found) {
            const clinicCode = db.clinicShortcuts?.allergies?.[found.name] || db.clinicShortcuts?.allergies?.[found.id] || '';
            itemData = { ...found, code: clinicCode };
          }
        } else if (type === 'relations') {
          const list = getSharedMasterCollection('relations');
          const found = list.find((r) => (id && r.id === id) || (name && r.name === name));
          if (found) {
            const clinicCode = db.clinicShortcuts?.relations?.[found.name] || db.clinicShortcuts?.relations?.[found.id] || '';
            itemData = { ...found, code: clinicCode };
          }
        } else if (type === 'societies') {
          const list = getSharedMasterCollection('societies');
          itemData = list.find((s) => (id && s.id === id) || (name && s.name === name));
        } else if (type === 'shortcuts') {
          itemData = (db.customShortcuts || []).find((sc) => (id && sc.id === id) || (code && sc.key === code));
        }

        if (itemData) {
          openMasterFormModal(type, true, itemData);
        }
        return;
      }

      // (d) Delete Record Action Buttons
      const delBtn = e.target.closest('.btn-delete-item');
      if (delBtn) {
        const type = delBtn.getAttribute('data-type');
        const code = delBtn.getAttribute('data-code');
        const id = delBtn.getAttribute('data-id');
        const rawName = delBtn.getAttribute('data-name');
        const name = rawName ? decodeURIComponent(rawName) : '';

        const recordTitle = code || name || id || 'record';
        if (!confirm(`Are you sure you want to delete ${recordTitle}?`)) return;

        if (type === 'dietary') {
          if (code && db.dietary?.[code]) {
            delete db.dietary[code];
          } else {
            Object.entries(db.dietary || {}).forEach(([k, v]) => {
              if (v.id === id || v.code === code || k === code) delete db.dietary[k];
            });
          }
          showToast(`🗑️ Dietary template "${recordTitle}" deleted.`);
        } else if (type === 'complaints') {
          if (db.clinicShortcuts?.complaints) {
            delete db.clinicShortcuts.complaints[name];
            if (id) delete db.clinicShortcuts.complaints[id];
          }
          deleteSharedMasterItem('complaints', (c) => {
            if (id && c.id === id) return false;
            if (name && c.name && c.name.toLowerCase() === name.toLowerCase()) return false;
            return true;
          });
          showToast(`🗑️ Complaint "${recordTitle}" deleted.`);
        } else if (type === 'investigations') {
          if (db.clinicShortcuts?.investigations) {
            delete db.clinicShortcuts.investigations[name];
            if (id) delete db.clinicShortcuts.investigations[id];
          }
          deleteSharedMasterItem('investigations', (inv) => {
            if (id && inv.id === id) return false;
            if (name && inv.name && inv.name.toLowerCase() === name.toLowerCase()) return false;
            return true;
          });
          showToast(`🗑️ Investigation "${recordTitle}" deleted.`);
        } else if (type === 'areas') {
          deleteSharedMasterItem('areas', (a) => {
            if (id && a.id === id) return false;
            if (name && a.name && a.name.toLowerCase() === name.toLowerCase()) return false;
            return true;
          });
          showToast(`🗑️ Area "${recordTitle}" deleted.`);
        } else if (type === 'medicines') {
          if (db.clinicShortcuts?.medicines) {
            delete db.clinicShortcuts.medicines[name];
            if (id) delete db.clinicShortcuts.medicines[id];
          }
          deleteSharedMasterItem('medicines', (m) => {
            if (id && m.id === id) return false;
            if (name && m.name && m.name.toLowerCase() === name.toLowerCase()) return false;
            return true;
          });
          showToast(`🗑️ Medicine "${recordTitle}" deleted.`);
        } else if (type === 'allergies') {
          if (db.clinicShortcuts?.allergies) {
            delete db.clinicShortcuts.allergies[name];
            if (id) delete db.clinicShortcuts.allergies[id];
          }
          deleteSharedMasterItem('allergies', (al) => {
            if (id && al.id === id) return false;
            if (name && al.name && al.name.toLowerCase() === name.toLowerCase()) return false;
            return true;
          });
          showToast(`🗑️ Allergy "${recordTitle}" deleted.`);
        } else if (type === 'relations') {
          if (db.clinicShortcuts?.relations) {
            delete db.clinicShortcuts.relations[name];
            if (id) delete db.clinicShortcuts.relations[id];
          }
          deleteSharedMasterItem('relations', (r) => {
            if (id && r.id === id) return false;
            if (name && r.name && r.name.toLowerCase() === name.toLowerCase()) return false;
            return true;
          });
          showToast(`🗑️ Relation "${recordTitle}" deleted.`);
        } else if (type === 'societies') {
          deleteSharedMasterItem('societies', (s) => {
            if (id && s.id === id) return false;
            if (name && s.name && s.name.toLowerCase() === name.toLowerCase()) return false;
            return true;
          });
          showToast(`🗑️ Society "${recordTitle}" deleted.`);
        } else if (type === 'shortcuts') {
          db.customShortcuts = (db.customShortcuts || []).filter((sc) => {
            if (id && sc.id === id) return false;
            if (code && sc.key && sc.key.toLowerCase() === code.toLowerCase()) return false;
            return true;
          });
          showToast(`🗑️ Shortcut "${recordTitle}" deleted.`);
        }

        saveLocalDB(db, clinicId);
        renderView();
        return;
      }

      // (e) Prev Pagination Button
      const prevBtn = e.target.closest('#btn-master-prev');
      if (prevBtn && currentPage > 1) {
        currentPage--;
        renderView();
        return;
      }

      // (f) Next Pagination Button
      const nextBtn = e.target.closest('#btn-master-next');
      if (nextBtn) {
        currentPage++;
        renderView();
        return;
      }
    };

    // 2. Search Bar Input
    const searchInput = container.querySelector('#master-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        const contentMount = container.querySelector('#master-tab-content');
        if (contentMount) {
          contentMount.innerHTML = renderActiveTabContent();
          const restoredInput = container.querySelector('#master-search-input');
          if (restoredInput) {
            restoredInput.focus();
            const len = restoredInput.value.length;
            restoredInput.setSelectionRange(len, len);
          }
        }
      };
    }

    // 3. Page Size Selector
    const pageSizeSelect = container.querySelector('#master-page-size');
    if (pageSizeSelect) {
      pageSizeSelect.onchange = (e) => {
        pageSize = e.target.value;
        currentPage = 1;
        renderView();
      };
    }
  }

  // Initial View Render
  renderView();
}
