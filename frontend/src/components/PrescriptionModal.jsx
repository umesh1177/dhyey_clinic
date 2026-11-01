import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fmtDate } from '../services/api';

export const DIETARY_TRANSLATIONS = {
  DB: {
    EN: 'Diabetic diet: Avoid sugar, sweets, and high-carb food. Prefer high-fibre meals.',
    GU: 'ડાયાબિટીસ પરેજી: ખાંડ, મીઠાઈ અને ગળી વસ્તુઓ બંધ રાખવી. લીલા શાકભાજી વધુ લેવા.',
    HI: 'मधुमेह आहार: चीनी, मिठाई और मीठी चीजों से बचें। अधिक फाइबर वाला भोजन लें।',
  },
  CV: {
    EN: 'Low-salt, low-oil cardiac diet. Avoid red meat, fried items, and processed foods.',
    GU: 'હૃદય રોગ પરેજી: મીઠું (નમક) અને તેલ ઓછું ખાવું. તળેલી વસ્તુઓ ટાળવી.',
    HI: 'हृदय आहार: नमक और तेल कम खाएं। तली हुई और पैक्ड चीजों से परहेज करें।',
  },
  LQ: {
    EN: 'Drink plenty of warm fluids, water, soups, and light digestible diet.',
    GU: 'પુષ્કળ પ્રવાહી, ગરમ પાણી, સૂપ અને હળવો સુપાચ્ય ખોરાક લેવો.',
    HI: 'खूब पानी, गुनगुना तरल पदार्थ, सूप और सुपाच्य भोजन लें।',
  },
  SUGAR: {
    EN: 'Strictly avoid direct sugar, jaggery, honey, and high glycemic fruits.',
    GU: 'ખાંડ, ગોળ, મધ અને મીઠા ફળો (કેરી, ચીકુ, કેળાં) બિલકુલ ન ખાવા.',
    HI: 'चीनी, गुड़, शहद और बहुत मीठे फल खाने से बचें।',
  },
  BP: {
    EN: 'Strict low-salt diet. Avoid pickles, papad, processed cheese, and salty snacks.',
    GU: 'મીઠું ખૂબ ઓછું ખાવું. અથાણાં, પાપડ અને ખારી વસ્તુઓ બંધ રાખવી.',
    HI: 'नमक बहुत कम लें। अचार, पापड़ और नमकीन चीजों से परहेज करें।',
  },
  ACID: {
    EN: 'Avoid spicy, sour, oily food, tea, and coffee. Drink cool milk or coconut water.',
    GU: 'તીખું, ખાટું અને તેલવાળું ન ખાવું. ચા-કોફી ટાળવી. ઠંડુ દૂધ કે નાળિયેર પાણી લેવું.',
    HI: 'तीखा, खट्टा और तैलीय भोजन बंद रखें। चाय-कॉफी न लें। नारियल पानी पिएं।',
  },
};

export default function PrescriptionModal({ patient, visit, onClose, autoPrint = false }) {
  const { session, activeClinic } = useAuth();
  const [lang, setLang] = useState('EN');
  const [selectedDietCodes, setSelectedDietCodes] = useState(visit?.dietaryCodes || ['LQ']);

  React.useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const docName = session?.profile?.name || 'Dr. Chirag Paghdal';
  const clinicName = activeClinic?.name || 'Dhyey Clinic & Hospital';

  const t = {
    med: lang === 'GU' ? 'દવા' : lang === 'HI' ? 'दवा' : 'Medicine',
    qty: lang === 'GU' ? 'માત્રા' : lang === 'HI' ? 'मात्रा' : 'Qty',
    inst: lang === 'GU' ? 'લેવાની રીત' : lang === 'HI' ? 'खुराक का विवरण' : 'Dosage Instructions',
    diet: lang === 'GU' ? 'ખાવાની પરેજી:' : lang === 'HI' ? 'आहार संबंधी सलाह:' : 'Dietary Advice:',
    mor: lang === 'GU' ? 'સવારે' : lang === 'HI' ? 'सुबह' : 'Morning',
    noon: lang === 'GU' ? 'બપોરે' : lang === 'HI' ? 'दोपहर' : 'Noon',
    eve: lang === 'GU' ? 'સાંજે' : lang === 'HI' ? 'शाम' : 'Evening',
    ngt: lang === 'GU' ? 'રાત્રે' : lang === 'HI' ? 'रात' : 'Night',
    bf: lang === 'GU' ? 'જમ્યા પહેલા' : lang === 'HI' ? 'खाने से पहले' : 'Before Food',
    af: lang === 'GU' ? 'જમ્યા પછી' : lang === 'HI' ? 'खाने के बाद' : 'After Food',
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleDietCode = (code) => {
    if (selectedDietCodes.includes(code)) {
      setSelectedDietCodes(selectedDietCodes.filter((c) => c !== code));
    } else {
      setSelectedDietCodes([...selectedDietCodes, code]);
    }
  };

  return (
    <div className="cms-modal-backdrop" style={{ zIndex: 10000 }}>
      <div
        className="cms-modal-content"
        style={{
          width: '95%',
          maxWidth: '720px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface, #ffffff)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        }}
      >
        {/* Modal Controls Header */}
        <div
          className="no-print"
          style={{
            padding: '12px 18px',
            background: 'var(--surface-alt, #f8fafc)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted)' }}>
              Prescription Language:
            </span>
            <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                className="cms-btn-ghost"
                onClick={() => setLang('EN')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: lang === 'EN' ? 700 : 500,
                  background: lang === 'EN' ? 'var(--primary)' : 'transparent',
                  color: lang === 'EN' ? '#ffffff' : 'var(--text)',
                }}
              >
                English
              </button>
              <button
                type="button"
                className="cms-btn-ghost"
                onClick={() => setLang('GU')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: lang === 'GU' ? 700 : 500,
                  background: lang === 'GU' ? 'var(--primary)' : 'transparent',
                  color: lang === 'GU' ? '#ffffff' : 'var(--text)',
                }}
              >
                ગુજરાતી
              </button>
              <button
                type="button"
                className="cms-btn-ghost"
                onClick={() => setLang('HI')}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: lang === 'HI' ? 700 : 500,
                  background: lang === 'HI' ? 'var(--primary)' : 'transparent',
                  color: lang === 'HI' ? '#ffffff' : 'var(--text)',
                }}
              >
                हिन्दी
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="cms-btn cms-btn-primary" onClick={handlePrint} style={{ padding: '6px 14px' }}>
              <i className="fa-solid fa-print"></i> Print (Thermal / A5)
            </button>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} style={{ padding: '6px 10px' }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Dietary Advice Code Toggles (No Print) */}
        <div
          className="no-print"
          style={{
            padding: '8px 18px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '11.5px',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Diet Presets:</span>
          {Object.keys(DIETARY_TRANSLATIONS).map((code) => (
            <button
              key={code}
              type="button"
              className="cms-btn-ghost"
              onClick={() => toggleDietCode(code)}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                background: selectedDietCodes.includes(code) ? 'rgba(9,92,84,0.1)' : 'transparent',
                color: selectedDietCodes.includes(code) ? 'var(--primary)' : 'var(--text)',
                fontWeight: selectedDietCodes.includes(code) ? 700 : 500,
              }}
            >
              {code}
            </button>
          ))}
        </div>

        {/* Printable Prescription Body */}
        <div
          id="cms-print-area"
          className="cms-print-area"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 30px',
            background: '#ffffff',
            color: '#1e293b',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* Header Letterhead */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '2.5px solid #095c54',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#095c54' }}>{clinicName}</div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                {activeClinic?.address || '101, Medical Enclave, CG Road, Ahmedabad'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Phone: {activeClinic?.phone || '9876543210'} · Timings: 09:00 AM - 08:00 PM
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{docName}</div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                {session?.profile?.degree || 'B.H.M.S.'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Reg No: {session?.profile?.regNo || 'G-9035'}
              </div>
            </div>
          </div>

          {/* Patient Meta Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              padding: '10px 14px',
              background: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '18px',
            }}
          >
            <div>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Patient: </span>
              <strong>{patient?.name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Age/Sex: </span>
              {patient?.age ? `${patient.age} Y` : '-'} / {patient?.gender || '-'}
            </div>
            <div>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Case ID: </span>
              <span className="font-mono">#{visit?.caseId}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Date: </span>
              {fmtDate(visit?.date)}
            </div>
          </div>

          {/* Vitals Summary */}
          {(visit?.bp || visit?.sugar || visit?.weight || visit?.pulse) && (
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', marginBottom: '14px', color: '#334155' }}>
              {visit.bp && <span><strong>BP:</strong> {visit.bp} mmHg</span>}
              {visit.sugar && <span><strong>Sugar:</strong> {visit.sugar} mg/dL</span>}
              {visit.pulse && <span><strong>Pulse:</strong> {visit.pulse} bpm</span>}
              {visit.weight && <span><strong>Weight:</strong> {visit.weight} kg</span>}
              {visit.diagnosis && (
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#095c54' }}>
                  Dx: {visit.diagnosis}
                </span>
              )}
            </div>
          )}

          {(visit?.complaint || visit?.investigation) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px', marginBottom: '12px', color: '#475569' }}>
              {visit.complaint && <div><strong>Complaint:</strong> {visit.complaint}</div>}
              {visit.investigation && <div><strong>Investigation:</strong> {visit.investigation}</div>}
            </div>
          )}

          {/* Rx Icon */}
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#095c54', margin: '10px 0 6px', fontFamily: 'serif' }}>
            ℞
          </div>

          {/* Prescription Medicine Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>{t.med}</th>
                <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>{t.qty}</th>
                <th style={{ padding: '8px 10px' }}>{t.inst}</th>
              </tr>
            </thead>
            <tbody>
              {(visit?.prescription || []).map((p, idx) => {
                const parts = [];
                if (p.mor && p.mor !== '0') parts.push(`${p.mor} ${t.mor}`);
                if (p.noon && p.noon !== '0') parts.push(`${p.noon} ${t.noon}`);
                if (p.eve && p.eve !== '0') parts.push(`${p.eve} ${t.eve}`);
                if (p.ngt && p.ngt !== '0') parts.push(`${p.ngt} ${t.ngt}`);

                let timing = '';
                if (p.timing === 'BF') timing = ` (${t.bf})`;
                else if (p.timing === 'AF') timing = ` (${t.af})`;
                else if (p.timing) timing = ` (${p.timing})`;

                const dosageText = parts.length > 0 ? parts.join(' - ') + timing : timing || '-';

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                      {idx + 1}. {p.name}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>
                      {p.qty || '-'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                      <span>{dosageText}</span>
                      {p.notes && <div style={{ fontSize: '11px', color: '#64748b' }}>{p.notes}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Dietary Advice */}
          {selectedDietCodes.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#095c54', marginBottom: '6px' }}>
                <i className="fa-solid fa-utensils" style={{ marginRight: '6px' }}></i>
                {t.diet}
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                {selectedDietCodes.map((code) => {
                  const advice = DIETARY_TRANSLATIONS[code]?.[lang] || DIETARY_TRANSLATIONS[code]?.EN || code;
                  return <li key={code}>{advice}</li>;
                })}
              </ul>
            </div>
          )}

          {/* Doctor Signature Footnote */}
          <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
            <div>
              <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', marginBottom: '6px' }}></div>
              <div style={{ fontWeight: 700, fontSize: '12.5px' }}>{docName}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Authorized Doctor Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
