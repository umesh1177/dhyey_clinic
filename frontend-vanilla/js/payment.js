/**
 * =========================================================
 * PAYMENT COLLECTION & RECEIPTS CONTROLLER
 * =========================================================
 */

import { apiFetch, fmtDate, fmtMoney, todayISO, showToast } from './api.js';

export async function renderPaymentView(container) {
  let payments = [];
  let totalCollected = 0;

  try {
    const res = await apiFetch('/payments');
    if (res && res.data) {
      payments = res.data;
      totalCollected = res.totalCollected || 0;
    }
  } catch (e) {}

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Record Payment Card -->
      <div class="cms-card">
        <div class="cms-card-header">
          <div class="cms-card-title">Record Payment Receipt</div>
          <div class="font-mono" style="font-size: 16px; font-weight: 800; color: var(--success);">
            Total Collected: ${fmtMoney(totalCollected)}
          </div>
        </div>
        <form id="form-record-pay" style="display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.5fr auto; gap: 12px; align-items: end;">
          <div class="cms-form-group">
            <label class="cms-label">Patient ID *</label>
            <input type="text" id="pay-pat-id" class="cms-input" placeholder="e.g. 0001" required />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Amount (₹) *</label>
            <input type="number" id="pay-amount" class="cms-input" placeholder="500" required />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Payment Method</label>
            <select id="pay-method" class="cms-select">
              <option value="Cash">Cash</option>
              <option value="UPI">UPI (GPay / PhonePe)</option>
              <option value="Card">Card</option>
              <option value="NetBanking">Net Banking</option>
            </select>
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Remarks / Case ID</label>
            <input type="text" id="pay-remarks" class="cms-input" placeholder="e.g. Cleared due for visit 1" />
          </div>
          <button type="submit" class="cms-btn cms-btn-primary" style="height: 42px;">
            <span><i class="fa-solid fa-indian-rupee-sign"></i></span>
            <span>Receive Payment</span>
          </button>
        </form>
      </div>

      <!-- Payment Receipts Table -->
      <div class="cms-card">
        <div class="cms-card-header">
          <div class="cms-card-title">Payment Receipts Log (${payments.length})</div>
        </div>
        <div class="cms-table-wrapper">
          <table class="cms-table">
            <thead>
              <tr>
                <th>Receipt No.</th>
                <th>Date</th>
                <th>Patient Name</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${
                payments.length === 0
                  ? `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No payments recorded yet.</td></tr>`
                  : payments
                      .map(
                        (p) => `
                      <tr>
                        <td class="font-mono" style="font-weight: 800; color: var(--primary);">${p.receiptNo}</td>
                        <td class="font-mono">${fmtDate(p.paymentDate)}</td>
                        <td><b>${p.patientName}</b> <span class="cms-kbd">PT ${p.patientId}</span></td>
                        <td class="font-mono" style="color: var(--success); font-weight: 800;">${fmtMoney(p.amount)}</td>
                        <td><span class="cms-pill cms-badge-paid">${p.paymentMethod || 'Cash'}</span></td>
                        <td>${p.remarks || '-'}</td>
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

  const form = container.querySelector('#form-record-pay');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = container.querySelector('#pay-pat-id').value.trim();
    const amount = Number(container.querySelector('#pay-amount').value || 0);
    const paymentMethod = container.querySelector('#pay-method').value;
    const remarks = container.querySelector('#pay-remarks').value.trim();

    try {
      await apiFetch('/payments', {
        method: 'POST',
        body: { patientId, amount, paymentMethod, remarks },
      });
      showToast(`Payment of ₹${amount} received!`);
      renderPaymentView(container);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
