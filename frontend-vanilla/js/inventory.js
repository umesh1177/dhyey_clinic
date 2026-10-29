/**
 * =========================================================
 * CLINIC INVENTORY & STOCK MANAGEMENT CONTROLLER
 * =========================================================
 */

import { apiFetch, showToast, fmtMoney } from './api.js';

export async function renderInventoryView(container) {
  let items = [];
  let lowStockCount = 0;

  try {
    const res = await apiFetch('/inventory');
    if (res && res.data) {
      items = res.data;
      lowStockCount = res.lowStockCount || 0;
    }
  } catch (e) {}

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Stock Overview Header -->
      <div style="display: flex; gap: 14px;">
        <div class="cms-stat-card" style="flex: 1;">
          <div class="cms-stat-top">
            <div class="cms-stat-icon"><i class="fa-solid fa-boxes-stacked"></i></div>
            <span class="cms-kbd">Total Items</span>
          </div>
          <div class="cms-stat-value">${items.length}</div>
          <div class="cms-stat-label">Inventory Products</div>
        </div>

        <div class="cms-stat-card tone-danger" style="flex: 1;">
          <div class="cms-stat-top">
            <div class="cms-stat-icon" style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <span class="cms-kbd">Attention</span>
          </div>
          <div class="cms-stat-value" style="color: var(--danger);">${lowStockCount}</div>
          <div class="cms-stat-label">Low Stock Alerts</div>
        </div>
      </div>

      <!-- Add New Stock Item -->
      <div class="cms-card">
        <div class="cms-card-header">
          <div class="cms-card-title">Add Stock Item</div>
        </div>
        <form id="form-add-stock" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto; gap: 12px; align-items: end;">
          <div class="cms-form-group">
            <label class="cms-label">Item / Medicine Name *</label>
            <input type="text" id="inv-name" class="cms-input" placeholder="e.g. Disposable Syringe 5ml" required />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Batch No.</label>
            <input type="text" id="inv-batch" class="cms-input" placeholder="e.g. BT-908" />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Quantity</label>
            <input type="number" id="inv-qty" class="cms-input" placeholder="100" value="100" required />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Unit</label>
            <input type="text" id="inv-unit" class="cms-input" placeholder="Pcs / Box" value="Pcs" />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Reorder Level</label>
            <input type="number" id="inv-reorder" class="cms-input" placeholder="20" value="20" />
          </div>
          <button type="submit" class="cms-btn cms-btn-primary" style="height: 42px;">
            <span><i class="fa-solid fa-boxes-packing"></i></span>
            <span>Add Stock</span>
          </button>
        </form>
      </div>

      <!-- Stock Table -->
      <div class="cms-card">
        <div class="cms-card-header">
          <div class="cms-card-title">Inventory Stock List</div>
        </div>
        <div class="cms-table-wrapper">
          <table class="cms-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Batch No.</th>
                <th>Available Quantity</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                items.length === 0
                  ? `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No inventory items recorded yet.</td></tr>`
                  : items
                      .map(
                        (i) => `
                      <tr>
                        <td><b>${i.itemName}</b></td>
                        <td class="font-mono">${i.batchNo || '-'}</td>
                        <td class="font-mono" style="font-weight: 700; font-size: 15px;">${i.quantity}</td>
                        <td>${i.unit || 'Units'}</td>
                        <td>
                          <span class="cms-pill ${i.quantity <= i.reorderLevel ? 'cms-badge-due' : 'cms-badge-paid'}">
                            ${i.quantity <= i.reorderLevel ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td>
                          <button type="button" class="cms-btn-ghost btn-adjust-stock" data-id="${i._id || i.id}" style="padding: 4px 8px; font-size: 12px;"><i class="fa-solid fa-plus"></i> Add 10</button>
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
    </div>
  `;

  // Form Submit
  const form = container.querySelector('#form-add-stock');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemName = container.querySelector('#inv-name').value.trim();
    const batchNo = container.querySelector('#inv-batch').value.trim();
    const quantity = Number(container.querySelector('#inv-qty').value || 0);
    const unit = container.querySelector('#inv-unit').value.trim();
    const reorderLevel = Number(container.querySelector('#inv-reorder').value || 10);

    try {
      await apiFetch('/inventory', {
        method: 'POST',
        body: { itemName, batchNo, quantity, unit, reorderLevel },
      });
      showToast(`${itemName} added to inventory`);
      renderInventoryView(container);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Adjust Stock Action
  container.querySelectorAll('.btn-adjust-stock').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await apiFetch(`/inventory/${id}/stock`, {
          method: 'PUT',
          body: { quantityChange: 10 },
        });
        showToast('Stock quantity updated (+10)');
        renderInventoryView(container);
      } catch (e) {}
    });
  });
}
