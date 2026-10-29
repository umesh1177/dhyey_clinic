/**
 * =========================================================
 * MEDICINE MASTER CATALOGUE CONTROLLER
 * =========================================================
 */

import { apiFetch, showToast, fmtMoney } from './api.js';

export async function renderMedicineList(container) {
  let medicines = [];
  try {
    const res = await apiFetch('/medicines');
    if (res && res.data) medicines = res.data;
  } catch (e) {}

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Add New Medicine Form -->
      <div class="cms-card">
        <div class="cms-card-header">
          <div class="cms-card-title">Add New Medicine to Catalogue</div>
        </div>
        <form id="form-add-med" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto; gap: 12px; align-items: end;">
          <div class="cms-form-group">
            <label class="cms-label">Medicine Brand Name *</label>
            <input type="text" id="med-name" class="cms-input" placeholder="e.g. Paracetamol 650mg" required />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Category</label>
            <input type="text" id="med-cat" class="cms-input" placeholder="Antipyretic, Antibiotic" />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Form</label>
            <select id="med-form" class="cms-select">
              <option value="Tablet">Tablet</option>
              <option value="Capsule">Capsule</option>
              <option value="Syrup">Syrup</option>
              <option value="Injection">Injection</option>
              <option value="Ointment">Ointment</option>
            </select>
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Default Dosage</label>
            <input type="text" id="med-dose" class="cms-input" placeholder="1-0-1" value="1-0-1" />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Unit Price (₹)</label>
            <input type="number" id="med-price" class="cms-input" placeholder="5" value="5" />
          </div>
          <button type="submit" class="cms-btn cms-btn-primary" style="height: 42px;">
            <span><i class="fa-solid fa-plus"></i></span>
            <span>Add Medicine</span>
          </button>
        </form>
      </div>

      <!-- Medicine Master Table -->
      <div class="cms-card">
        <div class="cms-card-header">
          <div class="cms-card-title">Medicines Catalogue (${medicines.length})</div>
        </div>
        <div class="cms-table-wrapper">
          <table class="cms-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Form</th>
                <th>Default Dosage</th>
                <th>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              ${
                medicines.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">Loading medicines...</td></tr>`
                  : medicines
                      .map(
                        (m) => `
                      <tr>
                        <td><b>${m.name}</b></td>
                        <td><span class="cms-pill cms-badge-neutral">${m.category || 'General'}</span></td>
                        <td>${m.form || 'Tablet'}</td>
                        <td class="font-mono">${m.defaultDosage || '1-0-1'}</td>
                        <td class="font-mono" style="font-weight: 700;">${fmtMoney(m.unitPrice)}</td>
                      </tr>
                    `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#form-add-med');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = container.querySelector('#med-name').value.trim();
    const category = container.querySelector('#med-cat').value.trim();
    const formType = container.querySelector('#med-form').value;
    const defaultDosage = container.querySelector('#med-dose').value.trim();
    const unitPrice = Number(container.querySelector('#med-price').value || 0);

    try {
      await apiFetch('/medicines', {
        method: 'POST',
        body: { name, category, form: formType, defaultDosage, unitPrice },
      });
      showToast(`${name} added to catalogue`);
      renderMedicineList(container);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
