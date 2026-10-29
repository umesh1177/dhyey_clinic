/**
 * =========================================================
 * BILLING & INVOICE MANAGEMENT CONTROLLER
 * =========================================================
 */

import { apiFetch, fmtDate, fmtMoney, showToast } from './api.js';

export async function renderBillingView(container) {
  let bills = [];
  try {
    const res = await apiFetch('/billing');
    if (res && res.data) bills = res.data;
  } catch (e) {}

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Billing Header & Search -->
      <div class="cms-card">
        <div class="cms-card-header">
          <div class="cms-card-title">Patient Invoices &amp; Bills (${bills.length})</div>
        </div>
        <div class="cms-table-wrapper">
          <table class="cms-table">
            <thead>
              <tr>
                <th>Bill No.</th>
                <th>Date</th>
                <th>Patient Name</th>
                <th>Total Charge</th>
                <th>Paid Amount</th>
                <th>Due Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                bills.length === 0
                  ? `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No bills generated yet. Bills are automatically created with each visit.</td></tr>`
                  : bills
                      .map(
                        (b) => `
                      <tr>
                        <td class="font-mono" style="font-weight: 800; color: var(--primary);">${b.billNo}</td>
                        <td class="font-mono">${fmtDate(b.billDate)}</td>
                        <td><b>${b.patientName}</b></td>
                        <td class="font-mono">${fmtMoney(b.totalCharge)}</td>
                        <td class="font-mono" style="color: var(--success); font-weight: 700;">${fmtMoney(b.paidAmount)}</td>
                        <td class="font-mono" style="color: var(--danger); font-weight: 700;">${fmtMoney(b.dueAmount)}</td>
                        <td><span class="cms-pill ${b.status === 'Paid' ? 'cms-badge-paid' : 'cms-badge-due'}">${b.status}</span></td>
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
}
