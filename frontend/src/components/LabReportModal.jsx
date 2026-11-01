import React, { useState } from 'react';

const REFERENCE_RANGES = {
  // Routine Hematology CBC
  hemoglobin: { min: 12.0, max: 16.0 },
  rbcCount: { min: 4.2, max: 5.4 },
  wbcCount: { min: 4000, max: 10000 },
  plateletCount: { min: 150000, max: 400000 },
  esr: { min: 2, max: 20 },
  // Differential WBC
  bandCell: { min: 0, max: 6 },
  neutrophils: { min: 55, max: 70 },
  lymphocytes: { min: 20, max: 40 },
  eosinophils: { min: 1, max: 6 },
  monocytes: { min: 2, max: 8 },
  basophils: { min: 0, max: 1 },
  // Blood Glucose & Renal
  rbs: { min: 60, max: 120 },
  fbs: { min: 70, max: 100 },
  ppbs: { min: 70, max: 140 },
  creatinin: { min: 0.5, max: 1.5 },
  vitaminB12: { min: 200, max: 900 },
  // Thyroid
  t3: { min: 82, max: 200 },
  t4: { min: 4.5, max: 12.5 },
  tsh: { min: 0.4, max: 6.0 },
  // Urine Microscopic
  pusCells: { min: 0, max: 5 },
  epithelialCells: { min: 1, max: 4 },
  rbcUrine: { min: 0, max: 2 },
  // Hepatic
  biliTotal: { min: 0.2, max: 1.0 },
  biliDirect: { min: 0.0, max: 0.3 },
  biliIndirect: { min: 0.1, max: 1.0 },
  sgpt: { min: 10, max: 40 },
};

function checkIsOutOfRange(key, value) {
  if (!value || String(value).trim() === '') return false;
  const range = REFERENCE_RANGES[key];
  if (!range) return false;
  const num = parseFloat(String(value).trim());
  if (isNaN(num)) return false;
  return num < range.min || num > range.max;
}

export default function LabReportModal({
  patient,
  family,
  doctorName = 'Dr. Chirag Paghdal',
  caseNo,
  onClose,
  onSave,
  initialReport = null,
}) {
  const [activeTab, setActiveTab] = useState('hematology');

  // General details
  const [labName, setLabName] = useState(initialReport?.labName || 'Diagnostic Laboratory Name');
  const [entryDate, setEntryDate] = useState(
    initialReport?.entryDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  );

  // Hematology fields - default empty
  const [hemoglobin, setHemoglobin] = useState(initialReport?.hemoglobin || '');
  const [rbcCount, setRbcCount] = useState(initialReport?.rbcCount || '');
  const [wbcCount, setWbcCount] = useState(initialReport?.wbcCount || '');
  const [plateletCount, setPlateletCount] = useState(initialReport?.plateletCount || '');
  const [esr, setEsr] = useState(initialReport?.esr || '');

  // Differential WBC
  const [bandCell, setBandCell] = useState(initialReport?.bandCell || '');
  const [neutrophils, setNeutrophils] = useState(initialReport?.neutrophils || '');
  const [lymphocytes, setLymphocytes] = useState(initialReport?.lymphocytes || '');
  const [eosinophils, setEosinophils] = useState(initialReport?.eosinophils || '');
  const [monocytes, setMonocytes] = useState(initialReport?.monocytes || '');
  const [basophils, setBasophils] = useState(initialReport?.basophils || '');
  const [parasites, setParasites] = useState(initialReport?.parasites || '');

  // Blood Glucose & Renal
  const [rbs, setRbs] = useState(initialReport?.rbs || '');
  const [fbs, setFbs] = useState(initialReport?.fbs || '');
  const [ppbs, setPpbs] = useState(initialReport?.ppbs || '');
  const [creatinin, setCreatinin] = useState(initialReport?.creatinin || '');
  const [vitaminB12, setVitaminB12] = useState(initialReport?.vitaminB12 || '');

  // Thyroid
  const [t3, setT3] = useState(initialReport?.t3 || '');
  const [t4, setT4] = useState(initialReport?.t4 || '');
  const [tsh, setTsh] = useState(initialReport?.tsh || '');

  // Urine fields
  const [quantity, setQuantity] = useState(initialReport?.quantity || '');
  const [color, setColor] = useState(initialReport?.color || '');
  const [appearance, setAppearance] = useState(initialReport?.appearance || '');
  const [spGravity, setSpGravity] = useState(initialReport?.spGravity || '');
  const [reactionPh, setReactionPh] = useState(initialReport?.reactionPh || '');
  const [albumin, setAlbumin] = useState(initialReport?.albumin || '');
  const [sugar, setSugar] = useState(initialReport?.sugar || '');
  const [bileSalts, setBileSalts] = useState(initialReport?.bileSalts || '');
  const [ketoneBodies, setKetoneBodies] = useState(initialReport?.ketoneBodies || '');
  const [pusCells, setPusCells] = useState(initialReport?.pusCells || '');
  const [epithelialCells, setEpithelialCells] = useState(initialReport?.epithelialCells || '');
  const [rbcUrine, setRbcUrine] = useState(initialReport?.rbcUrine || '');
  const [crystals, setCrystals] = useState(initialReport?.crystals || '');
  const [casts, setCasts] = useState(initialReport?.casts || '');
  const [bacteria, setBacteria] = useState(initialReport?.bacteria || '');
  const [otherUrine, setOtherUrine] = useState(initialReport?.otherUrine || '');

  // Other Reports
  const [biliTotal, setBiliTotal] = useState(initialReport?.biliTotal || '');
  const [biliDirect, setBiliDirect] = useState(initialReport?.biliDirect || '');
  const [biliIndirect, setBiliIndirect] = useState(initialReport?.biliIndirect || '');
  const [sgpt, setSgpt] = useState(initialReport?.sgpt || '');
  const [g6pd, setG6pd] = useState(initialReport?.g6pd || '');
  const [hivTest, setHivTest] = useState(initialReport?.hivTest || '');
  const [typhiO, setTyphiO] = useState(initialReport?.typhiO || '');
  const [typhiH, setTyphiH] = useState(initialReport?.typhiH || '');
  const [typhiAH, setTyphiAH] = useState(initialReport?.typhiAH || '');
  const [typhiBH, setTyphiBH] = useState(initialReport?.typhiBH || '');
  const [widalResult, setWidalResult] = useState(initialReport?.widalResult || '');

  // Dynamic Special Report Boxes (Default 4 standard boxes + user added boxes)
  const [specialReports, setSpecialReports] = useState(() => {
    if (initialReport?.specialReports && Array.isArray(initialReport.specialReports) && initialReport.specialReports.length > 0) {
      return initialReport.specialReports;
    }
    return [
      { id: 'xray', title: 'X - RAY', value: initialReport?.xrayNotes || '', placeholder: 'Write X-Ray findings / impression here...' },
      { id: 'stool', title: 'STOOL', value: initialReport?.stoolNotes || '', placeholder: 'Write Stool Examination notes...' },
      { id: 'usg', title: 'SONOGRAPHY (USG)', value: initialReport?.usgNotes || '', placeholder: 'Write USG Abdomen / Pelvis report notes...' },
      { id: 'mri', title: 'MRI / CTSCAN', value: initialReport?.mriNotes || '', placeholder: 'Write MRI / CT Scan report findings...' },
    ];
  });
  const [showAddBox, setShowAddBox] = useState(false);
  const [newBoxTitle, setNewBoxTitle] = useState('');

  const handleAddBox = () => {
    const title = newBoxTitle.trim();
    if (!title) return;
    const newBox = {
      id: 'box_' + Date.now(),
      title: title.toUpperCase(),
      value: '',
      placeholder: `Write ${title} report findings / notes...`,
    };
    setSpecialReports(prev => [...prev, newBox]);
    setNewBoxTitle('');
    setShowAddBox(false);
  };

  const handleRemoveBox = (idToRemove) => {
    setSpecialReports(prev => prev.filter(b => b.id !== idToRemove));
  };

  const handleBoxValueChange = (id, val) => {
    setSpecialReports(prev => prev.map(b => b.id === id ? { ...b, value: val } : b));
  };

  const getInputStyle = (key, val, baseStyle = {}) => {
    const isOut = checkIsOutOfRange(key, val);
    return {
      ...baseStyle,
      ...(isOut
        ? {
            border: '2px solid #ef4444',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            fontWeight: 700,
          }
        : {}),
    };
  };

  const handleSave = () => {
    const fullReport = {
      labName,
      entryDate,
      hemoglobin,
      rbcCount,
      wbcCount,
      plateletCount,
      esr,
      bandCell,
      neutrophils,
      lymphocytes,
      eosinophils,
      monocytes,
      basophils,
      parasites,
      rbs,
      fbs,
      ppbs,
      creatinin,
      vitaminB12,
      t3,
      t4,
      tsh,
      quantity,
      color,
      appearance,
      spGravity,
      reactionPh,
      albumin,
      sugar,
      bileSalts,
      ketoneBodies,
      pusCells,
      epithelialCells,
      rbcUrine,
      crystals,
      casts,
      bacteria,
      otherUrine,
      biliTotal,
      biliDirect,
      biliIndirect,
      sgpt,
      g6pd,
      hivTest,
      typhiO,
      typhiH,
      typhiAH,
      typhiBH,
      widalResult,
      // Backward compatibility for standard fields:
      xrayNotes: specialReports.find(b => b.id === 'xray')?.value || '',
      stoolNotes: specialReports.find(b => b.id === 'stool')?.value || '',
      usgNotes: specialReports.find(b => b.id === 'usg')?.value || '',
      mriNotes: specialReports.find(b => b.id === 'mri')?.value || '',
      // Complete dynamic list of custom & standard finding boxes:
      specialReports: specialReports,
    };
    if (onSave) {
      onSave(fullReport);
    }
    onClose();
  };

  const handleClear = () => {
    setHemoglobin('');
    setRbcCount('');
    setWbcCount('');
    setPlateletCount('');
    setEsr('');
    setBandCell('');
    setNeutrophils('');
    setLymphocytes('');
    setEosinophils('');
    setMonocytes('');
    setBasophils('');
    setParasites('');
    setRbs('');
    setFbs('');
    setPpbs('');
    setCreatinin('');
    setVitaminB12('');
    setT3('');
    setT4('');
    setTsh('');
    setQuantity('');
    setColor('');
    setAppearance('');
    setSpGravity('');
    setReactionPh('');
    setAlbumin('');
    setSugar('');
    setBileSalts('');
    setKetoneBodies('');
    setPusCells('');
    setEpithelialCells('');
    setRbcUrine('');
    setCrystals('');
    setCasts('');
    setBacteria('');
    setOtherUrine('');
    setBiliTotal('');
    setBiliDirect('');
    setBiliIndirect('');
    setSgpt('');
    setG6pd('');
    setHivTest('');
    setTyphiO('');
    setTyphiH('');
    setTyphiAH('');
    setTyphiBH('');
    setWidalResult('');
    setSpecialReports(prev => prev.map(b => ({ ...b, value: '' })));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: '#0284c7',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 800 }}>
            <i className="fa-solid fa-flask-vial" />
            <span>CMS - Laboratory Investigation &amp; Diagnostic Management Software</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        </div>

        {/* Patient & Lab Meta Grid */}
        <div
          style={{
            padding: '12px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '90px' }}>FAMILY NAME :</span>
            <input
              className="cms-input"
              readOnly
              value={family?.headName || patient?.name || ''}
              style={{ height: '30px', fontSize: '12px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '70px' }}>LAB NAME :</span>
            <input
              className="cms-input"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              style={{ height: '30px', fontSize: '12px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '70px' }}>CASE NO :</span>
            <input
              className="cms-input font-mono"
              readOnly
              value={caseNo || '10101'}
              style={{ height: '30px', fontSize: '12px', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '90px' }}>PATIENT NAME :</span>
            <input
              className="cms-input"
              readOnly
              value={patient?.name || ''}
              style={{ height: '30px', fontSize: '12px', fontWeight: 700 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '70px' }}>DR NAME :</span>
            <input
              className="cms-input"
              readOnly
              value={doctorName}
              style={{ height: '30px', fontSize: '12px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '70px' }}>ENTRY DATE :</span>
            <input
              className="cms-input font-mono"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              style={{ height: '30px', fontSize: '12px', fontWeight: 700 }}
            />
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', background: '#e2e8f0', padding: '6px 18px 0', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('hematology')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px 6px 0 0',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'hematology' ? '#fff' : 'transparent',
              color: activeTab === 'hematology' ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: '#dc2626' }}>🩸</span> Routine Hematology Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('urine')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px 6px 0 0',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'urine' ? '#fff' : 'transparent',
              color: activeTab === 'urine' ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: '#d97706' }}>✏</span> Routine Urine Examination Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('other')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px 6px 0 0',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'other' ? '#fff' : 'transparent',
              color: activeTab === 'other' ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: '#0284c7' }}>📁</span> Other Reports (Bilirubin, Widal, X-Ray, Stool, USG, CT)
          </button>
        </div>

        {/* Body Content with Right Sidebar Actions */}
        <div style={{ display: 'flex', padding: '16px 18px', gap: '16px', overflowY: 'auto' }}>
          {/* Main Tab Panels */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* TAB 1: HEMATOLOGY */}
            {activeTab === 'hematology' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Column 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Routine Hematology CBC */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0369a1',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      ROUTINE HEMATOLOGY (CBC) PARAMETERS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { key: 'hemoglobin', label: 'Hemoglobin :', val: hemoglobin, setVal: setHemoglobin, norm: '( 12.0 - 16.0 gm% )' },
                        { key: 'rbcCount', label: 'RBC Count :', val: rbcCount, setVal: setRbcCount, norm: '( 4.2 - 5.4 mill /c.mm )' },
                        { key: 'wbcCount', label: 'WBC Count :', val: wbcCount, setVal: setWbcCount, norm: '( 4000 - 10,000 /c.mm )' },
                        { key: 'plateletCount', label: 'Platelet Count :', val: plateletCount, setVal: setPlateletCount, norm: '( 1,50,000 - 4,00,000 / c.mm )' },
                        { key: 'esr', label: 'ESR :', val: esr, setVal: setEsr, norm: '( 2 - 20 mm/hr. ) (< 50 yrs)' },
                      ].map((r, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '100px 90px 1fr',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input
                            className="cms-input"
                            style={getInputStyle(r.key, r.val, { height: '26px', fontSize: '11px', textAlign: 'center' })}
                            placeholder="—"
                            value={r.val}
                            onChange={(e) => r.setVal(e.target.value)}
                          />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Differential WBC */}
                  <div style={{ border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', background: '#fffbeb' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#b45309',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      DIFFERENTIAL WBC COUNT POLYMORPHS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { key: 'bandCell', label: 'Band Cell :', val: bandCell, setVal: setBandCell, norm: '( 0 - 6 % )' },
                        { key: 'neutrophils', label: 'Neutrophils :', val: neutrophils, setVal: setNeutrophils, norm: '( 55 - 70 % )' },
                        { key: 'lymphocytes', label: 'Lymphocytes :', val: lymphocytes, setVal: setLymphocytes, norm: '( 20 - 40 % )' },
                        { key: 'eosinophils', label: 'Eosinophils :', val: eosinophils, setVal: setEosinophils, norm: '( 1 - 6 % )' },
                        { key: 'monocytes', label: 'Monocytes :', val: monocytes, setVal: setMonocytes, norm: '( 2 - 8 % )' },
                        { key: 'basophils', label: 'Basophils :', val: basophils, setVal: setBasophils, norm: '( 0 - 01 % )' },
                        { key: 'parasites', label: 'Parasites :', val: parasites, setVal: setParasites, norm: '( Negative / Not Seen )' },
                      ].map((r, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '90px 80px 1fr',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input
                            className="cms-input"
                            style={getInputStyle(r.key, r.val, { height: '26px', fontSize: '11px', textAlign: 'center', background: '#fff' })}
                            placeholder="—"
                            value={r.val}
                            onChange={(e) => r.setVal(e.target.value)}
                          />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Blood Glucose & Renal Profile */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0369a1',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      BLOOD GLUCOSE &amp; RENAL PROFILE
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { key: 'rbs', label: 'RBS :', val: rbs, setVal: setRbs, norm: '( upto - 120 mg% )' },
                        { key: 'fbs', label: 'FBS :', val: fbs, setVal: setFbs, norm: '( 70 - 100 mg% )' },
                        { key: 'ppbs', label: 'PPBS :', val: ppbs, setVal: setPpbs, norm: '( upto - 140 mg% )' },
                        { key: 'creatinin', label: 'S.Creatinin :', val: creatinin, setVal: setCreatinin, norm: '( 0.5 - 1.5 mg/dl )' },
                        { key: 'vitaminB12', label: 'Vitamin B 12 :', val: vitaminB12, setVal: setVitaminB12, norm: '( 200 - 900 pg/ml )' },
                      ].map((r, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '90px 80px 1fr',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input
                            className="cms-input"
                            style={getInputStyle(r.key, r.val, { height: '26px', fontSize: '11px', textAlign: 'center' })}
                            placeholder="—"
                            value={r.val}
                            onChange={(e) => r.setVal(e.target.value)}
                          />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Thyroid Function Test */}
                  <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', background: '#f0fdf4' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#15803d',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      THYROID FUNCTION TEST :
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { key: 't3', label: 'T3 :', val: t3, setVal: setT3, norm: '( 82 - 200 ng/ml )' },
                        { key: 't4', label: 'T4 :', val: t4, setVal: setT4, norm: '( 4.5 - 12.5 mg% )' },
                        { key: 'tsh', label: 'TSH :', val: tsh, setVal: setTsh, norm: '( 0.4 - 6.0 mlu/ml )' },
                      ].map((r, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '70px 80px 1fr',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input
                            className="cms-input"
                            style={getInputStyle(r.key, r.val, { height: '26px', fontSize: '11px', textAlign: 'center', background: '#fff' })}
                            placeholder="—"
                            value={r.val}
                            onChange={(e) => r.setVal(e.target.value)}
                          />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: URINE */}
            {activeTab === 'urine' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Physical & Chemical */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#0369a1',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    PHYSICAL &amp; CHEMICAL EXAMINATION
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                    {[
                      { key: 'quantity', label: 'Quantity :', val: quantity, setVal: setQuantity, norm: '( 30 - 50 ml )' },
                      { key: 'color', label: 'Color :', val: color, setVal: setColor, norm: '( Pale Yellow )' },
                      { key: 'appearance', label: 'Appearance :', val: appearance, setVal: setAppearance, norm: '( Clear )' },
                      { key: 'spGravity', label: 'Sp. Gravity :', val: spGravity, setVal: setSpGravity, norm: '( 1.005 - 1.030 )' },
                      { key: 'reactionPh', label: 'Reaction (pH) :', val: reactionPh, setVal: setReactionPh, norm: '( 4.5 - 8.0 Acidic )' },
                      { key: 'albumin', label: 'Albumin :', val: albumin, setVal: setAlbumin, norm: '( Nil )' },
                      { key: 'sugar', label: 'Sugar :', val: sugar, setVal: setSugar, norm: '( Nil )' },
                      { key: 'bileSalts', label: 'Bile Salts :', val: bileSalts, setVal: setBileSalts, norm: '( Negative )' },
                      { key: 'ketoneBodies', label: 'Ketone Bodies :', val: ketoneBodies, setVal: setKetoneBodies, norm: '( Negative )' },
                    ].map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 80px 1fr',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                        <input
                          className="cms-input"
                          style={{ height: '26px', fontSize: '11px', textAlign: 'center' }}
                          placeholder="—"
                          value={r.val}
                          onChange={(e) => r.setVal(e.target.value)}
                        />
                        <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Microscopic Examination */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#0369a1',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    MICROSCOPIC EXAMINATION (PER HPF)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                    {[
                      { key: 'pusCells', label: 'Pus Cells :', val: pusCells, setVal: setPusCells, norm: '( 0 - 5 / HPF )' },
                      { key: 'epithelialCells', label: 'Epithelial Cells :', val: epithelialCells, setVal: setEpithelialCells, norm: '( 1 - 4 / HPF )' },
                      { key: 'rbcUrine', label: 'R.B.C. :', val: rbcUrine, setVal: setRbcUrine, norm: '( 0 - 2 / HPF )' },
                      { key: 'crystals', label: 'Crystals :', val: crystals, setVal: setCrystals, norm: '( Nil / Not seen )' },
                      { key: 'casts', label: 'Casts :', val: casts, setVal: setCasts, norm: '( Nil )' },
                      { key: 'bacteria', label: 'Bacteria :', val: bacteria, setVal: setBacteria, norm: '( Nil )' },
                      { key: 'otherUrine', label: 'Other :', val: otherUrine, setVal: setOtherUrine, norm: '( Nil )' },
                    ].map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 80px 1fr',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                        <input
                          className="cms-input"
                          style={getInputStyle(r.key, r.val, { height: '26px', fontSize: '11px', textAlign: 'center' })}
                          placeholder="—"
                          value={r.val}
                          onChange={(e) => r.setVal(e.target.value)}
                        />
                        <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: OTHER REPORTS */}
            {activeTab === 'other' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Bilirubin */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0369a1',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      BILIRUBIN &amp; HEPATIC ENZYMES
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { key: 'biliTotal', label: 'Total :', val: biliTotal, setVal: setBiliTotal, norm: '0.2 - 1.0 mg/dl' },
                        { key: 'biliDirect', label: 'Direct :', val: biliDirect, setVal: setBiliDirect, norm: 'up to 0.3 mg/dl' },
                        { key: 'biliIndirect', label: 'Indirect :', val: biliIndirect, setVal: setBiliIndirect, norm: '0.1 - 1.0 mg/dl' },
                        { key: 'sgpt', label: 'S.G.P.T. :', val: sgpt, setVal: setSgpt, norm: '10 - 40 IU / L' },
                        { key: 'g6pd', label: 'G6PD :', val: g6pd, setVal: setG6pd, norm: '( Normal )' },
                        { key: 'hivTest', label: 'HIV Test :', val: hivTest, setVal: setHivTest, norm: '( Non Reactive )' },
                      ].map((r, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 80px 1fr',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input
                            className="cms-input"
                            style={getInputStyle(r.key, r.val, { height: '26px', fontSize: '11px', textAlign: 'center' })}
                            placeholder="—"
                            value={r.val}
                            onChange={(e) => r.setVal(e.target.value)}
                          />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* S.Widal Test */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#6d28d9',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      S.WIDAL TEST (TYPHOID SEROLOGY)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { key: 'typhiO', label: "S.Typhi 'O' :", val: typhiO, setVal: setTyphiO, norm: '( 1:30 Normal )' },
                        { key: 'typhiH', label: "S.Typhi 'H' :", val: typhiH, setVal: setTyphiH, norm: '( 1:30 Normal )' },
                        { key: 'typhiAH', label: "S.Paratyphi 'AH' :", val: typhiAH, setVal: setTyphiAH, norm: '( 1:30 Normal )' },
                        { key: 'typhiBH', label: "S.Paratyphi 'BH' :", val: typhiBH, setVal: setTyphiBH, norm: '( 1:30 Normal )' },
                        { key: 'widalResult', label: 'Result :', val: widalResult, setVal: setWidalResult, norm: '( Negative )' },
                      ].map((r, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '100px 80px 1fr',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input
                            className="cms-input"
                            style={{ height: '26px', fontSize: '11px', textAlign: 'center' }}
                            placeholder="—"
                            value={r.val}
                            onChange={(e) => r.setVal(e.target.value)}
                          />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Free Text Findings: X-Ray, Stool, USG, MRI & Custom Added Boxes */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  {/* Section Header with Add New Box Button */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0369a1',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                      }}
                    >
                      DIAGNOSTIC RADIOLOGY, SONOGRAPHY &amp; SPECIAL REPORTS (DOCTOR FREE-TEXT FINDINGS)
                    </div>

                    {/* Add New Box Controls */}
                    <div>
                      {showAddBox ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            className="cms-input"
                            style={{
                              height: '28px',
                              fontSize: '11.5px',
                              width: '180px',
                              padding: '2px 8px',
                              fontWeight: 700,
                              borderColor: '#0284c7',
                            }}
                            placeholder="Box Title (e.g. ECG, ECHO)..."
                            value={newBoxTitle}
                            onChange={(e) => setNewBoxTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddBox();
                              } else if (e.key === 'Escape') {
                                setShowAddBox(false);
                                setNewBoxTitle('');
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAddBox}
                            style={{
                              background: '#0284c7',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <i className="fa-solid fa-check" /> Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddBox(false);
                              setNewBoxTitle('');
                            }}
                            style={{
                              background: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddBox(true)}
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: '6px',
                            padding: '4px 12px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Add a new custom report or finding box (e.g. ECG, ECHO, Biopsy)"
                        >
                          <i className="fa-solid fa-plus" /> + Add New Box
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Grid of Report Boxes */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        specialReports.length <= 4
                          ? `repeat(${Math.max(specialReports.length, 1)}, 1fr)`
                          : 'repeat(auto-fill, minmax(210px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {specialReports.map((box) => (
                      <div
                        key={box.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px',
                            borderBottom: '1px solid #edf2f7',
                            paddingBottom: '3px',
                          }}
                        >
                          <label
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#0369a1',
                              margin: 0,
                              letterSpacing: '0.3px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {box.title}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveBox(box.id)}
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #fecaca',
                              color: '#b91c1c',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              borderRadius: '4px',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: 1,
                              padding: 0,
                            }}
                            title={`Cancel / Remove ${box.title} box`}
                          >
                            ×
                          </button>
                        </div>
                        <textarea
                          className="cms-input"
                          style={{
                            width: '100%',
                            height: '75px',
                            fontSize: '11px',
                            resize: 'vertical',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '6px 8px',
                          }}
                          placeholder={box.placeholder || `Write ${box.title} findings / notes...`}
                          value={box.value || ''}
                          onChange={(e) => handleBoxValueChange(box.id, e.target.value)}
                        />
                      </div>
                    ))}
                    {specialReports.length === 0 && (
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          padding: '16px',
                          textAlign: 'center',
                          color: '#94a3b8',
                          fontSize: '12px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px dashed #cbd5e1',
                        }}
                      >
                        No report boxes currently added. Click <b>+ Add New Box</b> above to generate one.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Action Sidebar */}
          <div style={{ width: '110px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: '#095c54',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <i className="fa-solid fa-floppy-disk" /> Save
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: '#fff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <i className="fa-solid fa-print" /> Print
            </button>
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: '#fff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <i className="fa-solid fa-rotate-left" /> Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#fff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              Cancel
            </button>

            <div style={{ marginTop: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-door-open" /> Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
