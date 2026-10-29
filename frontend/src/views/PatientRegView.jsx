import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getLocalDB,
  saveLocalDB,
  apiFetch,
  showToast,
  getSharedMasterCollection,
  pad,
} from '../services/api';

export default function PatientRegView({ initialFamilyId, initialPatientId, onNavigate, onSelectPatient }) {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(initialFamilyId || '');
  const [editingPatientId, setEditingPatientId] = useState(initialPatientId || null);

  // Form State
  const [patientId, setPatientId] = useState('');
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Son');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergy, setAllergy] = useState('None');
  const [phone, setPhone] = useState('');
  const [society, setSociety] = useState('');
  const [area, setArea] = useState('');

  // Masters
  const [allergiesMaster, setAllergiesMaster] = useState([]);
  const [relationsMaster, setRelationsMaster] = useState([]);

  useEffect(() => {
    loadData();
    setAllergiesMaster(getSharedMasterCollection('allergies'));
    setRelationsMaster(getSharedMasterCollection('relations'));
  }, [clinicId]);

  useEffect(() => {
    if (selectedFamilyId) {
      computeNextPatientId(selectedFamilyId);
      // Auto fill address from family head
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
      if (fam && fam.patients?.[initialPatientId]) {
        loadPatientForEdit(fam.patients[initialPatientId]);
      }
    }
  }, [initialPatientId, initialFamilyId]);

  const loadData = () => {
    const db = getLocalDB(clinicId);
    const list = Object.values(db.families || {});
    setFamilies(list);
    if (!selectedFamilyId && list.length > 0) {
      setSelectedFamilyId(list[0].id || list[0].famId);
    }
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
    setName(p.name);
    setRelation(p.relation || 'Son');
    setAge(p.age || '');
    setGender(p.gender || 'Male');
    setBloodGroup(p.bloodGroup || '');
    setAllergy(p.allergy || 'None');
    setPhone(p.phone || '');
    setSociety(p.society || '');
    setArea(p.area || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFamilyId) {
      showToast('Please select a family first.', 'error');
      return;
    }
    if (!name.trim()) {
      showToast('Please enter the patient name.', 'error');
      return;
    }

    const db = getLocalDB(clinicId);
    const fam = db.families[selectedFamilyId];
    if (!fam) {
      showToast('Selected family not found.', 'error');
      return;
    }
    if (!fam.patients) fam.patients = {};

    const pId = editingPatientId || patientId;
    const existingVisits = fam.patients[pId]?.visits || [];

    const newPat = {
      id: pId,
      patId: pId,
      familyId: selectedFamilyId,
      name: name.trim().toUpperCase(),
      relation,
      age: age.trim(),
      gender,
      bloodGroup: bloodGroup.trim(),
      allergy: allergy.trim(),
      phone: phone.trim(),
      society: society.trim(),
      area: area.trim(),
      visits: existingVisits,
    };

    fam.patients[pId] = newPat;
    saveLocalDB(clinicId, db);

    showToast(
      editingPatientId
        ? `Patient ${newPat.name} updated.`
        : `Member ${newPat.name} added to family!`,
      'success'
    );

    // Sync to backend
    apiFetch('/patients', {
      method: editingPatientId ? 'PUT' : 'POST',
      body: newPat,
    }).catch(() => {});

    // Option to open consultation immediately
    const startCase = window.confirm(
      `Patient record saved successfully!\n\nDo you want to start a Clinical Consultation / Case Entry for ${newPat.name} right now?`
    );
    if (startCase) {
      onSelectPatient(selectedFamilyId, pId);
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setEditingPatientId(null);
    setName('');
    setRelation('Son');
    setAge('');
    setGender('Male');
    setBloodGroup('');
    setAllergy('None');
    computeNextPatientId(selectedFamilyId);
  };

  const currentFamily = families.find((f) => (f.id || f.famId) === selectedFamilyId);
  const familyMembers = currentFamily ? Object.values(currentFamily.patients || {}) : [];

  return (
    <div className="cms-page-container">
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
            <i className="fa-solid fa-user-plus" style={{ color: '#0b5ed7', marginRight: '8px' }}></i>
            Add Family Member / Patient Registration (F2)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Register new patients under their respective family heads
          </p>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="cms-card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSubmit}>
          {/* Family & Patient ID Bar */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--surface-alt, #f8fafc)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ flex: '1 1 280px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Select Family
              </label>
              <select
                className="cms-input"
                value={selectedFamilyId}
                onChange={(e) => setSelectedFamilyId(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                {families.map((f) => (
                  <option key={f.id || f.famId} value={f.id || f.famId}>
                    {f.headName} ({f.id || f.famId}) · {f.area || 'General'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Patient ID
              </label>
              <span className="cms-pill font-mono" style={{ fontSize: '14px', fontWeight: 800, background: '#0b5ed7', color: '#fff' }}>
                {patientId}
              </span>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Patient Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Relationship to Head
              </label>
              <select className="cms-input" value={relation} onChange={(e) => setRelation(e.target.value)}>
                {relationsMaster.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Age
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="e.g. 35 Y, 6 M"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Gender
              </label>
              <select className="cms-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Blood Group
              </label>
              <select className="cms-input" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                <option value="">Unknown / Not Tested</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Known Allergies (Penicillin, Sulfa, etc.)
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="e.g. None, Penicillin"
                value={allergy}
                onChange={(e) => setAllergy(e.target.value)}
                list="allergy-options"
              />
              <datalist id="allergy-options">
                {allergiesMaster.map((al) => (
                  <option key={al.id} value={al.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Phone Number
              </label>
              <input
                type="tel"
                className="cms-input"
                placeholder="Contact number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {editingPatientId && (
              <button type="button" className="cms-btn cms-btn-outline" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
            <button type="submit" className="cms-btn cms-btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> {editingPatientId ? 'Update Member' : 'Save Member (F2)'}
            </button>
          </div>
        </form>
      </div>

      {/* Current Family Members Table */}
      {currentFamily && (
        <div className="cms-card">
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px', color: 'var(--text)' }}>
            Enrolled Members of Family: <span style={{ color: 'var(--primary)' }}>{currentFamily.headName}</span> ({familyMembers.length})
          </h3>

          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Relation</th>
                  <th>Age / Gender</th>
                  <th>Blood Group</th>
                  <th>Allergies</th>
                  <th>Visits</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {familyMembers.map((p) => (
                  <tr key={p.id || p.patId}>
                    <td>
                      <span className="cms-pill font-mono" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {p.id || p.patId}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                    </td>
                    <td>
                      <span className="cms-pill" style={{ fontSize: '11px' }}>
                        {p.relation || 'Member'}
                      </span>
                    </td>
                    <td>{p.age ? `${p.age} Y` : '-'} · {p.gender || '-'}</td>
                    <td>{p.bloodGroup || '-'}</td>
                    <td>
                      {p.allergy && p.allergy.toLowerCase() !== 'none' ? (
                        <span className="cms-pill" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i>
                          {p.allergy}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className="cms-pill">
                        {(p.visits || []).length} visits
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          onClick={() => onSelectPatient(selectedFamilyId, p.id || p.patId)}
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        >
                          <i className="fa-solid fa-notes-medical text-primary"></i> Case
                        </button>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          onClick={() => loadPatientForEdit(p)}
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
