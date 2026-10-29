/**
 * =========================================================
 * PATIENT FOLLOW-UP & REVISIT REMINDERS CONTROLLER
 * =========================================================
 */

import { apiFetch, todayISO, fmtDate, showToast } from './api.js';

export async function renderFollowUpsView(container) {
  let followUps = [];
  try {
    const res = await apiFetch('/followups');
    if (res && res.data) followUps = res.data;
  } catch (e) {}

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Schedule Follow-Up Form -->
      <div class="cms-card">
        <div class="cms-card-header">
          <div class="cms-card-title">Schedule Patient Follow-up</div>
        </div>
        <form id="form-add-followup" style="display: grid; grid-template-columns: 1fr 1.5fr 1fr 1.5fr auto; gap: 12px; align-items: end;">
          <div class="cms-form-group">
            <label class="cms-label">Patient ID *</label>
            <input type="text" id="fu-pat-id" class="cms-input" placeholder="e.g. 0001" required />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Patient Name</label>
            <input type="text" id="fu-pat-name" class="cms-input" placeholder="Auto-filled or manual" />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Follow-up Date *</label>
            <input type="date" id="fu-date" class="cms-input" value="${todayISO()}" required />
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Clinical Reason</label>
            <input type="text" id="fu-reason" class="cms-input" placeholder="e.g. Blood Sugar Recheck, BP Review" />
          </div>
          <button type="submit" class="cms-btn cms-btn-primary" style="height: 42px;">
            <span><i class="fa-solid fa-bell"></i></span>
            <span>Schedule</span>
          </button>
        </form>
      </div>

      <!-- Follow-Ups Directory Table -->
      <div class="cms-card">
        <div class="cms-card-header">
          <div class="cms-card-title">Pending &amp; Scheduled Follow-ups (${followUps.length})</div>
        </div>
        <div class="cms-table-wrapper">
          <table class="cms-table">
            <thead>
              <tr>
                <th>Scheduled Date</th>
                <th>Patient Name</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                followUps.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No follow-ups scheduled yet.</td></tr>`
                  : followUps
                      .map(
                        (f) => `
                      <tr>
                        <td class="font-mono"><b>${fmtDate(f.followUpDate)}</b></td>
                        <td><b>${f.patientName}</b> <span class="cms-kbd">PT ${f.patientId}</span></td>
                        <td>${f.reason || 'General Review'}</td>
                        <td><span class="cms-pill ${f.status === 'Completed' ? 'cms-badge-paid' : 'cms-badge-due'}">${f.status || 'Pending'}</span></td>
                        <td>
                          <button type="button" class="cms-btn-ghost btn-complete-fu" data-id="${f._id || f.id}" style="padding: 4px 8px; font-size: 12px;"><i class="fa-solid fa-check"></i> Visited</button>
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

  const form = container.querySelector('#form-add-followup');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = container.querySelector('#fu-pat-id').value.trim();
    const patientName = container.querySelector('#fu-pat-name').value.trim() || 'Patient';
    const followUpDate = container.querySelector('#fu-date').value;
    const reason = container.querySelector('#fu-reason').value.trim();

    try {
      await apiFetch('/followups', {
        method: 'POST',
        body: { patientId, patientName, followUpDate, reason },
      });
      showToast('Follow-up scheduled successfully');
      renderFollowUpsView(container);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelectorAll('.btn-complete-fu').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await apiFetch(`/followups/${id}`, {
          method: 'PUT',
          body: { status: 'Completed' },
        });
        showToast('Follow-up marked as completed');
        renderFollowUpsView(container);
      } catch (e) {}
    });
  });
}
