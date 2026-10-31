import React, { useState } from 'react';

export default function LabReportModal({ patient, family, doctorName = 'Dr. Chirag Paghdal', caseNo, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('hematology');

  // General details
  const [labName, setLabName] = useState('Diagnostic Laboratory Name');
  const [entryDate, setEntryDate] = useState('31-10-2026');

  // Hematology fields
  const [hemoglobin, setHemoglobin] = useState('12.0-16.0');
  const [rbcCount, setRbcCount] = useState('4.2-5.4');
  const [wbcCount, setWbcCount] = useState('4000-10000');
  const [plateletCount, setPlateletCount] = useState('150000-40000');
  const [esr, setEsr] = useState('2-20');
  // Differential WBC
  const [bandCell, setBandCell] = useState('0-6');
  const [neutrophils, setNeutrophils] = useState('55-70');
  const [lymphocytes, setLymphocytes] = useState('20-40');
  const [eosinophils, setEosinophils] = useState('1-6');
  const [monocytes, setMonocytes] = useState('2-8');
  const [basophils, setBasophils] = useState('0-1');
  const [parasites, setParasites] = useState('');
  // Blood Glucose & Renal
  const [rbs, setRbs] = useState('60-120');
  const [fbs, setFbs] = useState('70-100');
  const [ppbs, setPpbs] = useState('70-140');
  const [creatinin, setCreatinin] = useState('0.5-1.5');
  const [vitaminB12, setVitaminB12] = useState('200-900');
  // Thyroid
  const [t3, setT3] = useState('82-200');
  const [t4, setT4] = useState('4.5-12.5');
  const [tsh, setTsh] = useState('0.4-6.0');

  // Urine fields
  const [quantity, setQuantity] = useState('');
  const [color, setColor] = useState('');
  const [appearance, setAppearance] = useState('');
  const [spGravity, setSpGravity] = useState('');
  const [reactionPh, setReactionPh] = useState('');
  const [albumin, setAlbumin] = useState('');
  const [sugar, setSugar] = useState('');
  const [bileSalts, setBileSalts] = useState('');
  const [ketoneBodies, setKetoneBodies] = useState('');
  const [pusCells, setPusCells] = useState('0-5');
  const [epithelialCells, setEpithelialCells] = useState('1-4');
  const [rbcUrine, setRbcUrine] = useState('0-2');
  const [crystals, setCrystals] = useState('');
  const [casts, setCasts] = useState('');
  const [bacteria, setBacteria] = useState('');
  const [otherUrine, setOtherUrine] = useState('Mucus / Nil');

  // Other Reports
  const [biliTotal, setBiliTotal] = useState('0.2-1.0');
  const [biliDirect, setBiliDirect] = useState('0.0-0.3');
  const [biliIndirect, setBiliIndirect] = useState('0.1-1.0');
  const [sgpt, setSgpt] = useState('10-40');
  const [g6pd, setG6pd] = useState('');
  const [hivTest, setHivTest] = useState('');
  const [typhiO, setTyphiO] = useState('');
  const [typhiH, setTyphiH] = useState('');
  const [typhiAH, setTyphiAH] = useState('');
  const [typhiBH, setTyphiBH] = useState('');
  const [widalResult, setWidalResult] = useState('');
  const [xrayNotes, setXrayNotes] = useState('');
  const [stoolNotes, setStoolNotes] = useState('');
  const [usgNotes, setUsgNotes] = useState('');
  const [mriNotes, setMriNotes] = useState('');

  const handleSave = () => {
    if (onSave) {
      onSave({ labName, entryDate });
    }
    onClose();
  };

  const handleClear = () => {
    setQuantity(''); setColor(''); setAppearance(''); setSpGravity(''); setReactionPh('');
    setAlbumin(''); setSugar(''); setBileSalts(''); setKetoneBodies('');
    setCrystals(''); setCasts(''); setBacteria('');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '1040px',
        maxHeight: '94vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header Bar */}
        <div style={{
          background: '#0284c7', color: '#fff', padding: '12px 18px',
          borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 800 }}>
            <i className="fa-solid fa-flask-vial" />
            <span>CMS - Laboratory Investigation &amp; Diagnostic Management Software</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '16px' }}
          >
            ×
          </button>
        </div>

        {/* Patient & Lab Meta Grid */}
        <div style={{
          padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '90px' }}>FAMILY NAME :</span>
            <input className="cms-input" readOnly value={family?.headName || patient?.name || ''} style={{ height: '30px', fontSize: '12px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '70px' }}>LAB NAME :</span>
            <input className="cms-input" value={labName} onChange={e => setLabName(e.target.value)} style={{ height: '30px', fontSize: '12px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '70px' }}>CASE NO :</span>
            <input className="cms-input font-mono" readOnly value={caseNo || '0001000102'} style={{ height: '30px', fontSize: '12px', fontWeight: 700 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '90px' }}>PATIENT NAME :</span>
            <input className="cms-input" readOnly value={patient?.name || ''} style={{ height: '30px', fontSize: '12px', fontWeight: 700 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '70px' }}>DR NAME :</span>
            <input className="cms-input" readOnly value={doctorName} style={{ height: '30px', fontSize: '12px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#475569', minWidth: '70px' }}>ENTRY DATE :</span>
            <input className="cms-input font-mono" value={entryDate} onChange={e => setEntryDate(e.target.value)} style={{ height: '30px', fontSize: '12px', fontWeight: 700 }} />
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', background: '#e2e8f0', padding: '6px 18px 0', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('hematology')}
            style={{
              padding: '8px 14px', borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer',
              background: activeTab === 'hematology' ? '#fff' : 'transparent',
              color: activeTab === 'hematology' ? '#0369a1' : '#64748b', fontWeight: 700, fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span style={{ color: '#dc2626' }}>🩸</span> Routine Hematology Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('urine')}
            style={{
              padding: '8px 14px', borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer',
              background: activeTab === 'urine' ? '#fff' : 'transparent',
              color: activeTab === 'urine' ? '#0369a1' : '#64748b', fontWeight: 700, fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span style={{ color: '#d97706' }}>✏</span> Routine Urine Examination Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('other')}
            style={{
              padding: '8px 14px', borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer',
              background: activeTab === 'other' ? '#fff' : 'transparent',
              color: activeTab === 'other' ? '#0369a1' : '#64748b', fontWeight: 700, fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '6px'
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
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px' }}>
                      ROUTINE HEMATOLOGY (CBC) PARAMETERS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { label: 'Hemoglobin :', val: hemoglobin, setVal: setHemoglobin, norm: '( 12.0 - 16.0 gm% )' },
                        { label: 'RBC Count :', val: rbcCount, setVal: setRbcCount, norm: '( 4.2 - 5.4 mill /c.mm )' },
                        { label: 'WBC Count :', val: wbcCount, setVal: setWbcCount, norm: '( 4000 - 10,000 /c.mm )' },
                        { label: 'Platelet Count :', val: plateletCount, setVal: setPlateletCount, norm: '( 1,50,000 - 4,00,000 / c.mm )' },
                        { label: 'ESR :', val: esr, setVal: setEsr, norm: '( 2 - 20 mm/hr. ) (< 50 yrs)' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 90px 1fr', alignItems: 'center', gap: '6px' }}>
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input className="cms-input" style={{ height: '26px', fontSize: '11px', textAlign: 'center' }} value={r.val} onChange={e => r.setVal(e.target.value)} />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Differential WBC */}
                  <div style={{ border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', background: '#fffbeb' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '8px' }}>
                      DIFFERENTIAL WBC COUNT POLYMORPHS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { label: 'Band Cell :', val: bandCell, setVal: setBandCell, norm: '( 0 - 6 % )' },
                        { label: 'Neutrophils :', val: neutrophils, setVal: setNeutrophils, norm: '( 55 - 70 % )' },
                        { label: 'Lymphocytes :', val: lymphocytes, setVal: setLymphocytes, norm: '( 20 - 40 % )' },
                        { label: 'Eosinophils :', val: eosinophils, setVal: setEosinophils, norm: '( 1 - 6 % )' },
                        { label: 'Monocytes :', val: monocytes, setVal: setMonocytes, norm: '( 2 - 8 % )' },
                        { label: 'Basophils :', val: basophils, setVal: setBasophils, norm: '( 0 - 01 % )' },
                        { label: 'Parasites :', val: parasites, setVal: setParasites, norm: '( Negative / Not Seen )' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 80px 1fr', alignItems: 'center', gap: '6px' }}>
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input className="cms-input" style={{ height: '26px', fontSize: '11px', textAlign: 'center', background: '#fff' }} value={r.val} onChange={e => r.setVal(e.target.value)} />
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
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px' }}>
                      BLOOD GLUCOSE &amp; RENAL PROFILE
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { label: 'RBS :', val: rbs, setVal: setRbs, norm: '( upto - 120 mg% )' },
                        { label: 'FBS :', val: fbs, setVal: setFbs, norm: '( 70 - 100 mg% )' },
                        { label: 'PPBS :', val: ppbs, setVal: setPpbs, norm: '( upto - 140 mg% )' },
                        { label: 'S.Creatinin :', val: creatinin, setVal: setCreatinin, norm: '( 0.5 - 1.5 mg/dl )' },
                        { label: 'Vitamin B 12 :', val: vitaminB12, setVal: setVitaminB12, norm: '( 200 - 900 pg/ml )' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 80px 1fr', alignItems: 'center', gap: '6px' }}>
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input className="cms-input" style={{ height: '26px', fontSize: '11px', textAlign: 'center' }} value={r.val} onChange={e => r.setVal(e.target.value)} />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Thyroid Function Test */}
                  <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', background: '#f0fdf4' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: '8px' }}>
                      THYROID FUNCTION TEST :
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { label: 'T3 :', val: t3, setVal: setT3, norm: '( 82 - 200 ng/ml )' },
                        { label: 'T4 :', val: t4, setVal: setT4, norm: '( 4.5 - 12.5 mg% )' },
                        { label: 'TSH :', val: tsh, setVal: setTsh, norm: '( 0.4 - 6.0 mlu/ml )' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 80px 1fr', alignItems: 'center', gap: '6px' }}>
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input className="cms-input" style={{ height: '26px', fontSize: '11px', textAlign: 'center', background: '#fff' }} value={r.val} onChange={e => r.setVal(e.target.value)} />
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
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px' }}>
                    PHYSICAL &amp; CHEMICAL EXAMINATION
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                    {[
                      { label: 'Quantity :', val: quantity, setVal: setQuantity, norm: '( 30 - 50 ml )' },
                      { label: 'Color :', val: color, setVal: setColor, norm: '( Pale Yellow )' },
                      { label: 'Appearance :', val: appearance, setVal: setAppearance, norm: '( Clear )' },
                      { label: 'Sp. Gravity :', val: spGravity, setVal: setSpGravity, norm: '( 1.005 - 1.030 )' },
                      { label: 'Reaction (pH) :', val: reactionPh, setVal: setReactionPh, norm: '( 4.5 - 8.0 Acidic )' },
                      { label: 'Albumin :', val: albumin, setVal: setAlbumin, norm: '( Nil )' },
                      { label: 'Sugar :', val: sugar, setVal: setSugar, norm: '( Nil )' },
                      { label: 'Bile Salts :', val: bileSalts, setVal: setBileSalts, norm: '( Negative )' },
                      { label: 'Ketone Bodies :', val: ketoneBodies, setVal: setKetoneBodies, norm: '( Negative )' },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr', alignItems: 'center', gap: '6px' }}>
                        <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                        <input className="cms-input" style={{ height: '26px', fontSize: '11px', textAlign: 'center' }} value={r.val} onChange={e => r.setVal(e.target.value)} />
                        <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Microscopic Examination */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px' }}>
                    MICROSCOPIC EXAMINATION (PER HPF)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                    {[
                      { label: 'Pus Cells :', val: pusCells, setVal: setPusCells, norm: '( 0 - 5 / HPF )' },
                      { label: 'Epithelial Cells :', val: epithelialCells, setVal: setEpithelialCells, norm: '( 1 - 4 / HPF )' },
                      { label: 'R.B.C. :', val: rbcUrine, setVal: setRbcUrine, norm: '( 0 - 2 / HPF )' },
                      { label: 'Crystals :', val: crystals, setVal: setCrystals, norm: '( Nil / Not seen )' },
                      { label: 'Casts :', val: casts, setVal: setCasts, norm: '( Nil )' },
                      { label: 'Bacteria :', val: bacteria, setVal: setBacteria, norm: '( Nil )' },
                      { label: 'Other :', val: otherUrine, setVal: setOtherUrine, norm: '( Nil )' },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr', alignItems: 'center', gap: '6px' }}>
                        <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                        <input className="cms-input" style={{ height: '26px', fontSize: '11px', textAlign: 'center' }} value={r.val} onChange={e => r.setVal(e.target.value)} />
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
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px' }}>
                      BILIRUBIN &amp; HEPATIC ENZYMES
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { label: 'Total :', val: biliTotal, setVal: setBiliTotal, norm: '0 - 1.0 mg/dl' },
                        { label: 'Direct :', val: biliDirect, setVal: setBiliDirect, norm: 'up to 0.3 mg/dl' },
                        { label: 'Indirect :', val: biliIndirect, setVal: setBiliIndirect, norm: '0.1 - 1.0 mg/dl' },
                        { label: 'S.G.P.T. :', val: sgpt, setVal: setSgpt, norm: '10 - 40 IU / L' },
                        { label: 'G6PD :', val: g6pd, setVal: setG6pd, norm: '( Normal )' },
                        { label: 'HIV Test :', val: hivTest, setVal: setHivTest, norm: '( Non Reactive )' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr', alignItems: 'center', gap: '6px' }}>
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input className="cms-input" style={{ height: '26px', fontSize: '11px', textAlign: 'center' }} value={r.val} onChange={e => r.setVal(e.target.value)} />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* S.Widal Test */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', marginBottom: '8px' }}>
                      S.WIDAL TEST (TYPHOID SEROLOGY)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                      {[
                        { label: "S.Typhi 'O' :", val: typhiO, setVal: setTyphiO, norm: '( 1:30 Normal )' },
                        { label: "S.Typhi 'H' :", val: typhiH, setVal: setTyphiH, norm: '( 1:30 Normal )' },
                        { label: "S.Paratyphi 'AH' :", val: typhiAH, setVal: setTyphiAH, norm: '( 1:30 Normal )' },
                        { label: "S.Paratyphi 'BH' :", val: typhiBH, setVal: setTyphiBH, norm: '( 1:30 Normal )' },
                        { label: 'Result :', val: widalResult, setVal: setWidalResult, norm: '( Negative )' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr', alignItems: 'center', gap: '6px' }}>
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.label}</span>
                          <input className="cms-input" style={{ height: '26px', fontSize: '11px', textAlign: 'center' }} value={r.val} onChange={e => r.setVal(e.target.value)} />
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>{r.norm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Free Text Findings: X-Ray, Stool, USG, MRI */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px' }}>
                    DIAGNOSTIC RADIOLOGY, SONOGRAPHY &amp; SPECIAL REPORTS (DOCTOR FREE-TEXT FINDINGS)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', textAlign: 'center', marginBottom: '4px' }}>X - RAY</label>
                      <textarea
                        className="cms-input" style={{ width: '100%', height: '80px', fontSize: '11px', resize: 'vertical' }}
                        placeholder="Write X-Ray findings / impression here..."
                        value={xrayNotes} onChange={e => setXrayNotes(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', textAlign: 'center', marginBottom: '4px' }}>STOOL</label>
                      <textarea
                        className="cms-input" style={{ width: '100%', height: '80px', fontSize: '11px', resize: 'vertical' }}
                        placeholder="Write Stool Examination notes..."
                        value={stoolNotes} onChange={e => setStoolNotes(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', textAlign: 'center', marginBottom: '4px' }}>SONOGRAPHY (USG)</label>
                      <textarea
                        className="cms-input" style={{ width: '100%', height: '80px', fontSize: '11px', resize: 'vertical' }}
                        placeholder="Write USG Abdomen / Pelvis report notes..."
                        value={usgNotes} onChange={e => setUsgNotes(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#0369a1', textAlign: 'center', marginBottom: '4px' }}>MRI / CTSCAN</label>
                      <textarea
                        className="cms-input" style={{ width: '100%', height: '80px', fontSize: '11px', resize: 'vertical' }}
                        placeholder="Write MRI / CT Scan report findings..."
                        value={mriNotes} onChange={e => setMriNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Action Sidebar (Exact match with screenshot) */}
          <div style={{ width: '110px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: '#095c54', color: '#fff', border: 'none', borderRadius: '6px',
                padding: '8px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <i className="fa-solid fa-floppy-disk" /> Save
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px',
                padding: '8px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <i className="fa-solid fa-print" /> Print
            </button>
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px',
                padding: '8px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <i className="fa-solid fa-rotate-left" /> Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px',
                padding: '8px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              Cancel
            </button>

            <div style={{ marginTop: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5',
                  borderRadius: '6px', padding: '8px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
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
