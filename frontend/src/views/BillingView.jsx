import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocalDB, saveLocalDB, fmtMoney, fmtDate, todayISO, showToast, pad } from '../services/api';

export default function BillingView() {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [bills, setBills] = useState([]);
  const [filter, setFilter] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [totalCharge, setTotalCharge] = useState(500);
  const [paidAmount, setPaidAmount] = useState(500);

  useEffect(() => {
    loadBills();
  }, [clinicId]);

  const loadBills = () => {
    const db = getLocalDB(clinicId);
    setBills(db.bills || []);
  };

  const handleCreateBill = (e) => {
    e.preventDefault();
    if (!patientName.trim()) {
      showToast('Patient name is required', 'error');
      return;
    }

    const dueAmount = Math.max(0, Number(totalCharge) - Number(paidAmount));
    const year = new Date().getFullYear();
    const count = bills.length + 1;
    const billNo = `INV-${year}-${pad(count, 5)}`;

    const newBill = {
      billNo,
      patientName: patientName.trim().toUpperCase(),
      patientId: 'WALK-IN',
      billDate: todayISO(),
      totalCharge: Number(totalCharge),
      paidAmount: Number(paidAmount),
      dueAmount,
      status: dueAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Due',
    };

    const db = getLocalDB(clinicId);
    if (!db.bills) db.bills = [];
    db.bills.unshift(newBill);
    saveLocalDB(clinicId, db);

    setBills([newBill, ...bills]);
    showToast(`Bill #${billNo} generated.`);
    setIsCreating(false);
    setPatientName('');
    setTotalCharge(500);
    setPaidAmount(500);
  };

  const handleSettleDue = (billNo) => {
    const db = getLocalDB(clinicId);
    const b = (db.bills || []).find((item) => item.billNo === billNo);
    if (b) {
      b.paidAmount = b.totalCharge;
      b.dueAmount = 0;
      b.status = 'Paid';
      saveLocalDB(clinicId, db);
      loadBills();
      showToast(`Bill #${billNo} marked as fully settled.`);
    }
  };

  const filteredBills = bills.filter((b) => {
    const q = filter.toLowerCase().trim();
    if (!q) return true;
    return (
      b.billNo.toLowerCase().includes(q) ||
      b.patientName.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="cms-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
            <i className="fa-solid fa-file-invoice-dollar" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
            Clinic Billing &amp; Due Balances
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Invoice receipts, fee collections, and outstanding payment tracking
          </p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          onClick={() => setIsCreating(!isCreating)}
        >
          <i className={`fa-solid ${isCreating ? 'fa-xmark' : 'fa-plus'}`}></i>
          {isCreating ? 'Close Form' : 'Create Invoice'}
        </button>
      </div>

      {isCreating && (
        <div className="cms-card" style={{ marginBottom: '20px', border: '1.5px solid var(--primary)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: 'var(--primary)' }}>
            Generate New Patient Bill
          </h3>
          <form onSubmit={handleCreateBill}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Patient Full Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="e.g. PATEL RAMESHBHAI"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Total Charge (₹)
                </label>
                <input
                  type="number"
                  className="cms-input font-mono"
                  value={totalCharge}
                  onChange={(e) => setTotalCharge(e.target.value)}
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Amount Paid (₹)
                </label>
                <input
                  type="number"
                  className="cms-input font-mono"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="cms-btn cms-btn-outline" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Save Invoice
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="cms-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
            Invoices History ({filteredBills.length})
          </span>
          <div style={{ width: '220px' }}>
            <input
              type="text"
              className="cms-input"
              placeholder="Search invoices..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="cms-table-responsive">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient Name</th>
                <th>Date</th>
                <th>Total (₹)</th>
                <th>Paid (₹)</th>
                <th>Due (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((b) => (
                <tr key={b.billNo}>
                  <td>
                    <span className="cms-pill font-mono" style={{ fontSize: '11px', fontWeight: 700 }}>
                      {b.billNo}
                    </span>
                  </td>
                  <td><strong>{b.patientName}</strong></td>
                  <td>{fmtDate(b.billDate)}</td>
                  <td className="font-mono">{fmtMoney(b.totalCharge)}</td>
                  <td className="font-mono" style={{ color: '#059669', fontWeight: 600 }}>{fmtMoney(b.paidAmount)}</td>
                  <td className="font-mono">
                    {Number(b.dueAmount) > 0 ? (
                      <span className="cms-pill cms-badge-due">{fmtMoney(b.dueAmount)}</span>
                    ) : (
                      <span className="cms-pill cms-badge-paid">Clear</span>
                    )}
                  </td>
                  <td>
                    <span className={`cms-pill ${b.status === 'Paid' ? 'cms-badge-paid' : 'cms-badge-due'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {Number(b.dueAmount) > 0 && (
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        onClick={() => handleSettleDue(b.billNo)}
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                      >
                        <i className="fa-solid fa-check"></i> Settle Due
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
