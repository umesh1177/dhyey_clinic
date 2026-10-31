import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getLocalDB, saveLocalDB, apiFetch,
  generateFamilyId, showToast, getSharedMasterCollection, pad,
} from '../services/api';

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function FamilyRegView({ onNavigate, onSelectPatient }) {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [layout, setLayout] = useState('side'); // 'side' | 'stacked'
  const [families, setFamilies] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [editingFamId, setEditingFamId] = useState(null);
  const [showPrefTooltip, setShowPrefTooltip] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const currentYear = new Date().getFullYear();
  const [headName, setHeadName] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergy, setAllergy] = useState('');
  const [phone, setPhone] = useState('');
  const [society, setSociety] = useState('');
  const [area, setArea] = useState('');
  const [registeredBy, setRegisteredBy] = useState('Self (Head of Family)');
  const [sequence, setSequence] = useState(1);
  const [generatedFamId, setGeneratedFamId] = useState('');

  const headNameRef = useRef();

  useEffect(() => { loadFamilies(); }, [clinicId]);

  const loadFamilies = () => {
    const db = getLocalDB(clinicId);
    const list = Object.values(db.families || {});
    list.sort((a, b) => (b.sequence || 0) - (a.sequence || 0));
    setFamilies(list);
    const nextSeq = list.length > 0 ? Math.max(...list.map((f) => Number(f.sequence || 0))) + 1 : 1;
    setSequence(nextSeq);
    setGeneratedFamId(generateFamilyId(clinicId, currentYear, nextSeq));
  };

  const handleSequenceChange = (val) => {
    const n = Number(val) || 1;
    setSequence(n);
    setGeneratedFamId(generateFamilyId(clinicId, currentYear, n));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!headName.trim()) { showToast('Family Head Name is required.', 'error'); return; }
    const db = getLocalDB(clinicId);
    const famId = editingFamId || generatedFamId;

    if (editingFamId && db.families[editingFamId]) {
      const fam = db.families[editingFamId];
      fam.headName = headName.trim();
      fam.age = age.trim();
      fam.bloodGroup = bloodGroup;
      fam.allergy = allergy.trim();
      fam.phone = phone.trim();
      fam.society = society.trim();
      fam.area = area.trim();
      fam.registeredBy = registeredBy;
      // update head patient
      const headPat = Object.values(fam.patients || {}).find((p) => p.relation === 'Head');
      if (headPat) { headPat.name = headName.trim(); headPat.age = age; headPat.bloodGroup = bloodGroup; headPat.allergy = allergy; }
      saveLocalDB(clinicId, db);
      showToast('Family updated successfully.');
      setEditingFamId(null);
    } else {
      const headPatId = `${pad(sequence, 4)}0001`;
      const newFamily = {
        id: famId, famId, headName: headName.trim(), age: age.trim(), bloodGroup,
        allergy: allergy.trim(), phone: phone.trim(), society: society.trim(),
        area: area.trim(), registeredBy, year: currentYear, sequence,
        patients: {
          [headPatId]: {
            id: headPatId, patId: headPatId, familyId: famId,
            name: headName.trim(), relation: 'Head', age: age.trim(),
            gender: 'Male', bloodGroup, allergy: allergy.trim() || 'None',
            society: society.trim(), area: area.trim(), phone: phone.trim(), visits: [],
          },
        },
      };
      db.families[famId] = newFamily;
      saveLocalDB(clinicId, db);
      showToast(`Family ${famId} registered!`);
      apiFetch('/families', { method: 'POST', body: newFamily }).catch(() => {});
    }
    resetForm();
    loadFamilies();
  };

  const resetForm = () => {
    setHeadName(''); setAge(''); setBloodGroup(''); setAllergy('');
    setPhone(''); setSociety(''); setArea(''); setRegisteredBy('Self (Head of Family)');
    setEditingFamId(null);
    const db = getLocalDB(clinicId);
    const list = Object.values(db.families || {});
    const nextSeq = list.length > 0 ? Math.max(...list.map((f) => Number(f.sequence || 0))) + 1 : 1;
    setSequence(nextSeq);
    setGeneratedFamId(generateFamilyId(clinicId, currentYear, nextSeq));
    setTimeout(() => headNameRef.current?.focus(), 100);
  };

  const handleEdit = (fam) => {
    setEditingFamId(fam.id || fam.famId);
    setHeadName(fam.headName || '');
    setAge(fam.age || '');
    setBloodGroup(fam.bloodGroup || '');
    setAllergy(fam.allergy || '');
    setPhone(fam.phone || '');
    setSociety(fam.society || '');
    setArea(fam.area || '');
    setRegisteredBy(fam.registeredBy || 'Self (Head of Family)');
    setGeneratedFamId(fam.id || fam.famId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (famId) => {
    if (!window.confirm(`Delete family ${famId} and all member records?`)) return;
    const db = getLocalDB(clinicId);
    delete db.families[famId];
    saveLocalDB(clinicId, db);
    showToast('Family deleted.');
    apiFetch(`/families/${famId}`, { method: 'DELETE' }).catch(() => {});
    loadFamilies();
  };

  const filtered = families.filter((f) => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (f.headName || '').toLowerCase().includes(q) ||
      (f.id || '').toLowerCase().includes(q) ||
      (f.society || '').toLowerCase().includes(q) ||
      (f.area || '').toLowerCase().includes(q) ||
      (f.phone || '').includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Determine clinic prefix badge
  const clinicPrefix = () => {
    if (!clinicId || clinicId === 'demo') return '0001';
    const d = String(clinicId).replace(/\D/g, '');
    return d ? d.padStart(4, '0').slice(0, 4) : '0001';
  };

  const formPanel = (
    <div style={{ flex: layout === 'side' ? '0 0 420px' : '1' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <i className="fa-solid fa-list-check" style={{ color: 'var(--text-muted)' }}></i>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
          Step 1 · Register Family Head
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
          <i className="fa-solid fa-circle-nodes"></i> Multi-Clinic ID
        </span>
      </div>

      {/* Generated ID Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(9,92,84,0.08) 0%, rgba(20,107,92,0.05) 100%)',
        border: '1.5px dashed var(--primary)',
        borderRadius: '10px', padding: '14px 16px', marginBottom: '18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--primary)' }}></i>
            {editingFamId ? 'Editing Family ID' : 'Auto-Generated Family ID'}
          </div>
          <div className="font-mono" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '2px' }}>
            {editingFamId || generatedFamId}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 700 }}>
              {clinicPrefix()}
            </span>
            <span style={{ background: 'var(--border)', color: 'var(--text)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 700 }}>
              {currentYear}
            </span>
          </div>
          {!editingFamId && (
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Seq:</span>
              <input
                type="number" min="1"
                className="cms-input font-mono"
                style={{ width: '60px', height: '28px', padding: '2px 6px', fontSize: '13px', textAlign: 'center' }}
                value={sequence}
                onChange={(e) => handleSequenceChange(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Head Name */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>
            Family Head Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            ref={headNameRef}
            type="text"
            className="cms-input"
            placeholder="(SURNAME NAME FATHER'S NAME)"
            value={headName}
            onChange={(e) => setHeadName(e.target.value.toUpperCase())}
            required
            autoFocus
            style={{ textTransform: 'uppercase' }}
          />
        </div>

        {/* Row: Age, Blood Group, Known Allergies */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Age</label>
            <input type="text" className="cms-input" placeholder="e.g. 45" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Blood Group</label>
            <select className="cms-input" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
              {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg || '-- Select --'}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Known Allergies</label>
            <input type="text" className="cms-input" placeholder="e.g. Penicillin, None" value={allergy} onChange={(e) => setAllergy(e.target.value)} />
          </div>
        </div>

        {/* Row: Society/Flat, Area/Location */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Society / Flat</label>
            <input type="text" className="cms-input" placeholder="e.g. Shanti Niketan" value={society} onChange={(e) => setSociety(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Area / Location</label>
            <input type="text" className="cms-input" placeholder="e.g. Vastrapur, Satellite" value={area} onChange={(e) => setArea(e.target.value.toUpperCase())} />
          </div>
        </div>

        {/* Row: Registered By, Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Registration Done By <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select className="cms-input" value={registeredBy} onChange={(e) => setRegisteredBy(e.target.value)}>
              <option>Self (Head of Family)</option>
              <option>Family Member</option>
              <option>Clinic Staff</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Phone Number</label>
            <input type="tel" className="cms-input" placeholder="10-digit mobile" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={12} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {editingFamId && (
            <button type="button" className="cms-btn cms-btn-outline" onClick={resetForm} style={{ flex: '0 0 auto' }}>
              Cancel
            </button>
          )}
          <button type="submit" className="cms-btn cms-btn-primary" style={{ flex: 1, height: '44px', fontSize: '14px', fontWeight: 700 }}>
            → {editingFamId ? 'Save Changes' : 'Continue'} <kbd style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', marginLeft: '4px' }}>Enter</kbd>
          </button>
        </div>
      </form>
    </div>
  );

  const dirPanel = (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
          Registered Families Directory
        </div>
        <span style={{ background: 'rgba(9,92,84,0.1)', color: 'var(--primary)', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 700 }}>
          {filtered.length} {filtered.length === 1 ? 'family' : 'families'}
        </span>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          className="cms-input"
          placeholder="Search by head name, society, area, or FAM ID..."
          value={filterQuery}
          onChange={(e) => { setFilterQuery(e.target.value); setPage(1); }}
          style={{ fontSize: '12.5px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
        {paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', opacity: 0.4 }}></i>
            No families found
          </div>
        ) : (
          paginated.map((f) => {
            const memberCount = Object.keys(f.patients || {}).length;
            const headPat = Object.values(f.patients || {}).find((p) => p.relation === 'Head') || Object.values(f.patients || {})[0];
            return (
              <div
                key={f.id || f.famId}
                style={{
                  border: '1px solid var(--border)', borderRadius: '10px',
                  padding: '12px 14px', background: 'var(--surface)',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text)', marginBottom: '3px' }}>
                      {f.headName}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span>By {f.registeredBy || 'Self'}</span>
                      <span className="font-mono" style={{ background: 'rgba(9,92,84,0.08)', color: 'var(--primary)', borderRadius: '4px', padding: '0 6px', fontSize: '11px', fontWeight: 700 }}>
                        FAM {f.id || f.famId}
                      </span>
                      <span>{f.society || ''}{f.society && f.area ? ' · ' : ''}{f.area || ''} · {memberCount} Member{memberCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {f.phone && <><i className="fa-solid fa-phone" style={{ fontSize: '10px' }}></i> {f.phone}</>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, marginLeft: '10px' }}>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => handleEdit(f)}
                      style={{ fontSize: '12px', padding: '4px 10px', border: '1px solid var(--border)' }}
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id || f.famId)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px 8px', fontSize: '14px' }}
                      title="Delete family"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length} families</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Per page:</span>
            <select className="cms-input" style={{ height: '28px', padding: '0 6px', fontSize: '12px', width: '60px' }}
              value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', cursor: page > 1 ? 'pointer' : 'default', color: 'var(--text-muted)' }}>‹</button>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', cursor: page < totalPages ? 'pointer' : 'default', color: 'var(--text-muted)' }}>›</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="cms-page-container" style={{ padding: '16px 20px' }}>
      {/* Layout Preference Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
          <i className="fa-solid fa-display"></i> Doctor Layout Preference:
        </span>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setLayout('side'); setShowPrefTooltip(false); }}
            onMouseEnter={() => setShowPrefTooltip(true)}
            onMouseLeave={() => setShowPrefTooltip(false)}
            style={{
              padding: '6px 14px', borderRadius: '8px 0 0 8px', fontSize: '12.5px', fontWeight: 600,
              background: layout === 'side' ? 'var(--primary)' : 'var(--surface-alt)',
              color: layout === 'side' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-table-columns"></i> Preference 1 (Side-by-Side)
          </button>
          {showPrefTooltip && layout !== 'side' && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '6px 12px', fontSize: '11.5px', whiteSpace: 'nowrap', zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text)',
            }}>
              Preference 1: Side by Side (Form &amp; Directory in same row)
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setLayout('stacked')}
          style={{
            padding: '6px 14px', borderRadius: '0 8px 8px 0', fontSize: '12.5px', fontWeight: 600,
            background: layout === 'stacked' ? 'var(--primary)' : 'var(--surface-alt)',
            color: layout === 'stacked' ? '#fff' : 'var(--text-muted)',
            border: '1px solid var(--border)', borderLeft: 'none', cursor: 'pointer',
          }}
        >
          Preference 2 (Stacked View)
        </button>
      </div>

      {/* Layout */}
      {layout === 'side' ? (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            {formPanel}
          </div>
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            {dirPanel}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            {formPanel}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            {dirPanel}
          </div>
        </div>
      )}
    </div>
  );
}
