import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getLocalDB, saveLocalDB, apiFetch,
  showToast, getSharedMasterCollection, pad,
} from '../services/api';

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PatientRegView({ initialFamilyId, initialPatientId, onNavigate, onSelectPatient }) {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(initialFamilyId || '');
  const [editingPatientId, setEditingPatientId] = useState(initialPatientId || null);

  const [patientId, setPatientId] = useState('');
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergy, setAllergy] = useState('');
  const [phone, setPhone] = useState('');
  const [society, setSociety] = useState('');
  const [area, setArea] = useState('');

  const [allergiesMaster, setAllergiesMaster] = useState([]);
  const [relationsMaster, setRelationsMaster] = useState([]);
  const nameRef = useRef();

  useEffect(() => {
    loadData();
    setAllergiesMaster(getSharedMasterCollection('allergies'));
    setRelationsMaster(getSharedMasterCollection('relations'));
  }, [clinicId]);

  useEffect(() => {
    if (selectedFamilyId) {
      computeNextPatientId(selectedFamilyId);
      const db = getLocalDB(clinicId);
      const fam = db.families[selectedFamilyId];
      if (fam && !editingPatientId) {
        setSociety(fam.society || '');
        setArea(fam.area || '');
        setPhone(fam.phone || '');
      }
    }
  }, [selectedFamilyId]);

  useEffect(() => {
    if (initialPatientId && initialFamilyId) {
      const db = getLocalDB(clinicId);
      const fam = db.families[initialFamilyId];
      if (fam?.patients?.[initialPatientId]) loadPatientForEdit(fam.patients[initialPatientId]);
    }
  }, [initialPatientId, initialFamilyId]);

  const loadData = () => {
    const db = getLocalDB(clinicId);
    const list = Object.values(db.families || {});
    setFamilies(list);
    const famId = initialFamilyId || (list.length > 0 ? (list[0].id || list[0].famId) : '');
    if (famId) setSelectedFamilyId(famId);
  };

  const computeNextPatientId = (fId) => {
    if (editingPatientId) return;
    const db = getLocalDB(clinicId);
    const fam = db.families[fId];
    if (!fam) return;
    const seq = pad(fam.sequence || 1, 4);
    const pCount = Object.keys(fam.patients || {}).length + 1;
    setPatientId(`${seq}${pad(pCount, 4)}`);
  };

  const loadPatientForEdit = (p) => {
    setEditingPatientId(p.id || p.patId);
    setPatientId(p.id || p.patId);
    setName(p.name); setRelation(p.relation || '');
    setAge(p.age || ''); setGender(p.gender || 'Male');
    setBloodGroup(p.bloodGroup || ''); setAllergy(p.allergy || '');
    setPhone(p.phone || ''); setSociety(p.society || ''); setArea(p.area || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFamilyId) { showToast('Please select a family.', 'error'); return; }
    if (!name.trim()) { showToast('Patient name is required.', 'error'); return; }

    const db = getLocalDB(clinicId);
    const fam = db.families[selectedFamilyId];
    if (!fam) { showToast('Family not found.', 'error'); return; }
    if (!fam.patients) fam.patients = {};

    const pId = editingPatientId || patientId;
    const existingVisits = fam.patients[pId]?.visits || [];

    const newPat = {
      id: pId, patId: pId, familyId: selectedFamilyId,
      name: name.trim().toUpperCase(), relation,
      age: age.trim(), gender, bloodGroup: bloodGroup.trim(),
      allergy: allergy.trim() || 'None', phone: phone.trim(),
      society: society.trim(), area: area.trim(), visits: existingVisits,
    };

    fam.patients[pId] = newPat;
    saveLocalDB(clinicId, db);
    showToast(editingPatientId ? `Patient updated.` : `Member ${newPat.name} added!`);
    apiFetch('/patients', { method: editingPatientId ? 'PUT' : 'POST', body: newPat }).catch(() => {});

    // Auto-open case record
    onSelectPatient(selectedFamilyId, pId);
  };

  const resetForm = () => {
    setEditingPatientId(null); setName(''); setRelation(''); setAge('');
    setGender('Male'); setBloodGroup(''); setAllergy('');
    computeNextPatientId(selectedFamilyId);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const currentFamily = families.find((f) => (f.id || f.famId) === selectedFamilyId);

  return (
    <div className="cms-page-container" style={{ padding: '16px 20px' }}>
      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
          Add Member to Family
          {currentFamily && <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}> · {currentFamily.headName}</span>}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-user-plus" style={{ color: 'var(--primary)' }}></i>
          Member Registration
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        {/* Selected Family Head Card */}
        {currentFamily ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(9,92,84,0.06) 0%, rgba(20,107,92,0.04) 100%)',
            border: '1.5px solid rgba(9,92,84,0.2)', borderRadius: '10px',
            padding: '14px 16px', marginBottom: '20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), #146B5C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '16px',
              }}>
                <i className="fa-solid fa-people-roof"></i>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Selected Family Head</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{currentFamily.headName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {currentFamily.society && <span>{currentFamily.society}</span>}
                  {currentFamily.area && <span>· {currentFamily.area}</span>}
                  {currentFamily.phone && <span>· <i className="fa-solid fa-phone" style={{ fontSize: '10px' }}></i> {currentFamily.phone}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="font-mono" style={{ background: 'var(--primary)', color: '#fff', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 700 }}>
                FAM {currentFamily.id || currentFamily.famId}
              </span>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => { setSelectedFamilyId(''); setName(''); }}
                style={{ fontSize: '12px', padding: '4px 12px', border: '1px solid var(--border)' }}
              >
                <i className="fa-solid fa-rotate"></i> Change Family
              </button>
            </div>
          </div>
        ) : (
          /* No family selected — show family picker */
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
              Select Family <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              className="cms-input"
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
            >
              <option value="">-- Select a Family --</option>
              {families.map((f) => (
                <option key={f.id || f.famId} value={f.id || f.famId}>
                  {f.headName} ({f.id || f.famId}) · {f.area || ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Row 1: Member Name + Relation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>
                Member Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                className="cms-input"
                placeholder="(SURNAME NAME FATHER/HUSBAND'S NAME)"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                required
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>
                Relation to Head <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="e.g. Wife, Son, Mother"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                list="relation-list"
              />
              <datalist id="relation-list">
                {(relationsMaster.length > 0 ? relationsMaster : [
                  { id: 1, name: 'Wife' }, { id: 2, name: 'Son' }, { id: 3, name: 'Daughter' },
                  { id: 4, name: 'Mother' }, { id: 5, name: 'Father' }, { id: 6, name: 'Brother' },
                  { id: 7, name: 'Sister' }, { id: 8, name: 'Other' },
                ]).map((r) => <option key={r.id} value={r.name} />)}
              </datalist>
            </div>
          </div>

          {/* Row 2: Age, Blood Group, Known Allergies */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Age</label>
              <input type="text" className="cms-input" placeholder="e.g. 35, 6M" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Blood Group</label>
              <select className="cms-input" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg || '-- Select --'}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>Known Allergies</label>
              <input
                type="text" className="cms-input" placeholder="e.g. Penicillin, None"
                value={allergy} onChange={(e) => setAllergy(e.target.value)}
                list="allergy-list-2"
              />
              <datalist id="allergy-list-2">
                {(allergiesMaster.length > 0 ? allergiesMaster : [
                  { id: 1, name: 'None' }, { id: 2, name: 'Penicillin' },
                  { id: 3, name: 'Sulfa' }, { id: 4, name: 'Dust / Pollen' }, { id: 5, name: 'Aspirin' },
                ]).map((a) => <option key={a.id} value={a.name} />)}
              </datalist>
            </div>
          </div>

          {/* Row 3: Society, Area (auto-filled) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>
                Society / Flat <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>(Auto-filled, editable)</span>
              </label>
              <input type="text" className="cms-input" value={society} onChange={(e) => setSociety(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>
                Area / Location <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>(Auto-filled, editable)</span>
              </label>
              <input type="text" className="cms-input" value={area} onChange={(e) => setArea(e.target.value.toUpperCase())} />
            </div>
          </div>

          {/* Row 4: Contact Phone */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px', textTransform: 'uppercase' }}>
              Contact Phone <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>(Optional)</span>
            </label>
            <input
              type="tel" className="cms-input" placeholder="Mobile number"
              value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={12}
              style={{ maxWidth: '280px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {editingPatientId && (
              <button type="button" className="cms-btn cms-btn-outline" onClick={resetForm}>Cancel</button>
            )}
            <button type="submit" className="cms-btn cms-btn-primary" style={{ flex: 1, height: '44px', fontSize: '14px', fontWeight: 700 }}>
              <i className="fa-solid fa-user-plus"></i>{' '}
              {editingPatientId ? 'Update Member' : 'Save Member & Open Patient Record'}
              {' '}<kbd style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '4px', padding: '1px 6px', fontSize: '11px' }}>Enter</kbd>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
