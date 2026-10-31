import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  apiFetch,
  generateFamilyId, showToast, getSharedMasterCollection, pad,
  fetchMasterCollectionFromDB, expandShortcut, findMasterMatch,
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
  const [hoveredFamId, setHoveredFamId] = useState(null);
  const [clickedFamId, setClickedFamId] = useState(null);

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
  const [allergiesMaster, setAllergiesMaster] = useState([]);
  const [areasMaster, setAreasMaster] = useState([]);
  const [societiesMaster, setSocietiesMaster] = useState([]);

  const headNameRef = useRef();

  useEffect(() => {
    loadFamilies();
    fetchMasterCollectionFromDB('allergies').then(d => setAllergiesMaster(d || []));
    fetchMasterCollectionFromDB('areas').then(d => setAreasMaster(d || []));
    fetchMasterCollectionFromDB('societies').then(d => setSocietiesMaster(d || []));
  }, [clinicId]);

  const loadFamilies = async () => {
    try {
      const res = await apiFetch('/families');
      const list = res.data || [];
      list.sort((a, b) => (b.sequence || 0) - (a.sequence || 0));
      setFamilies(list);
      const nextSeq = list.length > 0 ? Math.max(...list.map((f) => Number(f.sequence || f.famId || 0))) + 1 : 1;
      setSequence(nextSeq);
      setGeneratedFamId(String(nextSeq));
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to load families from database', 'error');
    }
  };

  const handleSequenceChange = (val) => {
    const n = Number(val) || 1;
    setSequence(n);
    setGeneratedFamId(String(n));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!headName.trim()) { showToast('Family Head Name is required.', 'error'); return; }
    const famId = editingFamId || generatedFamId;

    try {
      if (editingFamId) {
        await apiFetch(`/families/${editingFamId}`, {
          method: 'PUT',
          body: {
            headName: headName.trim(),
            age: age.trim(),
            bloodGroup,
            allergy: allergy.trim(),
            phone: phone.trim(),
            society: society.trim(),
            area: area.trim(),
            registeredBy,
          },
        });
        showToast('Family updated in database.');
        setEditingFamId(null);
      } else {
        const res = await apiFetch('/families', {
          method: 'POST',
          body: {
            famId,
            headName: headName.trim(),
            age: age.trim(),
            bloodGroup,
            allergy: allergy.trim(),
            phone: phone.trim(),
            society: society.trim(),
            area: area.trim(),
            registeredBy,
          },
        });

        const savedFam = res.data?.family || { famId };
        const savedPat = res.data?.headPatient || { patId: `${famId}01` };

        resetForm();
        await loadFamilies();

        if (registeredBy && registeredBy.toLowerCase().includes('member')) {
          showToast(`Family #${savedFam.famId} registered! Add member details:`);
          onNavigate('patient', {
            familyId: savedFam.famId,
            initialData: {
              society: society.trim(),
              area: area.trim(),
              phone: phone.trim(),
            }
          });
          return;
        } else {
          showToast(`Family #${savedFam.famId} registered! Opening patient record & case history...`);
          onNavigate('case', {
            familyId: savedFam.famId,
            patientId: savedPat.patId,
            openHistory: true,
          });
          return;
        }
      }
      resetForm();
      await loadFamilies();
    } catch (err) {
      showToast(err.message || 'Failed to save family to database', 'error');
    }
  };

  const resetForm = () => {
    setHeadName(''); setAge(''); setBloodGroup(''); setAllergy('');
    setPhone(''); setSociety(''); setArea(''); setRegisteredBy('Self (Head of Family)');
    setEditingFamId(null);
    const nextSeq = families.length > 0 ? Math.max(...families.map((f) => Number(f.sequence || f.famId || 0))) + 1 : 1;
    setSequence(nextSeq);
    setGeneratedFamId(String(nextSeq));
    setTimeout(() => headNameRef.current?.focus(), 100);
  };

  const handleEdit = (fam) => {
    const id = fam.id || fam.famId;
    setEditingFamId(id);
    setHeadName(fam.headName || '');
    setAge(fam.age || '');
    setBloodGroup(fam.bloodGroup || '');
    setAllergy(fam.allergy || '');
    setPhone(fam.phone || '');
    setSociety(fam.society || '');
    setArea(fam.area || '');
    setRegisteredBy(fam.registeredBy || 'Self (Head of Family)');
    setGeneratedFamId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (famId) => {
    if (!window.confirm(`Delete family ${famId} and all member records from database?`)) return;
    try {
      await apiFetch(`/families/${famId}`, { method: 'DELETE' });
      showToast(`Family ${famId} deleted from database.`);
      await loadFamilies();
    } catch (err) {
      showToast(err.message || 'Failed to delete family', 'error');
    }
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

  const isFamilyExpanded = (famId) => {
    return hoveredFamId === famId || clickedFamId === famId;
  };

  const toggleExpand = (famId) => {
    setClickedFamId(prev => prev === famId ? null : famId);
  };

  // Determine clinic prefix badge
  const clinicPrefix = () => {
    if (!clinicId || clinicId === 'demo') return '0001';
    const d = String(clinicId).replace(/\D/g, '');
    return d ? d.padStart(4, '0').slice(0, 4) : '0001';
  };

  const formPanel = (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <i className="fa-solid fa-list-check" style={{ color: 'var(--text-muted)' }}></i>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
          Step 1 · Register Family Head
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--primary)', fontWeight: 700, background: 'rgba(9,92,84,0.08)', padding: '3px 10px', borderRadius: '12px' }}>
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
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Known Allergies (Shortcut + Enter)</label>
            <input
              type="text"
              className="cms-input"
              placeholder="e.g. PEN -> Penicillin, "
              value={allergy}
              onChange={(e) => setAllergy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setAllergy(expandShortcut(allergy, allergiesMaster));
                }
              }}
              list="fam-allergies-list"
            />
            <datalist id="fam-allergies-list">
              {allergiesMaster.map(a => (
                <option key={a.id || a.code || a.name} value={a.code ? `${a.code} - ${a.name}` : a.name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Row: Society/Flat, Area/Location */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Society / Flat</label>
            <input
              type="text"
              className="cms-input"
              placeholder="e.g. Shanti Niketan"
              value={society}
              onChange={(e) => setSociety(e.target.value)}
              list="fam-societies-list"
            />
            <datalist id="fam-societies-list">
              {societiesMaster.map(s => (
                <option key={s.id || s.name} value={s.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Area / Location (Enter to match)</label>
            <input
              type="text"
              className="cms-input"
              placeholder="e.g. Vastrapur"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setArea(findMasterMatch(area, areasMaster));
                }
              }}
              list="fam-areas-list"
            />
            <datalist id="fam-areas-list">
              {areasMaster.map(a => (
                <option key={a.id || a.name} value={a.name} />
              ))}
            </datalist>
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
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
          Registered Families Directory
        </div>
        <span style={{ background: 'rgba(9,92,84,0.1)', color: 'var(--primary)', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 700 }}>
          {filtered.length} {filtered.length === 1 ? 'family' : 'families'}
        </span>
      </div>

      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }}></i>
        <input
          type="text"
          className="cms-input"
          placeholder="Search by head name, society, area, or FAM ID..."
          value={filterQuery}
          onChange={(e) => { setFilterQuery(e.target.value); setPage(1); }}
          style={{ paddingLeft: '32px', fontSize: '12.5px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto', paddingRight: '2px' }}>
        {paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', opacity: 0.4 }}></i>
            No families found
          </div>
        ) : (
          paginated.map((f) => {
            const famId = f.id || f.famId;
            const patientsList = Object.values(f.patients || {});
            const memberCount = patientsList.length;
            const isExpanded = isFamilyExpanded(famId);

            return (
              <div
                key={famId}
                onMouseEnter={() => setHoveredFamId(famId)}
                onMouseLeave={() => setHoveredFamId(null)}
                style={{
                  border: isExpanded ? '1.5px solid rgba(9,92,84,0.3)' : '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  background: 'var(--surface)',
                  transition: 'all 0.15s ease',
                  boxShadow: isExpanded ? '0 2px 10px rgba(9,92,84,0.06)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => toggleExpand(famId)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text)' }}>
                        {f.headName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        By {f.registeredBy || 'Self'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <span>{f.society || ''}{f.society && f.area ? ' · ' : ''}{f.area || ''} · {memberCount} Member{memberCount !== 1 ? 's' : ''}</span>
                      {f.phone && <span>· <i className="fa-solid fa-phone" style={{ fontSize: '10px' }}></i> {f.phone}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '10px' }}>
                    <span className="font-mono" style={{ color: '#047857', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.5px' }}>
                      FAM {famId}
                    </span>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => handleEdit(f)}
                      style={{ fontSize: '11.5px', padding: '3px 8px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(famId)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '3px 6px', fontSize: '13px' }}
                      title="Delete family"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>

                {/* Expandable Family Members Tray on Hover / Click */}
                {isExpanded && (
                  <div style={{
                    marginTop: '10px',
                    background: '#f0fdf9',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      paddingBottom: '5px',
                      borderBottom: '1px solid #d1fae5',
                    }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#065f46',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <i className="fa-solid fa-users" style={{ color: '#047857' }}></i>
                        FAMILY MEMBERS ({patientsList.length}):
                      </span>
                      <span style={{ fontSize: '10.5px', color: '#6b7280' }}>
                        ↕ Scroll to view all • Click to open
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                      {patientsList.length === 0 ? (
                        <div style={{ fontSize: '11.5px', color: '#6b7280', padding: '6px', textAlign: 'center' }}>
                          No members found.
                        </div>
                      ) : (
                        patientsList.map((p) => {
                          const patId = p.id || p.patId;
                          return (
                            <div
                              key={patId}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onClick={() => onSelectPatient && onSelectPatient(famId, patId)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e5e7eb';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text)', marginBottom: '2px' }}>
                                  {p.name} {p.relation ? <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>({p.relation})</span> : ''}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {p.age && <span>{p.age} Yrs</span>}
                                  {p.bloodGroup && <span>· {p.bloodGroup}</span>}
                                  <span>· Allergy: {p.allergy || 'None'}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPatient && onSelectPatient(famId, patId);
                                }}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid var(--primary)',
                                  color: 'var(--primary)',
                                  borderRadius: '5px',
                                  padding: '4px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'var(--primary)';
                                  e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#ffffff';
                                  e.currentTarget.style.color = 'var(--primary)';
                                }}
                              >
                                {patId} →
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
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
            title="Preference 1: Side by Side (Form & Directory in same row)"
            onClick={() => setLayout('side')}
            style={{
              padding: '6px 14px', borderRadius: '8px 0 0 8px', fontSize: '12.5px', fontWeight: 600,
              background: layout === 'side' ? 'var(--primary)' : 'var(--surface-alt)',
              color: layout === 'side' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-table-columns"></i> Preference 1 (Side-by-Side)
          </button>
        </div>
        <button
          type="button"
          title="Preference 2: Stacked View"
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            {formPanel}
          </div>
          <div style={{ minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
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
