import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getLocalDB,
  saveLocalDB,
  apiFetch,
  generateFamilyId,
  showToast,
  getSharedMasterCollection,
  pad,
} from '../services/api';

export default function FamilyRegView({ onNavigate, onSelectPatient }) {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [families, setFamilies] = useState([]);
  const [areas, setAreas] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [editingFamId, setEditingFamId] = useState(null);

  // Form State
  const currentYear = new Date().getFullYear();
  const [headName, setHeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [society, setSociety] = useState('');
  const [area, setArea] = useState('');
  const [registeredBy, setRegisteredBy] = useState('Self');
  const [sequence, setSequence] = useState(1);
  const [generatedFamId, setGeneratedFamId] = useState('');

  useEffect(() => {
    loadFamilies();
    const areaList = getSharedMasterCollection('areas');
    setAreas(areaList);
  }, [clinicId]);

  const loadFamilies = () => {
    const db = getLocalDB(clinicId);
    const list = Object.values(db.families || {});
    list.sort((a, b) => (b.sequence || 0) - (a.sequence || 0));
    setFamilies(list);

    // Compute next sequence
    const nextSeq = list.length > 0 ? Math.max(...list.map((f) => Number(f.sequence || 0))) + 1 : 1;
    setSequence(nextSeq);
    setGeneratedFamId(generateFamilyId(clinicId, currentYear, nextSeq));

    // Async backend sync
    apiFetch('/families').then((res) => {
      if (res && res.success && res.data && res.data.length > 0) {
        // Sync families
      }
    }).catch(() => {});
  };

  const handleSequenceChange = (newSeq) => {
    const val = Number(newSeq) || 1;
    setSequence(val);
    setGeneratedFamId(generateFamilyId(clinicId, currentYear, val));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!headName.trim()) {
      showToast('Please enter the Family Head Name.', 'error');
      return;
    }

    const db = getLocalDB(clinicId);
    const famId = editingFamId || generatedFamId;

    if (editingFamId) {
      // Edit existing
      if (db.families[editingFamId]) {
        db.families[editingFamId].headName = headName.trim();
        db.families[editingFamId].phone = phone.trim();
        db.families[editingFamId].society = society.trim();
        db.families[editingFamId].area = area.trim();
        db.families[editingFamId].registeredBy = registeredBy;

        // Also update Head patient record if present
        const headPat = Object.values(db.families[editingFamId].patients || {}).find(
          (p) => p.relation === 'Head'
        );
        if (headPat) {
          headPat.name = headName.trim();
          headPat.phone = phone.trim();
          headPat.society = society.trim();
          headPat.area = area.trim();
        }
      }
      saveLocalDB(clinicId, db);
      showToast('Family record updated successfully.');
      setEditingFamId(null);
    } else {
      // Create new family
      const newFamily = {
        id: famId,
        famId: famId,
        headName: headName.trim(),
        phone: phone.trim(),
        society: society.trim(),
        area: area.trim(),
        registeredBy,
        year: currentYear,
        sequence,
        patients: {},
      };

      // Automatically create the Head patient member
      const headPatId = `${pad(sequence, 4)}0001`;
      newFamily.patients[headPatId] = {
        id: headPatId,
        patId: headPatId,
        familyId: famId,
        name: headName.trim(),
        relation: 'Head',
        age: '',
        gender: 'Male',
        bloodGroup: '',
        allergy: 'None',
        society: society.trim(),
        area: area.trim(),
        phone: phone.trim(),
        visits: [],
      };

      db.families[famId] = newFamily;
      saveLocalDB(clinicId, db);
      showToast(`Family ${famId} registered with Head member!`);

      // Sync to backend
      apiFetch('/families', {
        method: 'POST',
        body: newFamily,
      }).catch(() => {});
    }

    // Reset Form
    resetForm();
    loadFamilies();
  };

  const resetForm = () => {
    setHeadName('');
    setPhone('');
    setSociety('');
    setArea('');
    setRegisteredBy('Self');
    setEditingFamId(null);
    const db = getLocalDB(clinicId);
    const list = Object.values(db.families || {});
    const nextSeq = list.length > 0 ? Math.max(...list.map((f) => Number(f.sequence || 0))) + 1 : 1;
    setSequence(nextSeq);
    setGeneratedFamId(generateFamilyId(clinicId, currentYear, nextSeq));
  };

  const handleEdit = (fam) => {
    setEditingFamId(fam.id || fam.famId);
    setHeadName(fam.headName);
    setPhone(fam.phone || '');
    setSociety(fam.society || '');
    setArea(fam.area || '');
    setRegisteredBy(fam.registeredBy || 'Self');
    setGeneratedFamId(fam.id || fam.famId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (famId) => {
    if (!window.confirm(`Are you sure you want to delete family ${famId} and all member records?`)) {
      return;
    }
    const db = getLocalDB(clinicId);
    delete db.families[famId];
    saveLocalDB(clinicId, db);
    showToast('Family deleted successfully.');
    apiFetch(`/families/${famId}`, { method: 'DELETE' }).catch(() => {});
    loadFamilies();
  };

  const filteredFamilies = families.filter((f) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (f.id && f.id.toLowerCase().includes(q)) ||
      (f.headName && f.headName.toLowerCase().includes(q)) ||
      (f.phone && f.phone.includes(q)) ||
      (f.area && f.area.toLowerCase().includes(q)) ||
      (f.society && f.society.toLowerCase().includes(q))
    );
  });

  return (
    <div className="cms-page-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
            <i className="fa-solid fa-people-roof" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
            Family Head Registration (F1)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Register new households and manage family patient trees
          </p>
        </div>
      </div>

      {/* Registration Form Card */}
      <div className="cms-card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--surface-alt, #f8fafc)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                {editingFamId ? 'EDITING FAMILY ID:' : 'AUTO GENERATED FAMILY ID:'}
              </span>
              <span className="cms-pill font-mono" style={{ fontSize: '14px', fontWeight: 800, background: '#095c54', color: '#fff' }}>
                {editingFamId || generatedFamId}
              </span>
            </div>

            {!editingFamId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span>Year: <strong>{currentYear}</strong></span>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span>Seq:</span>
                <input
                  type="number"
                  className="cms-input"
                  style={{ width: '70px', padding: '4px 8px', height: '30px' }}
                  value={sequence}
                  onChange={(e) => handleSequenceChange(e.target.value)}
                  min="1"
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Head of Family Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="e.g. PATEL RAMESHBHAI GOVINDBHAI"
                value={headName}
                onChange={(e) => setHeadName(e.target.value.toUpperCase())}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Primary Contact Number
              </label>
              <input
                type="tel"
                className="cms-input"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength="12"
              />
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Area / Locality
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="e.g. VASTRAPUR, SATELLITE"
                value={area}
                onChange={(e) => setArea(e.target.value.toUpperCase())}
                list="area-suggestions"
              />
              <datalist id="area-suggestions">
                {areas.map((a) => (
                  <option key={a.id} value={a.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Society / Apartment / Landmark
              </label>
              <input
                type="text"
                className="cms-input"
                placeholder="Building or street name"
                value={society}
                onChange={(e) => setSociety(e.target.value)}
              />
            </div>

            <div>
              <label className="cms-label" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 700 }}>
                Registered By
              </label>
              <select
                className="cms-input"
                value={registeredBy}
                onChange={(e) => setRegisteredBy(e.target.value)}
              >
                <option value="Self">Self (Family Head)</option>
                <option value="Family Member">Family Member</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {editingFamId && (
              <button type="button" className="cms-btn cms-btn-outline" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
            <button type="submit" className="cms-btn cms-btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> {editingFamId ? 'Save Changes' : 'Register Family (F1)'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Families Directory Table */}
      <div className="cms-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px', color: 'var(--text)' }}>
              Registered Families ({filteredFamilies.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Click any family to view members or launch consultation
            </span>
          </div>

          <div style={{ minWidth: '240px' }}>
            <input
              type="text"
              className="cms-input"
              placeholder="Filter families by name, ID, phone..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredFamilies.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No families found matching query.
          </div>
        ) : (
          <div className="cms-table-responsive">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Family ID</th>
                  <th>Head Name</th>
                  <th>Phone</th>
                  <th>Area / Locality</th>
                  <th>Society</th>
                  <th>Members</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFamilies.map((f) => {
                  const memberCount = Object.keys(f.patients || {}).length;
                  const headPat = Object.values(f.patients || {}).find((p) => p.relation === 'Head') || Object.values(f.patients || {})[0];

                  return (
                    <tr key={f.id || f.famId}>
                      <td>
                        <span className="cms-pill font-mono" style={{ fontSize: '12px', fontWeight: 700 }}>
                          {f.id || f.famId}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{f.headName}</div>
                      </td>
                      <td>{f.phone || '-'}</td>
                      <td>{f.area || '-'}</td>
                      <td>{f.society || '-'}</td>
                      <td>
                        <span className="cms-pill" style={{ background: 'rgba(9,92,84,0.1)', color: 'var(--primary)' }}>
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost"
                            onClick={() => onNavigate('patient', { familyId: f.id || f.famId })}
                            title="Add Family Member"
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
                          >
                            <i className="fa-solid fa-user-plus text-primary"></i> +Member
                          </button>
                          {headPat && (
                            <button
                              type="button"
                              className="cms-btn cms-btn-ghost"
                              onClick={() => onSelectPatient(f.id || f.famId, headPat.id || headPat.patId)}
                              title="Open Consultation"
                              style={{ padding: '4px 8px', fontSize: '11.5px' }}
                            >
                              <i className="fa-solid fa-notes-medical text-primary"></i> Case
                            </button>
                          )}
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost"
                            onClick={() => handleEdit(f)}
                            title="Edit Family"
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost text-danger"
                            onClick={() => handleDelete(f.id || f.famId)}
                            title="Delete Family"
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
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
        )}
      </div>
    </div>
  );
}
