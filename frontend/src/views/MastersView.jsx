import React, { useState, useEffect } from 'react';
import {
  getSharedMasterCollection,
  saveSharedMasterCollection,
  showToast,
  uid,
} from '../services/api';

const DEFAULT_DIETARY = [
  {
    id: 'diet_1', code: 'DB',
    eat: 'Green leafy vegetables, whole grains, pulses, salads, bitter gourd, fresh water',
    notEat: 'Direct sugar, sweets, jaggery, potatoes, mangoes, bananas, bakery products, soft drinks',
    date: '10/01/2026'
  },
  {
    id: 'diet_2', code: 'BP',
    eat: 'Fresh fruits, vegetables, oats, garlic, coconut water, low-sodium foods',
    notEat: 'Extra salt, pickles, papad, processed cheese, namkeen, fried snacks, canned food',
    date: '10/01/2026'
  },
  {
    id: 'diet_3', code: 'ACID',
    eat: 'Cold milk, coconut water, bananas, boiled vegetables, oatmeal, light meals',
    notEat: 'Spicy curries, oily/fried foods, tea, coffee, citrus fruits, late night heavy meals',
    date: '10/01/2026'
  },
  {
    id: 'diet_4', code: 'THYROID',
    eat: 'Iodized salt, eggs, nuts, whole grains, roasted pumpkin seeds, fresh fruits',
    notEat: 'Raw cabbage, cauliflower, broccoli, soy products, gluten, processed junk',
    date: '10/01/2026'
  },
  {
    id: 'diet_5', code: 'URIC',
    eat: 'Cherries, lemons, fresh vegetables, high fluid intake, low-fat curd, water (3-4L)',
    notEat: 'Red meat, seafood, organ meats, beer/alcohol, sugary drinks, high-purine pulses',
    date: '10/01/2026'
  },
  {
    id: 'diet_6', code: 'CV',
    eat: 'Oats, flaxseeds, almonds, olive oil, boiled vegetables, garlic, apples',
    notEat: 'Red meat, butter, ghee, fried snacks, trans fats, packaged/processed fast foods',
    date: '10/01/2026'
  },
  {
    id: 'diet_7', code: 'LQ',
    eat: 'Plenty of warm fluids, coconut water, dal water, khichdi, soup, boiled water',
    notEat: 'Cold beverages, oily food, heavy spicy meals, street food, hard-to-digest items',
    date: '10/01/2026'
  },
];

const MASTER_TABS = [
  { key: 'dietary', label: 'Dietary Suggestions', count: 7, icon: 'fa-utensils' },
  { key: 'complaints', label: 'Complaints', count: 12, icon: 'fa-comment-medical' },
  { key: 'investigations', label: 'Investigations (Reports)', count: 14, icon: 'fa-flask-vial' },
  { key: 'areas', label: 'Area / Location', count: 12, icon: 'fa-location-dot' },
  { key: 'medicines', label: 'Medicine Catalogue', count: 47, icon: 'fa-pills' },
  { key: 'allergies', label: 'Known Allergies', count: 9, icon: 'fa-shield-halved' },
  { key: 'relations', label: 'Relation to Head', count: 14, icon: 'fa-users' },
  { key: 'societies', label: 'Society / Flat', count: 9, icon: 'fa-building' },
  { key: 'navigation', label: 'Navigation Shortcuts', count: 10, icon: 'fa-keyboard' },
];

export default function MastersView() {
  const [activeTab, setActiveTab] = useState('dietary');
  const [dietaryItems, setDietaryItems] = useState(DEFAULT_DIETARY);
  const [genericItems, setGenericItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // New form fields
  const [newCode, setNewCode] = useState('');
  const [newEat, setNewEat] = useState('');
  const [newNotEat, setNewNotEat] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (activeTab === 'dietary') {
      try {
        const raw = localStorage.getItem('clinic_master_dietary');
        if (raw) setDietaryItems(JSON.parse(raw));
        else setDietaryItems(DEFAULT_DIETARY);
      } catch (e) {
        setDietaryItems(DEFAULT_DIETARY);
      }
    } else {
      const list = getSharedMasterCollection(activeTab);
      setGenericItems(list || []);
    }
  }, [activeTab]);

  const handleAddDietary = (e) => {
    e.preventDefault();
    if (!newCode.trim() || !newEat.trim()) {
      showToast('Shortcut code and advice are required.', 'error');
      return;
    }
    const item = {
      id: `diet_${uid()}`,
      code: newCode.trim().toUpperCase(),
      eat: newEat.trim(),
      notEat: newNotEat.trim(),
      date: '10/01/2026',
    };
    const updated = [...dietaryItems, item];
    setDietaryItems(updated);
    localStorage.setItem('clinic_master_dietary', JSON.stringify(updated));
    showToast(`Added dietary shortcut +${item.code}`);
    setNewCode(''); setNewEat(''); setNewNotEat(''); setIsAdding(false);
  };

  const handleDeleteDietary = (id) => {
    if (!window.confirm('Delete this dietary template?')) return;
    const updated = dietaryItems.filter(i => i.id !== id);
    setDietaryItems(updated);
    localStorage.setItem('clinic_master_dietary', JSON.stringify(updated));
    showToast('Dietary template removed.');
  };

  const handleAddGeneric = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const item = { id: `${activeTab}_${uid()}`, name: newName.trim(), createdAt: '10/01/2026' };
    const updated = [...genericItems, item];
    setGenericItems(updated);
    saveSharedMasterCollection(activeTab, updated);
    showToast(`Added ${item.name}`);
    setNewName(''); setIsAdding(false);
  };

  const filteredDietary = dietaryItems.filter(i => {
    const q = filter.toLowerCase().trim();
    if (!q) return true;
    return i.code.toLowerCase().includes(q) || i.eat.toLowerCase().includes(q) || i.notEat.toLowerCase().includes(q);
  });

  const filteredGeneric = genericItems.filter(i => {
    const q = filter.toLowerCase().trim();
    if (!q) return true;
    return (i.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="cms-page-container" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* ── TOP BANNER (Screenshot 5) ── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
          }}>
            <i className="fa-solid fa-layer-group" />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 2px', color: 'var(--text)' }}>
              Clinical Master Data &amp; Shortcuts
            </h2>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Manage shared clinical master catalogues, clinic-specific shortcuts, and navigation hotkeys.
            </span>
          </div>
        </div>

        <span style={{
          background: '#e6f4f1', color: 'var(--primary)', borderRadius: '12px',
          padding: '4px 12px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <i className="fa-solid fa-cloud-arrow-up" /> Auto-Synced Master
        </span>
      </div>

      {/* ── TABS BAR (9 pills in grid/row) ── */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'
      }}>
        {MASTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setIsAdding(false); setFilter(''); }}
              style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700,
                background: isActive ? 'var(--primary)' : 'var(--surface)',
                color: isActive ? '#fff' : 'var(--text)',
                border: '1px solid var(--border)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
              }}
            >
              <i className={`fa-solid ${tab.icon}`} />
              <span>{tab.label}</span>
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--surface-alt)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                borderRadius: '8px', padding: '1px 6px', fontSize: '11px', fontWeight: 800
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN CONTENT CARD ── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        
        {/* Header + Search + Action Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              {MASTER_TABS.find(t => t.key === activeTab)?.label} Templates
            </h3>
            <span style={{ background: 'var(--surface-alt)', borderRadius: '6px', padding: '2px 8px', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {activeTab === 'dietary' ? `${dietaryItems.length} Templates` : `${genericItems.length} Entries`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }} />
              <input
                type="text"
                className="cms-input"
                style={{ height: '34px', width: '220px', paddingLeft: '30px', fontSize: '12.5px' }}
                placeholder="Search shortcut or food items..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => setIsAdding(!isAdding)}
              style={{ fontSize: '12.5px', padding: '7px 14px', borderRadius: '7px', fontWeight: 700 }}
            >
              <i className="fa-solid fa-plus" /> + Add {activeTab === 'dietary' ? 'Dietary Suggestion' : 'Item'}
            </button>
          </div>
        </div>

        {/* Add Form Drawer */}
        {isAdding && activeTab === 'dietary' && (
          <form onSubmit={handleAddDietary} style={{
            background: 'var(--surface-alt)', border: '1.5px solid var(--primary)', borderRadius: '8px', padding: '14px',
            display: 'grid', gridTemplateColumns: '120px 1fr 1fr auto', gap: '10px', alignItems: 'end'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>SHORTCUT</label>
              <input className="cms-input" placeholder="e.g. SUGAR" value={newCode} onChange={e => setNewCode(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>RECOMMENDED (WHAT TO EAT)</label>
              <input className="cms-input" placeholder="Foods to eat..." value={newEat} onChange={e => setNewEat(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>RESTRICTED (WHAT NOT TO EAT)</label>
              <input className="cms-input" placeholder="Foods to avoid..." value={newNotEat} onChange={e => setNewNotEat(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="submit" className="cms-btn cms-btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }}>Save</button>
              <button type="button" className="cms-btn cms-btn-outline" onClick={() => setIsAdding(false)} style={{ padding: '8px 12px', fontSize: '12px' }}>Cancel</button>
            </div>
          </form>
        )}

        {isAdding && activeTab !== 'dietary' && (
          <form onSubmit={handleAddGeneric} style={{
            background: 'var(--surface-alt)', border: '1.5px solid var(--primary)', borderRadius: '8px', padding: '14px',
            display: 'flex', gap: '10px', alignItems: 'end'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>NAME / DESCRIPTION</label>
              <input className="cms-input" placeholder="Enter name..." value={newName} onChange={e => setNewName(e.target.value)} required />
            </div>
            <button type="submit" className="cms-btn cms-btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }}>Save</button>
            <button type="button" className="cms-btn cms-btn-outline" onClick={() => setIsAdding(false)} style={{ padding: '8px 12px', fontSize: '12px' }}>Cancel</button>
          </form>
        )}

        {/* ── TAB 1: DIETARY SUGGESTIONS TABLE (Screenshot 5) ── */}
        {activeTab === 'dietary' && (
          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: '30px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '10px 12px', width: '110px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>SHORTCUT CODE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>RECOMMENDED (WHAT TO EAT)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>RESTRICTED (WHAT NOT TO EAT)</th>
                  <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ADDED ON</th>
                  <th style={{ padding: '10px 12px', width: '70px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDietary.map((d, idx) => (
                  <tr key={d.id || idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1',
                        borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)'
                      }}>
                        {d.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12.5px', color: 'var(--text)' }}>
                      <span style={{ color: '#059669', marginRight: '5px' }}>●</span>
                      {d.eat}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12.5px', color: 'var(--text)' }}>
                      <span style={{ color: '#dc2626', marginRight: '5px' }}>⊘</span>
                      {d.notEat}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {d.date || '10/01/2026'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '13px' }}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDietary(d.id)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px' }}
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── GENERIC LIST TABLE FOR OTHER TABS ── */}
        {activeTab !== 'dietary' && (
          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>NAME / VALUE</th>
                  <th style={{ padding: '10px 12px', width: '110px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ADDED ON</th>
                  <th style={{ padding: '10px 12px', width: '70px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredGeneric.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {item.createdAt || '10/01/2026'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button type="button" style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer' }}>
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
