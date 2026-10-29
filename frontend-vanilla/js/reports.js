/**
 * =========================================================
 * CLINIC REPORTS & ANALYTICS CONTROLLER
 * Day-wise, Patient-wise, Area-wise, Ref Dr, and Collections
 * =========================================================
 */

import { apiFetch, getLocalDB, getAuthSession, fmtDate, fmtMoney, todayISO } from './api.js';

export function renderReportsView(container) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';
  const db = getLocalDB(clinicId);

  let activeTab = 'area'; // 'area' | 'refdr' | 'diagnosis' | 'patient' | 'collection'

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Reports Sub-nav -->
      <div class="no-print" style="display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; align-items: center;">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="cms-btn ${activeTab === 'area' ? 'cms-btn-primary' : 'cms-btn-ghost'}" id="rpt-tab-area"><i class="fa-solid fa-location-dot"></i> Area-wise</button>
          <button type="button" class="cms-btn ${activeTab === 'refdr' ? 'cms-btn-primary' : 'cms-btn-ghost'}" id="rpt-tab-refdr"><i class="fa-solid fa-user-doctor"></i> Ref. Doctor</button>
          <button type="button" class="cms-btn ${activeTab === 'patient' ? 'cms-btn-primary' : 'cms-btn-ghost'}" id="rpt-tab-pat"><i class="fa-solid fa-user"></i> Patient History</button>
          <button type="button" class="cms-btn ${activeTab === 'collection' ? 'cms-btn-primary' : 'cms-btn-ghost'}" id="rpt-tab-col"><i class="fa-solid fa-indian-rupee-sign"></i> Daily Collections</button>
          <button type="button" class="cms-btn ${activeTab === 'monthly' ? 'cms-btn-primary' : 'cms-btn-ghost'}" id="rpt-tab-monthly"><i class="fa-solid fa-calendar-days"></i> Monthly Income</button>
        </div>
        <button type="button" class="cms-btn cms-btn-outline" onclick="const s = document.createElement('style'); s.innerHTML = '@page { size: A4 landscape !important; margin: 12mm !important; }'; document.head.appendChild(s); window.print(); setTimeout(() => s.remove(), 1000);">
          <i class="fa-solid fa-print"></i> Print Report
        </button>
      </div>

      <!-- Report Content Card -->
      <div id="cms-report-print-area" style="width: 100%;">
        <div class="cms-card" id="rpt-content-box" style="padding: 20px;">
          <!-- Dynamic Report Body -->
        </div>
      </div>
    </div>
  `;

  // Aggregate Data
  const families = Object.values(db.families || {});
  const allVisits = [];
  const allPatients = [];

  families.forEach((fam) => {
    Object.values(fam.patients || {}).forEach((pat) => {
      allPatients.push({ ...pat, famHead: fam.headName, famArea: fam.area });
      (pat.visits || []).forEach((v) => {
        allVisits.push({
          ...v,
          famHead: fam.headName,
          famArea: fam.area,
          patName: pat.name,
        });
      });
    });
  });

  const renderCurrentReport = () => {
    const box = container.querySelector('#rpt-content-box');

    if (activeTab === 'area') {
      box.innerHTML = `
        <div class="cms-card-header">
          <div class="cms-card-title">Area-wise Patient List & Dues</div>
        </div>
        <div style="display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <input type="text" id="rpt-area-search" class="cms-input" placeholder="Search by area name..." />
          </div>
        </div>
        <div id="rpt-area-results" style="display: flex; flex-direction: column; gap: 20px;">
        </div>
      `;

      const renderAreaResults = () => {
        const areaQuery = (box.querySelector('#rpt-area-search').value || '').toLowerCase().trim();

        const areaMap = {};

        allPatients.forEach((pat) => {
          const area = pat.famArea || 'Unknown';

          if (areaQuery && !area.toLowerCase().includes(areaQuery)) return;

          if (!areaMap[area]) {
            areaMap[area] = [];
          }

          // Calculate total due for this patient
          const totalDue = (pat.visits || []).reduce((sum, v) => sum + (Number(v.due) || 0), 0);

          areaMap[area].push({
            name: pat.name,
            id: pat.patId || pat.id,
            head: pat.famHead,
            due: totalDue
          });
        });

        const resultsContainer = box.querySelector('#rpt-area-results');

        if (Object.keys(areaMap).length === 0) {
          resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 8px;">No patients found for the selected filters.</div>';
          return;
        }

        resultsContainer.innerHTML = Object.entries(areaMap)
          .map(
            ([area, patients]) => `
            <div class="cms-card" style="padding: 16px; background: var(--surface); border: 1px solid var(--border);">
              <div style="font-size: 16px; font-weight: 700; color: var(--primary); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span><i class="fa-solid fa-location-dot" style="margin-right: 8px;"></i>${area}</span>
                <span class="cms-badge cms-badge-neutral">${patients.length} Patient(s)</span>
              </div>
              <div class="cms-table-wrapper">
                <table class="cms-table">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Patient Name</th>
                      <th>Family Head</th>
                      <th style="text-align: right;">Due Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${patients.map(p => `
                      <tr>
                        <td class="font-mono">${p.id || '-'}</td>
                        <td><b>${p.name}</b></td>
                        <td>${p.head || '-'}</td>
                        <td class="font-mono" style="text-align: right; font-weight: ${p.due > 0 ? '700' : 'normal'}; color: ${p.due > 0 ? 'var(--danger)' : 'inherit'};">
                          ${p.due > 0 ? fmtMoney(p.due) : 'Nil'}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `
          )
          .join('');
      };

      box.querySelector('#rpt-area-search').addEventListener('input', renderAreaResults);

      // Initial render
      renderAreaResults();
    } else if (activeTab === 'refdr') {
      box.innerHTML = `
        <div class="cms-card-header">
          <div class="cms-card-title">Referred Patients by Doctor</div>
        </div>
        <div style="display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <input type="text" id="rpt-ref-dr-search" class="cms-input" placeholder="Search by doctor name..." />
          </div>
          <div style="flex: 1; min-width: 200px;">
            <input type="text" id="rpt-ref-pat-search" class="cms-input" placeholder="Search by patient name..." />
          </div>
        </div>
        <div id="rpt-ref-results" style="display: flex; flex-direction: column; gap: 20px;">
        </div>
      `;

      const renderRefResults = () => {
        const drQuery = (box.querySelector('#rpt-ref-dr-search').value || '').toLowerCase().trim();
        const patQuery = (box.querySelector('#rpt-ref-pat-search').value || '').toLowerCase().trim();

        const drMap = {};

        allVisits.forEach(v => {
          const dr = v.reference || 'Self';
          if (drQuery && !dr.toLowerCase().includes(drQuery)) return;
          if (patQuery && !(v.patName || '').toLowerCase().includes(patQuery)) return;

          if (!drMap[dr]) drMap[dr] = [];

          drMap[dr].push(v);
        });

        const resultsContainer = box.querySelector('#rpt-ref-results');
        if (Object.keys(drMap).length === 0) {
          resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 8px;">No records found for the selected filters.</div>';
          return;
        }

        resultsContainer.innerHTML = Object.keys(drMap).sort().map(dr => {
          const visits = drMap[dr];
          return `
            <div class="cms-card" style="padding: 16px; background: var(--surface); border: 1px solid var(--border);">
              <div style="font-size: 16px; font-weight: 700; color: var(--primary); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span><i class="fa-solid fa-user-doctor" style="margin-right: 8px;"></i>${dr}</span>
                <span class="cms-badge cms-badge-neutral">${visits.length} Visit(s)</span>
              </div>
              <div class="cms-table-wrapper">
                <table class="cms-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Case ID</th>
                      <th>Patient Name</th>
                      <th>Diagnosis</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${visits.map(v => `
                      <tr>
                        <td class="font-mono">${fmtDate(v.date)}</td>
                        <td class="font-mono">${v.caseId || '-'}</td>
                        <td><b>${v.patName}</b></td>
                        <td><span class="cms-pill cms-badge-neutral">${v.diagnosis || '-'}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('');
      };

      box.querySelector('#rpt-ref-dr-search').addEventListener('input', renderRefResults);
      box.querySelector('#rpt-ref-pat-search').addEventListener('input', renderRefResults);

      renderRefResults();
    } else if (activeTab === 'patient') {
      box.innerHTML = `
        <div class="cms-card-header">
          <div class="cms-card-title">Patient Visit History Finder</div>
        </div>
        <input type="text" id="rpt-pat-search" class="cms-input" placeholder="Type patient name or ID to filter visit history..." style="margin-bottom: 14px;" />
        <div class="cms-table-wrapper">
          <table class="cms-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Case ID</th>
                <th>Patient Name</th>
                <th>Diagnosis</th>
                <th>Complaint</th>
                <th>Charge</th>
                <th style="text-align: right;">Due</th>
              </tr>
            </thead>
            <tbody id="rpt-pat-tbody">
              ${allVisits
          .map(
            (v) => `
                <tr>
                  <td class="font-mono">${fmtDate(v.date)}</td>
                  <td class="font-mono" style="font-weight: 700; color: var(--primary);">${v.caseId}</td>
                  <td><b>${v.patName}</b></td>
                  <td><span class="cms-pill cms-badge-neutral">${v.diagnosis || '-'}</span></td>
                  <td>${v.complaint || '-'}</td>
                  <td class="font-mono">${fmtMoney(v.charge)}</td>
                  <td class="font-mono" style="text-align: right; font-weight: ${v.due > 0 ? '700' : 'normal'}; color: ${v.due > 0 ? 'var(--danger)' : 'inherit'};">
                    ${v.due > 0 ? fmtMoney(v.due) : 'Nil'}
                  </td>
                </tr>
              `
          )
          .join('')}
            </tbody>
          </table>
        </div>
      `;

      box.querySelector('#rpt-pat-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const tbody = box.querySelector('#rpt-pat-tbody');
        const filtered = allVisits.filter((v) => v.patName.toLowerCase().includes(q) || (v.caseId || '').includes(q));
        tbody.innerHTML = filtered
          .map(
            (v) => `
          <tr>
            <td class="font-mono">${fmtDate(v.date)}</td>
            <td class="font-mono" style="font-weight: 700; color: var(--primary);">${v.caseId}</td>
            <td><b>${v.patName}</b></td>
            <td><span class="cms-pill cms-badge-neutral">${v.diagnosis || '-'}</span></td>
            <td>${v.complaint || '-'}</td>
            <td class="font-mono">${fmtMoney(v.charge)}</td>
            <td class="font-mono" style="text-align: right; font-weight: ${v.due > 0 ? '700' : 'normal'}; color: ${v.due > 0 ? 'var(--danger)' : 'inherit'};">
              ${v.due > 0 ? fmtMoney(v.due) : 'Nil'}
            </td>
          </tr>
        `
          )
          .join('');
      });
    } else if (activeTab === 'collection') {
      box.innerHTML = `
        <div class="cms-card-header" style="justify-content: space-between; align-items: center; display: flex; flex-wrap: wrap; gap: 14px;">
          <div class="cms-card-title">Payment Collections Log</div>
          <div>
            <input type="date" id="rpt-col-date" class="cms-input" style="width: auto;" value="${todayISO()}" />
          </div>
        </div>
        <div id="rpt-col-summary" class="font-mono" style="font-size: 18px; font-weight: 800; color: var(--success); margin-bottom: 20px;">
          Total: ₹0
        </div>
        <div class="cms-table-wrapper" id="rpt-col-wrapper">
          <!-- Dynamic table goes here -->
        </div>
      `;

      const renderCollection = () => {
        const dateQuery = box.querySelector('#rpt-col-date').value;
        const visits = allVisits.filter((v) => Number(v.received) > 0 && (!dateQuery || v.date === dateQuery));
        const totalCollected = visits.reduce((s, v) => s + (Number(v.received) || 0), 0);

        box.querySelector('#rpt-col-summary').innerHTML = `Total: ${fmtMoney(totalCollected)}`;

        const wrapper = box.querySelector('#rpt-col-wrapper');
        if (visits.length === 0) {
          wrapper.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 8px;">No collections found for the selected date.</div>';
          return;
        }

        wrapper.innerHTML = `
          <table class="cms-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Case ID</th>
                <th>Patient</th>
                <th>Family Head</th>
                <th>Received Amount</th>
                <th style="text-align: right;">Due</th>
              </tr>
            </thead>
            <tbody>
              ${visits.map(v => `
                <tr>
                  <td class="font-mono">${fmtDate(v.date)}</td>
                  <td class="font-mono" style="font-weight: 700;">${v.caseId}</td>
                  <td><b>${v.patName}</b></td>
                  <td>${v.famHead}</td>
                  <td class="font-mono" style="color: var(--success); font-weight: 800;">${fmtMoney(v.received)}</td>
                  <td class="font-mono" style="text-align: right; font-weight: ${v.due > 0 ? '700' : 'normal'}; color: ${v.due > 0 ? 'var(--danger)' : 'inherit'};">
                    ${v.due > 0 ? fmtMoney(v.due) : 'Nil'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      };

      box.querySelector('#rpt-col-date').addEventListener('change', renderCollection);
      renderCollection();
    } else if (activeTab === 'monthly') {
      box.innerHTML = `
        <div class="cms-card-header">
          <div class="cms-card-title">Monthly Income & Filtered Report</div>
        </div>
        <div style="display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 150px;">
            <input type="month" id="rpt-mon-month" class="cms-input" value="${todayISO().slice(0, 7)}" />
          </div>
          <div style="flex: 1; min-width: 150px;">
            <input type="text" id="rpt-mon-area" class="cms-input" placeholder="Search by area..." />
          </div>
          <div style="flex: 1; min-width: 150px; display: flex; align-items: center;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text);">
              <input type="checkbox" id="rpt-mon-due" style="width: 18px; height: 18px;" />
              Only show patients with Due
            </label>
          </div>
        </div>
        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
          <div class="font-mono" style="font-size: 16px; font-weight: 700; color: var(--primary);">Total Income (Collected): <span id="rpt-mon-collected">₹0</span></div>
          <div class="font-mono" style="font-size: 16px; font-weight: 700; color: var(--danger);">Total Due: <span id="rpt-mon-total-due">₹0</span></div>
        </div>
        <div class="cms-table-wrapper" id="rpt-mon-wrapper">
        </div>
      `;

      const renderMonthly = () => {
        const monthQuery = box.querySelector('#rpt-mon-month').value; // YYYY-MM
        const areaQuery = (box.querySelector('#rpt-mon-area').value || '').toLowerCase().trim();
        const dueOnly = box.querySelector('#rpt-mon-due').checked;

        const filtered = allVisits.filter((v) => {
          if (monthQuery && !String(v.date).startsWith(monthQuery)) return false;
          if (areaQuery && !(v.famArea || '').toLowerCase().includes(areaQuery)) return false;
          if (dueOnly && !(Number(v.due) > 0)) return false;
          return true;
        });

        const totalColl = filtered.reduce((s, v) => s + (Number(v.received) || 0), 0);
        const totalDue = filtered.reduce((s, v) => s + (Number(v.due) || 0), 0);

        box.querySelector('#rpt-mon-collected').innerText = fmtMoney(totalColl);
        box.querySelector('#rpt-mon-total-due').innerText = fmtMoney(totalDue);

        const wrapper = box.querySelector('#rpt-mon-wrapper');
        if (filtered.length === 0) {
          wrapper.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 8px;">No records found for the selected filters.</div>';
          return;
        }

        wrapper.innerHTML = `
          <table class="cms-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Case ID</th>
                <th>Patient</th>
                <th>Area</th>
                <th>Charge</th>
                <th>Received</th>
                <th style="text-align: right;">Due</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(v => `
                <tr>
                  <td class="font-mono">${fmtDate(v.date)}</td>
                  <td class="font-mono" style="font-weight: 700;">${v.caseId}</td>
                  <td><b>${v.patName}</b></td>
                  <td>${v.famArea || '-'}</td>
                  <td class="font-mono">${fmtMoney(v.charge)}</td>
                  <td class="font-mono" style="color: var(--success); font-weight: 700;">${fmtMoney(v.received)}</td>
                  <td class="font-mono" style="text-align: right; font-weight: ${v.due > 0 ? '700' : 'normal'}; color: ${v.due > 0 ? 'var(--danger)' : 'inherit'};">
                    ${v.due > 0 ? fmtMoney(v.due) : 'Nil'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      };

      box.querySelector('#rpt-mon-month').addEventListener('change', renderMonthly);
      box.querySelector('#rpt-mon-area').addEventListener('input', renderMonthly);
      box.querySelector('#rpt-mon-due').addEventListener('change', renderMonthly);

      renderMonthly();
    }
  };

  // Attach Sub-nav Tab Listeners
  container.querySelector('#rpt-tab-area').addEventListener('click', () => {
    activeTab = 'area';
    updateActiveButtons();
    renderCurrentReport();
  });
  container.querySelector('#rpt-tab-refdr').addEventListener('click', () => {
    activeTab = 'refdr';
    updateActiveButtons();
    renderCurrentReport();
  });
  container.querySelector('#rpt-tab-pat').addEventListener('click', () => {
    activeTab = 'patient';
    updateActiveButtons();
    renderCurrentReport();
  });
  container.querySelector('#rpt-tab-col').addEventListener('click', () => {
    activeTab = 'collection';
    updateActiveButtons();
    renderCurrentReport();
  });
  container.querySelector('#rpt-tab-monthly').addEventListener('click', () => {
    activeTab = 'monthly';
    updateActiveButtons();
    renderCurrentReport();
  });

  function updateActiveButtons() {
    container.querySelectorAll('[id^="rpt-tab-"]').forEach((btn) => {
      btn.className = 'cms-btn cms-btn-ghost';
    });
    const current = container.querySelector(`#rpt-tab-${activeTab === 'collection' ? 'col' : activeTab === 'patient' ? 'pat' : activeTab}`);
    if (current) current.className = 'cms-btn cms-btn-primary';
  }

  renderCurrentReport();
}
