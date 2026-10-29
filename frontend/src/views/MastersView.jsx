import React, { useState, useEffect } from 'react';
import {
  getSharedMasterCollection,
  saveSharedMasterCollection,
  showToast,
  uid,
} from '../services/api';

export default function MastersView() {
  const [activeTab, setActiveTab] = useState('complaints');
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');

  // Add Item Modal / Inputs State
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [defaultDosage, setDefaultDosage] = useState('1-0-1 AF');

  const tabs = [
    { key: 'complaints', label: 'Chief Complaints', icon: 'fa-stethoscope' },
    { key: 'investigations', label: 'Investigations / Labs', icon: 'fa-vial' },
    { key: 'medicines', label: 'Medicines & Drugs', icon: 'fa-pills' },
    { key: 'allergies', label: 'Allergies', icon: 'fa-triangle-exclamation' },
    { key: 'relations', label: 'Family Relations', icon: 'fa-people-arrows' },
    { key: 'areas', label: 'City Areas & Localities', icon: 'fa-map-pin' },
  ];

  useEffect(() => {
    loadMasterData(activeTab);
  }, [activeTab]);

  const loadMasterData = (type) => {
    const list = getSharedMasterCollection(type);
    setItems(list || []);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name is required.', 'error');
      return;
    }

    const newItem = {
      id: `${activeTab}_${uid()}`,
      name: name.trim(),
      category: category.trim() || 'General',
      description: description.trim(),
      unitPrice: Number(unitPrice) || 0,
      defaultDosage: defaultDosage.trim(),
    };

    const updated = [newItem, ...items];
    setItems(updated);
    saveSharedMasterCollection(activeTab, updated);
    showToast(`Added "${newItem.name}" to ${activeTab} master.`);

    // Reset
    setName('');
    setDescription('');
    setUnitPrice(0);
    setIsAdding(false);
  };

  const handleDeleteItem = (id) => {
    if (!window.confirm('Delete this master entry?')) return;
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    saveSharedMasterCollection(activeTab, updated);
    showToast('Master item removed.');
  };

  const filteredItems = items.filter((i) => {
    const q = filter.toLowerCase().trim();
    if (!q) return true;
    return (
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.category && i.category.toLowerCase().includes(q)) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="cms-page-container">
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
            <i className="fa-solid fa-layer-group" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
            Master Data Configuration (F7)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage complaints, investigations, drugs, allergies, relations, and localities
          </p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          onClick={() => setIsAdding(!isAdding)}
        >
          <i className={`fa-solid ${isAdding ? 'fa-xmark' : 'fa-plus'}`}></i>
          {isAdding ? 'Close Form' : `Add ${tabs.find((t) => t.key === activeTab)?.label.slice(0, -1) || 'Item'}`}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div
        className="cms-card"
        style={{
          padding: '8px',
          marginBottom: '20px',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className="cms-btn-ghost"
            onClick={() => {
              setActiveTab(tab.key);
              setIsAdding(false);
              setFilter('');
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.key ? '#ffffff' : 'var(--text)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Add New Item Drawer / Form */}
      {isAdding && (
        <div className="cms-card" style={{ marginBottom: '20px', border: '1.5px solid var(--primary)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px', color: 'var(--primary)' }}>
            New {tabs.find((t) => t.key === activeTab)?.label} Entry
          </h3>
          <form onSubmit={handleAddItem}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Item Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Category
                </label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="e.g. Respiratory, General"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              {activeTab === 'medicines' && (
                <>
                  <div>
                    <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                      Unit Price (₹)
                    </label>
                    <input
                      type="number"
                      className="cms-input"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                      Default Dosage
                    </label>
                    <input
                      type="text"
                      className="cms-input"
                      placeholder="1-0-1 AF"
                      value={defaultDosage}
                      onChange={(e) => setDefaultDosage(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Notes / Description
                </label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="Optional details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="cms-btn cms-btn-outline" onClick={() => setIsAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Save to Master
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items Table Card */}
      <div className="cms-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
            Showing {filteredItems.length} records in {tabs.find((t) => t.key === activeTab)?.label}
          </span>
          <div style={{ width: '240px' }}>
            <input
              type="text"
              className="cms-input"
              placeholder="Search in this master..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="cms-table-responsive">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                {activeTab === 'medicines' && <th>Unit Price</th>}
                {activeTab === 'medicines' && <th>Default Dosage</th>}
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <span className="cms-pill" style={{ fontSize: '11px' }}>
                      {item.category || 'General'}
                    </span>
                  </td>
                  {activeTab === 'medicines' && <td className="font-mono">₹{item.unitPrice || 0}</td>}
                  {activeTab === 'medicines' && <td>{item.defaultDosage || '-'}</td>}
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {item.description || '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost text-danger"
                      onClick={() => handleDeleteItem(item.id)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
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
