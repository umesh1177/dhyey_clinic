import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocalDB, saveLocalDB, showToast, uid, fmtMoney } from '../services/api';

export default function InventoryView() {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Form
  const [itemName, setItemName] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [reorderLevel, setReorderLevel] = useState(30);
  const [unitPrice, setUnitPrice] = useState(10);

  useEffect(() => {
    loadInventory();
  }, [clinicId]);

  const loadInventory = () => {
    const db = getLocalDB(clinicId);
    setItems(db.inventory || []);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      showToast('Item name is required', 'error');
      return;
    }

    const newItem = {
      id: `inv_${uid()}`,
      itemName: itemName.trim(),
      batchNo: batchNo.trim() || 'B-001',
      quantity: Number(quantity) || 0,
      reorderLevel: Number(reorderLevel) || 10,
      unitPrice: Number(unitPrice) || 0,
    };

    const db = getLocalDB(clinicId);
    if (!db.inventory) db.inventory = [];
    db.inventory.unshift(newItem);
    saveLocalDB(clinicId, db);

    setItems([newItem, ...items]);
    showToast(`Stock item "${newItem.itemName}" added.`);
    setIsAdding(false);
    setItemName('');
    setBatchNo('');
  };

  const adjustStock = (id, change) => {
    const db = getLocalDB(clinicId);
    const item = (db.inventory || []).find((i) => i.id === id);
    if (item) {
      item.quantity = Math.max(0, item.quantity + change);
      saveLocalDB(clinicId, db);
      loadInventory();
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this stock item?')) return;
    const db = getLocalDB(clinicId);
    db.inventory = (db.inventory || []).filter((i) => i.id !== id);
    saveLocalDB(clinicId, db);
    setItems(db.inventory);
    showToast('Item removed from inventory.');
  };

  const filteredItems = items.filter((i) => {
    const q = filter.toLowerCase().trim();
    if (!q) return true;
    return (
      i.itemName.toLowerCase().includes(q) ||
      i.batchNo.toLowerCase().includes(q)
    );
  });

  const lowStockCount = items.filter((i) => i.quantity <= i.reorderLevel).length;

  return (
    <div className="cms-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
            <i className="fa-solid fa-boxes-stacked" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
            Pharmacy Stock &amp; Drug Inventory
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Track in-house medicine stocks, batch numbers, and reorder alerts
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {lowStockCount > 0 && (
            <span className="cms-pill" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700, padding: '6px 12px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
              {lowStockCount} Low Stock
            </span>
          )}
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setIsAdding(!isAdding)}
          >
            <i className={`fa-solid ${isAdding ? 'fa-xmark' : 'fa-plus'}`}></i>
            {isAdding ? 'Close Form' : 'Add Stock Item'}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="cms-card" style={{ marginBottom: '20px', border: '1.5px solid var(--primary)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: 'var(--primary)' }}>
            New Stock Item Entry
          </h3>
          <form onSubmit={handleAddItem}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Item Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="e.g. Paracetamol 650mg"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Batch No
                </label>
                <input
                  type="text"
                  className="cms-input font-mono"
                  placeholder="e.g. B-101"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Quantity
                </label>
                <input
                  type="number"
                  className="cms-input font-mono"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Reorder Level
                </label>
                <input
                  type="number"
                  className="cms-input font-mono"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Unit Price (₹)
                </label>
                <input
                  type="number"
                  className="cms-input font-mono"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="cms-btn cms-btn-outline" onClick={() => setIsAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Add to Stock
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="cms-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
            Inventory Items ({filteredItems.length})
          </span>
          <div style={{ width: '220px' }}>
            <input
              type="text"
              className="cms-input"
              placeholder="Search items..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="cms-table-responsive">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Medicine / Item</th>
                <th>Batch #</th>
                <th>Available Stock</th>
                <th>Reorder Level</th>
                <th>Unit Price</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Quick Adjust / Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isLow = item.quantity <= item.reorderLevel;
                return (
                  <tr key={item.id}>
                    <td><strong>{item.itemName}</strong></td>
                    <td className="font-mono">{item.batchNo || '-'}</td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '14px', fontWeight: 700 }}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="font-mono">{item.reorderLevel}</td>
                    <td className="font-mono">{fmtMoney(item.unitPrice)}</td>
                    <td>
                      {isLow ? (
                        <span className="cms-pill" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                          Low Stock
                        </span>
                      ) : (
                        <span className="cms-pill cms-badge-paid">In Stock</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          onClick={() => adjustStock(item.id, -10)}
                          title="Deduct 10 units"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          onClick={() => adjustStock(item.id, 10)}
                          title="Add 10 units"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost text-danger"
                          onClick={() => handleDelete(item.id)}
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
