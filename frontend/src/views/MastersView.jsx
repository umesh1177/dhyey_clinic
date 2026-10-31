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

const DEFAULT_COMPLAINTS = [
  { id: 'c1', code: 'FEV', name: 'Fever / High Temperature', createdAt: '01/01/2026' },
  { id: 'c2', code: 'COUGH', name: 'Cough / Cold / Sore Throat', createdAt: '01/01/2026' },
  { id: 'c3', code: 'HEAD', name: 'Headache / Migraine', createdAt: '01/01/2026' },
  { id: 'c4', code: 'CHEST', name: 'Chest Pain / Discomfort', createdAt: '01/01/2026' },
  { id: 'c5', code: 'ACID', name: 'Acidity / Heartburn / Gastric Pain', createdAt: '01/01/2026' },
  { id: 'c6', code: 'JOINT', name: 'Joint Pain / Knee Swelling', createdAt: '01/01/2026' },
  { id: 'c7', code: 'WEAK', name: 'General Weakness / Fatigue', createdAt: '01/01/2026' },
  { id: 'c8', code: 'BP', name: 'Hypertension Check / Giddiness', createdAt: '01/01/2026' },
  { id: 'c9', code: 'DIAB', name: 'High Blood Sugar / Polyuria', createdAt: '01/01/2026' },
  { id: 'c10', code: 'VOM', name: 'Nausea / Vomiting', createdAt: '01/01/2026' },
  { id: 'c11', code: 'BREATH', name: 'Breathlessness / Dyspnea', createdAt: '01/01/2026' },
  { id: 'c12', code: 'RASH', name: 'Skin Rash / Allergy', createdAt: '01/01/2026' },
];

const DEFAULT_INVESTIGATIONS = [
  { id: 'inv1', code: 'CBC', name: 'Complete Blood Count (CBC)', createdAt: '01/01/2026' },
  { id: 'inv2', code: 'BSF', name: 'Blood Sugar Fasting & PP (FBS/PPBS)', createdAt: '01/01/2026' },
  { id: 'inv3', code: 'HBA1C', name: 'HbA1c (Glycated Hemoglobin)', createdAt: '01/01/2026' },
  { id: 'inv4', code: 'LIPID', name: 'Lipid Profile Complete', createdAt: '01/01/2026' },
  { id: 'inv5', code: 'LFT', name: 'Liver Function Test (LFT)', createdAt: '01/01/2026' },
  { id: 'inv6', code: 'RFT', name: 'Renal / Kidney Function Test (KFT/RFT)', createdAt: '01/01/2026' },
  { id: 'inv7', code: 'URINE', name: 'Urine Routine & Microscopic (R/M)', createdAt: '01/01/2026' },
  { id: 'inv8', code: 'THYROID', name: 'Thyroid Profile (T3, T4, TSH)', createdAt: '01/01/2026' },
  { id: 'inv9', code: 'XRAY', name: 'Chest X-Ray PA View', createdAt: '01/01/2026' },
  { id: 'inv10', code: 'ECG', name: '12-Lead ECG (Electrocardiogram)', createdAt: '01/01/2026' },
  { id: 'inv11', code: 'USG', name: 'USG Whole Abdomen & Pelvis', createdAt: '01/01/2026' },
  { id: 'inv12', code: 'STOOL', name: 'Stool Routine & Occult Blood', createdAt: '01/01/2026' },
  { id: 'inv13', code: 'WIDAL', name: 'Widal Slide Agglutination Test', createdAt: '01/01/2026' },
  { id: 'inv14', code: 'VITD', name: 'Vitamin D3 & B12 Quantitative', createdAt: '01/01/2026' },
];

const DEFAULT_AREAS = [
  { id: 'a1', name: 'Main Road', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a2', name: 'Vastrapur', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a3', name: 'Satellite', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a4', name: 'Navrangpura', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a5', name: 'Bopal', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a6', name: 'Thaltej', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a7', name: 'Gota', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a8', name: 'Maninagar', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a9', name: 'Paldi', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a10', name: 'Science City', city: 'Ahmedabad', createdAt: '01/01/2026' },
  { id: 'a11', name: 'Varachha', city: 'Surat', createdAt: '01/01/2026' },
  { id: 'a12', name: 'Amroli', city: 'Surat', createdAt: '01/01/2026' },
];

const MASTER_TABS = [
  { key: 'dietary', label: 'Dietary Suggestions', icon: 'fa-utensils', btnLabel: 'Dietary Suggestion', title: 'Dietary Suggestion Templates', badgeLabel: 'Templates' },
  { key: 'complaints', label: 'Complaints', icon: 'fa-comment-medical', btnLabel: 'Complaint', title: 'All Clinical Complaints & Symptoms', badgeLabel: 'Complaints' },
  { key: 'investigations', label: 'Investigations (Reports)', icon: 'fa-flask-vial', btnLabel: 'Investigation', title: 'Laboratory & Diagnostic Investigations', badgeLabel: 'Tests' },
  { key: 'areas', label: 'Area / Location', icon: 'fa-location-dot', btnLabel: 'Area', title: 'Area & Locality Master', badgeLabel: 'Areas' },
  { key: 'medicines', label: 'Medicine Catalogue', icon: 'fa-pills', btnLabel: 'Medicine', title: 'Medicine Drug Formulary', badgeLabel: 'Medicines' },
  { key: 'allergies', label: 'Known Allergies', icon: 'fa-shield-halved', btnLabel: 'Allergy', title: 'Known Medical Allergies', badgeLabel: 'Allergies' },
  { key: 'relations', label: 'Relation to Head', icon: 'fa-users', btnLabel: 'Relation', title: 'Relation to Head of Family', badgeLabel: 'Relations' },
  { key: 'societies', label: 'Society / Flat', icon: 'fa-building', btnLabel: 'Society', title: 'Residential Societies & Flats', badgeLabel: 'Societies' },
  { key: 'navigation', label: 'Navigation Shortcuts', icon: 'fa-keyboard', btnLabel: 'Shortcut', title: 'Navigation & Function Hotkeys', badgeLabel: 'Shortcuts' },
];

export default function MastersView() {
  const [activeTab, setActiveTab] = useState('dietary');
  const [dietaryItems, setDietaryItems] = useState(DEFAULT_DIETARY);
  const [genericItems, setGenericItems] = useState([]);
  const [filter, setFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form inputs
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formEat, setFormEat] = useState('');
  const [formNotEat, setFormNotEat] = useState('');
  const [formCity, setFormCity] = useState('Ahmedabad');
  const [formDosage, setFormDosage] = useState('');

  useEffect(() => {
    loadTabItems(activeTab);
  }, [activeTab]);

  const loadTabItems = (tabKey) => {
    if (tabKey === 'dietary') {
      try {
        const raw = localStorage.getItem('clinic_master_dietary');
        if (raw) setDietaryItems(JSON.parse(raw));
        else setDietaryItems(DEFAULT_DIETARY);
      } catch (e) {
        setDietaryItems(DEFAULT_DIETARY);
      }
    } else {
      let list = getSharedMasterCollection(tabKey);
      if (!list || list.length === 0) {
        if (tabKey === 'complaints') list = DEFAULT_COMPLAINTS;
        else if (tabKey === 'investigations') list = DEFAULT_INVESTIGATIONS;
        else if (tabKey === 'areas') list = DEFAULT_AREAS;
        saveSharedMasterCollection(tabKey, list);
      }
      setGenericItems(list || []);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormCode('');
    setFormName('');
    setFormEat('');
    setFormNotEat('');
    setFormCity('Ahmedabad');
    setFormDosage('');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormCode(item.code || '');
    setFormName(item.name || '');
    setFormEat(item.eat || '');
    setFormNotEat(item.notEat || '');
    setFormCity(item.city || 'Ahmedabad');
    setFormDosage(item.dosage || item.defaultDosage || '');
    setIsModalOpen(true);
  };

  const handleModalSave = (e) => {
    e.preventDefault();

    if (activeTab === 'dietary') {
      if (!formCode.trim() || !formEat.trim()) {
        showToast('Shortcut code and recommended food advice are required.', 'error');
        return;
      }
      let updated;
      if (editingItem) {
        updated = dietaryItems.map(d => d.id === editingItem.id ? {
          ...d,
          code: formCode.trim().toUpperCase(),
          eat: formEat.trim(),
          notEat: formNotEat.trim(),
        } : d);
        showToast(`Updated dietary template +${formCode.trim().toUpperCase()}`);
      } else {
        const newItem = {
          id: `diet_${uid()}`,
          code: formCode.trim().toUpperCase(),
          eat: formEat.trim(),
          notEat: formNotEat.trim(),
          date: '10/01/2026',
        };
        updated = [...dietaryItems, newItem];
        showToast(`Added dietary shortcut +${newItem.code}`);
      }
      setDietaryItems(updated);
      localStorage.setItem('clinic_master_dietary', JSON.stringify(updated));
    } else {
      let updated;
      if (editingItem) {
        updated = genericItems.map(item => item.id === editingItem.id ? {
          ...item,
          code: formCode ? formCode.trim().toUpperCase() : item.code,
          name: formName.trim() || item.name,
          city: formCity.trim() || item.city,
          dosage: formDosage.trim() || item.dosage,
        } : item);
        showToast(`Updated ${formName || editingItem.name}`);
      } else {
        const newItem = {
          id: `${activeTab}_${uid()}`,
          code: formCode ? formCode.trim().toUpperCase() : undefined,
          name: formName.trim(),
          city: activeTab === 'areas' ? formCity.trim() : undefined,
          dosage: activeTab === 'medicines' ? formDosage.trim() : undefined,
          createdAt: '01/01/2026',
        };
        updated = [...genericItems, newItem];
        showToast(`Added ${newItem.name || newItem.code}`);
      }
      setGenericItems(updated);
      saveSharedMasterCollection(activeTab, updated);
    }

    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteDietary = (id) => {
    if (!window.confirm('Delete this dietary template?')) return;
    const updated = dietaryItems.filter(i => i.id !== id);
    setDietaryItems(updated);
    localStorage.setItem('clinic_master_dietary', JSON.stringify(updated));
    showToast('Dietary template removed.');
  };

  const handleDeleteGeneric = (id) => {
    if (!window.confirm('Delete this master catalogue entry?')) return;
    const updated = genericItems.filter(i => i.id !== id);
    setGenericItems(updated);
    saveSharedMasterCollection(activeTab, updated);
    showToast('Entry removed.');
  };

  const currentTabInfo = MASTER_TABS.find(t => t.key === activeTab) || MASTER_TABS[0];

  const filteredDietary = dietaryItems.filter(i => {
    const q = filter.toLowerCase().trim();
    if (!q) return true;
    return (i.code || '').toLowerCase().includes(q) || (i.eat || '').toLowerCase().includes(q) || (i.notEat || '').toLowerCase().includes(q);
  });

  const filteredGeneric = genericItems.filter(i => {
    const q = filter.toLowerCase().trim();
    if (!q) return true;
    return (i.name || '').toLowerCase().includes(q) || (i.code || '').toLowerCase().includes(q) || (i.city || '').toLowerCase().includes(q);
  });

  const totalCount = activeTab === 'dietary' ? filteredDietary.length : filteredGeneric.length;

  return (
    <div className="cms-page-container" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* ── TOP BANNER ── */}
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

      {/* ── TABS BAR (9 pills) ── */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'
      }}>
        {MASTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'dietary' ? dietaryItems.length : (tab.key === activeTab ? genericItems.length : tab.count || 12);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setFilter(''); }}
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
                {count}
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
              {currentTabInfo.title}
            </h3>
            <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '2px 8px', fontSize: '11.5px', fontWeight: 700 }}>
              {totalCount} {currentTabInfo.badgeLabel}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }} />
              <input
                type="text"
                className="cms-input"
                style={{ height: '34px', width: '240px', paddingLeft: '30px', fontSize: '12px' }}
                placeholder={
                  activeTab === 'dietary' ? 'Search shortcut or food items...' :
                  activeTab === 'complaints' ? 'Search complaint name or code...' :
                  activeTab === 'investigations' ? 'Search test name or code...' :
                  activeTab === 'areas' ? 'Search area name or city...' : 'Search master catalog...'
                }
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={openAddModal}
              style={{ fontSize: '12.5px', padding: '7px 14px', borderRadius: '7px', fontWeight: 700 }}
            >
              <i className="fa-solid fa-plus" /> + Add {currentTabInfo.btnLabel}
            </button>
          </div>
        </div>

        {/* ── TAB 1: DIETARY SUGGESTIONS TABLE (Photo 2) ── */}
        {activeTab === 'dietary' && (
          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: '30px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '10px 12px', width: '120px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>SHORTCUT CODE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>RECOMMENDED (WHAT TO EAT)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>RESTRICTED (WHAT NOT TO EAT)</th>
                  <th style={{ padding: '10px 12px', width: '100px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ADDED ON</th>
                  <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIONS</th>
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
                        borderRadius: '5px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 800, fontFamily: 'var(--font-mono)'
                      }}>
                        {d.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text)' }}>
                      <span style={{ color: '#059669', marginRight: '6px' }}>●</span>
                      {d.eat}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text)' }}>
                      <span style={{ color: '#dc2626', marginRight: '6px' }}>⊘</span>
                      {d.notEat}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {d.date || '10/01/2026'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(d)}
                          style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '13px' }}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDietary(d.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
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

        {/* ── TAB 2: COMPLAINTS TABLE (Photo 3) ── */}
        {activeTab === 'complaints' && (
          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: '35px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '10px 12px', width: '130px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>SHORTCUT / CODE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>COMPLAINT / SYMPTOM FULL NAME</th>
                  <th style={{ padding: '10px 12px', width: '110px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ADDED ON</th>
                  <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredGeneric.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1',
                        borderRadius: '5px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 800, fontFamily: 'var(--font-mono)'
                      }}>
                        {item.code || item.id}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.createdAt || '01/01/2026'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '13px' }}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGeneric(item.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
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

        {/* ── TAB 3: INVESTIGATIONS TABLE (Photo 4) ── */}
        {activeTab === 'investigations' && (
          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: '35px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '10px 12px', width: '130px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>SHORTCUT / CODE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>INVESTIGATION / LAB TEST FULL NAME</th>
                  <th style={{ padding: '10px 12px', width: '110px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ADDED ON</th>
                  <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredGeneric.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc',
                        borderRadius: '5px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 800, fontFamily: 'var(--font-mono)'
                      }}>
                        {item.code || item.id}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.createdAt || '01/01/2026'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '13px' }}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGeneric(item.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
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

        {/* ── TAB 4: AREA / LOCATION TABLE (Photo 5) ── */}
        {activeTab === 'areas' && (
          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: '35px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>AREA / LOCALITY NAME</th>
                  <th style={{ padding: '10px 12px', width: '220px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CITY / DISTRICT</th>
                  <th style={{ padding: '10px 12px', width: '110px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ADDED ON</th>
                  <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredGeneric.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                      <span style={{ marginRight: '6px', fontSize: '12px' }}>📍</span>
                      {item.name}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      {item.city || 'Ahmedabad'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.createdAt || '01/01/2026'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '13px' }}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGeneric(item.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
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

        {/* ── GENERIC LIST TABLE FOR OTHER TABS (Medicines, Allergies, Relations, Societies, Navigation) ── */}
        {!['dietary', 'complaints', 'investigations', 'areas'].includes(activeTab) && (
          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>NAME / VALUE</th>
                  <th style={{ padding: '10px 12px', width: '180px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DETAILS / DOSAGE</th>
                  <th style={{ padding: '10px 12px', width: '110px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ADDED ON</th>
                  <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIONS</th>
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
                    <td style={{ padding: '12px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      {item.dosage || item.defaultDosage || item.category || item.description || 'Standard'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.createdAt || '01/01/2026'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '13px' }}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGeneric(item.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
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

        {/* ── TABLE FOOTER PAGINATION (Exact match with screenshot 2, 3, 4, 5) ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle, #f1f5f9)',
          fontSize: '12px', color: 'var(--text-muted)'
        }}>
          <div>
            Showing 1 to {totalCount} of {totalCount} entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Rows per page:</span>
            <select className="cms-input" style={{ height: '28px', fontSize: '11.5px', padding: '0 6px' }}>
              <option>View All</option>
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ cursor: 'not-allowed', color: '#94a3b8' }}>&lt; Prev</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Page 1 of 1</span>
            <span style={{ cursor: 'not-allowed', color: '#94a3b8' }}>Next &gt;</span>
          </div>
        </div>

      </div>

      {/* ── MODAL DIALOG FOR ADD / EDIT MASTER ENTRY ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '540px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 20px', background: '#095c54', color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 800 }}>
                <i className={`fa-solid ${currentTabInfo.icon || 'fa-layer-group'}`} />
                <span>{editingItem ? 'Edit' : 'Add New'} {currentTabInfo.btnLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingItem(null); }}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleModalSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Dietary Fields */}
              {activeTab === 'dietary' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Shortcut Code *
                    </label>
                    <input
                      className="cms-input font-mono"
                      style={{ height: '36px', fontSize: '13px', fontWeight: 700 }}
                      placeholder="e.g. DIAB, BP, THYROID"
                      value={formCode}
                      onChange={e => setFormCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#047857', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Recommended (What to Eat) *
                    </label>
                    <textarea
                      className="cms-input"
                      style={{ width: '100%', minHeight: '65px', fontSize: '12.5px', resize: 'vertical' }}
                      placeholder="e.g. Green leafy vegetables, whole grains, pulses, salads, fresh water..."
                      value={formEat}
                      onChange={e => setFormEat(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#dc2626', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Restricted (What NOT to Eat)
                    </label>
                    <textarea
                      className="cms-input"
                      style={{ width: '100%', minHeight: '65px', fontSize: '12.5px', resize: 'vertical' }}
                      placeholder="e.g. Direct sugar, sweets, potatoes, oily/fried foods, soft drinks..."
                      value={formNotEat}
                      onChange={e => setFormNotEat(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Complaints & Investigations Fields */}
              {['complaints', 'investigations'].includes(activeTab) && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Shortcut / Code *
                    </label>
                    <input
                      className="cms-input font-mono"
                      style={{ height: '36px', fontSize: '13px', fontWeight: 700 }}
                      placeholder={activeTab === 'complaints' ? 'e.g. FEV, COUGH, HEAD' : 'e.g. CBC, BSF, LIPID'}
                      value={formCode}
                      onChange={e => setFormCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                      {activeTab === 'complaints' ? 'Complaint / Symptom Full Name *' : 'Investigation / Lab Test Full Name *'}
                    </label>
                    <input
                      className="cms-input"
                      style={{ height: '36px', fontSize: '13px' }}
                      placeholder={activeTab === 'complaints' ? 'e.g. Fever / High Temperature' : 'e.g. Complete Blood Count (CBC)'}
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {/* Area / Location Fields */}
              {activeTab === 'areas' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Area / Locality Name *
                    </label>
                    <input
                      className="cms-input"
                      style={{ height: '36px', fontSize: '13px' }}
                      placeholder="e.g. Vastrapur, Satellite, Bopal"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                      City / District *
                    </label>
                    <input
                      className="cms-input"
                      style={{ height: '36px', fontSize: '13px' }}
                      placeholder="e.g. Ahmedabad, Surat"
                      value={formCity}
                      onChange={e => setFormCity(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {/* Other Master Fields (Medicine, Allergy, Relation, Society, Nav) */}
              {!['dietary', 'complaints', 'investigations', 'areas'].includes(activeTab) && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                      {currentTabInfo.btnLabel} Name / Description *
                    </label>
                    <input
                      className="cms-input"
                      style={{ height: '36px', fontSize: '13px' }}
                      placeholder={`Enter ${currentTabInfo.btnLabel} name...`}
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Details / Notes / Dosage
                    </label>
                    <input
                      className="cms-input"
                      style={{ height: '36px', fontSize: '13px' }}
                      placeholder="e.g. Tablet, 1-0-1 AF, or category..."
                      value={formDosage}
                      onChange={e => setFormDosage(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Modal Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingItem(null); }}
                  style={{
                    background: '#fff', color: '#334155', border: '1px solid #cbd5e1',
                    borderRadius: '7px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#095c54', color: '#fff', border: 'none',
                    borderRadius: '7px', padding: '8px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <i className="fa-solid fa-check" /> {editingItem ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
