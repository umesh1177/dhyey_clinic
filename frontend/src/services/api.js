/**
 * =========================================================
 * CLINIC API CLIENT & DATA ADAPTER (React Vite Version)
 * Unified native fetch() API wrapper with offline fallback
 * =========================================================
 */

// const API_BASE_URL = (typeof window !== 'undefined' && (window.location.port === '5000' || window.location.port === '5173'))
//   ? ''
//   : 'http://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/* ---- Storage & Helpers ---- */
export const pad = (n, len = 4) => String(n || 0).padStart(len, '0');
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}`;
};
export const fmtDate = (iso) => {
  if (!iso) return '-';
  const parts = String(iso).slice(0, 10).split('-');
  if (parts.length < 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};
export const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const uid = () => Math.random().toString(36).slice(2, 10);

export const getClinicPrefix = (clinicId = 'demo') => {
  if (!clinicId || clinicId === 'demo') return '0001';
  const digits = String(clinicId).replace(/\D/g, '');
  if (digits) return pad(digits, 4);
  const clean = String(clinicId).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.slice(0, 4).padStart(4, '0');
};

export const generateFamilyId = (clinicId, year, seq) => {
  const prefix = getClinicPrefix(clinicId);
  const y = String(year || new Date().getFullYear());
  const s = pad(seq || 1, 4);
  return `${prefix}${y}${s}`; // e.g. 000120260001
};

export const makeCaseId = (famId, patId, visitNum) => {
  const f = pad(String(famId).replace(/\D/g, '') || famId, 2);
  const p = pad(String(patId).replace(/\D/g, '') || patId, 2);
  const v = pad(String(visitNum).replace(/\D/g, '') || visitNum, 2);
  return `${f}${p}${v}`;
};

/* ---- Global Toast Trigger ---- */
export function showToast(msg, type = 'success') {
  const existing = document.getElementById('cms-global-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'cms-global-toast';
  toast.className = `cms-toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `
    <span>${type === 'error' ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '<i class="fa-solid fa-circle-check"></i>'}</span>
    <span>${msg}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3500);
}

/* ---- HTTP Headers Builder ---- */
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  const session = getAuthSession();
  if (session && session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  if (session && session.profile && session.profile.activeClinicId) {
    headers['x-clinic-id'] = session.profile.activeClinicId;
  }
  return headers;
}

/* ---- Session Management ---- */
export function getAuthSession() {
  try {
    const raw = localStorage.getItem('clinic-auth-session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setAuthSession(data) {
  if (!data) {
    localStorage.removeItem('clinic-auth-session');
  } else {
    localStorage.setItem('clinic-auth-session', JSON.stringify(data));
  }
}

/* ---- Native Fetch API Calls ---- */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const config = {
    method: options.method || 'GET',
    headers: { ...getHeaders(), ...(options.headers || {}) },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`[API Database Error on ${endpoint}]:`, err.message);
    throw err;
  }
}

/* ---- Default Master Datasets ---- */
export const defaultMasterComplaints = [
  { id: 'c1', name: 'Fever / High Temperature', category: 'General', description: 'Body temperature above 100°F with chills', createdAt: '2026-01-01' },
  { id: 'c2', name: 'Cough / Cold / Sore Throat', category: 'Respiratory', description: 'Dry or productive throat irritation and congestion', createdAt: '2026-01-01' },
  { id: 'c3', name: 'Headache / Migraine', category: 'Neurological', description: 'Frontal or throbbing head pain', createdAt: '2026-01-01' },
  { id: 'c4', name: 'Chest Pain / Discomfort', category: 'Cardiovascular', description: 'Substernal tightness or radiating pain', createdAt: '2026-01-01' },
  { id: 'c5', name: 'Acidity / Heartburn / Gastric Pain', category: 'Gastrointestinal', description: 'Epigastric burning sensation after meals', createdAt: '2026-01-01' },
  { id: 'c6', name: 'Joint Pain / Knee Swelling', category: 'Orthopedic', description: 'Arthritic pain and stiffness', createdAt: '2026-01-01' },
  { id: 'c7', name: 'General Weakness / Fatigue', category: 'General', description: 'Lethargy and malaise', createdAt: '2026-01-01' },
  { id: 'c8', name: 'Hypertension Check / Giddiness', category: 'Cardiovascular', description: 'Dizziness and elevated blood pressure', createdAt: '2026-01-01' },
  { id: 'c9', name: 'High Blood Sugar / Polyuria', category: 'Endocrine', description: 'Excessive thirst and urination', createdAt: '2026-01-01' },
  { id: 'c10', name: 'Nausea / Vomiting', category: 'Gastrointestinal', description: 'Stomach upset and regurgitation', createdAt: '2026-01-01' },
  { id: 'c11', name: 'Breathlessness / Dyspnea', category: 'Respiratory', description: 'Shortness of breath on exertion', createdAt: '2026-01-01' },
  { id: 'c12', name: 'Skin Rash / Itching', category: 'Dermatology', description: 'Allergic rashes or urticaria', createdAt: '2026-01-01' },
];

export const defaultMasterInvestigations = [
  { id: 'inv1', name: 'Complete Blood Count (CBC)', category: 'Blood / Hematology', sampleType: 'Whole Blood (EDTA)', description: 'Hb, TLC, DLC, Platelet count assessment', createdAt: '2026-01-01' },
  { id: 'inv2', name: 'Blood Sugar Fasting & PP (FBS/PPBS)', category: 'Biochemistry', sampleType: 'Fluoride Plasma', description: 'Glycemic control and diabetes evaluation', createdAt: '2026-01-01' },
  { id: 'inv3', name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', sampleType: 'Whole Blood (EDTA)', description: '3-month average blood glucose level', createdAt: '2026-01-01' },
  { id: 'inv4', name: 'Lipid Profile Complete', category: 'Biochemistry', sampleType: 'Serum', description: 'Cholesterol, Triglycerides, HDL, LDL, VLDL', createdAt: '2026-01-01' },
  { id: 'inv5', name: 'Liver Function Test (LFT)', category: 'Biochemistry', sampleType: 'Serum', description: 'SGPT, SGOT, Bilirubin, Alkaline Phosphatase', createdAt: '2026-01-01' },
  { id: 'inv6', name: 'Renal / Kidney Function Test (KFT/RFT)', category: 'Biochemistry', sampleType: 'Serum', description: 'Serum Creatinine, Blood Urea, Uric Acid', createdAt: '2026-01-01' },
  { id: 'inv7', name: 'Urine Routine & Microscopic (R/M)', category: 'Pathology', sampleType: 'Clean Catch Urine', description: 'Pus cells, Albumin, Sugar, RBCs in urine', createdAt: '2026-01-01' },
  { id: 'inv8', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Immunoassay', sampleType: 'Serum', description: 'Total T3, Total T4, and Ultra TSH assessment', createdAt: '2026-01-01' },
  { id: 'inv9', name: 'Chest X-Ray PA View', category: 'Radiology', sampleType: 'Digital X-Ray', description: 'Lungs, heart size, and pleura imaging', createdAt: '2026-01-01' },
  { id: 'inv10', name: '12-Lead ECG (Electrocardiogram)', category: 'Cardiology', sampleType: '12-Lead Tracing', description: 'Cardiac rhythm and ST-T segment evaluation', createdAt: '2026-01-01' },
];

export const defaultMasterMedicines = [
  { id: 'm1', name: 'Paracetamol 650mg (Dolo 650 / Calpol)', category: 'Antipyretic / Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 5, createdAt: '2026-01-01' },
  { id: 'm2', name: 'Paracetamol 500mg (Crocin)', category: 'Antipyretic / Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 4, createdAt: '2026-01-01' },
  { id: 'm3', name: 'Ibuprofen 400mg (Brufen)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 6, createdAt: '2026-01-01' },
  { id: 'm4', name: 'Combiflam (Ibuprofen + Paracetamol)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 7, createdAt: '2026-01-01' },
  { id: 'm5', name: 'Zerodol-P (Aceclofenac 100mg + Paracetamol 325mg)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 9, createdAt: '2026-01-01' },
  { id: 'm6', name: 'Amoxicillin 500mg (Novamox 500)', category: 'Antibiotic (Penicillin)', form: 'Capsule', defaultDosage: '1-0-1 AF', unitPrice: 12, createdAt: '2026-01-01' },
  { id: 'm7', name: 'Augmentin 625 (Amoxyclav 625 Duo)', category: 'Broad Spectrum Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 22, createdAt: '2026-01-01' },
  { id: 'm8', name: 'Azithromycin 500mg (Azithral 500)', category: 'Macrolide Antibiotic', form: 'Tablet', defaultDosage: '1-0-0 OD', unitPrice: 20, createdAt: '2026-01-01' },
  { id: 'm9', name: 'Pantoprazole 40mg (Pan 40 / Pantocid)', category: 'Antacid / PPI', form: 'Tablet', defaultDosage: '1-0-0 BF', unitPrice: 8, createdAt: '2026-01-01' },
  { id: 'm10', name: 'Pantoprazole + Domperidone (Pan-D)', category: 'Antacid / PPI + Prokinetic', form: 'Capsule', defaultDosage: '1-0-0 BF', unitPrice: 14, createdAt: '2026-01-01' },
  { id: 'm11', name: 'Cetirizine 10mg (Cetzine / Alerid)', category: 'Antihistamine / Allergy', form: 'Tablet', defaultDosage: '0-0-1 HS', unitPrice: 4, createdAt: '2026-01-01' },
  { id: 'm12', name: 'Montair-LC (Levocetirizine + Montelukast)', category: 'Allergic Rhinitis / Asthma', form: 'Tablet', defaultDosage: '0-0-1 HS', unitPrice: 16, createdAt: '2026-01-01' },
];

export const defaultMasterAllergies = [
  { id: 'al1', name: 'None', category: 'General', severity: 'None', createdAt: '2026-01-01' },
  { id: 'al2', name: 'Penicillin', category: 'Drug Allergy', severity: 'Severe', createdAt: '2026-01-01' },
  { id: 'al3', name: 'Sulfa Drugs', category: 'Drug Allergy', severity: 'Moderate', createdAt: '2026-01-01' },
  { id: 'al4', name: 'Aspirin / NSAIDs', category: 'Drug Allergy', severity: 'Moderate', createdAt: '2026-01-01' },
  { id: 'al5', name: 'Dust / Pollen', category: 'Environmental', severity: 'Mild', createdAt: '2026-01-01' },
  { id: 'al6', name: 'Peanuts / Nuts', category: 'Food Allergy', severity: 'Severe', createdAt: '2026-01-01' },
];

export const defaultMasterRelations = [
  { id: 'r1', name: 'Head', category: 'Primary', description: 'Head of Family', createdAt: '2026-01-01' },
  { id: 'r2', name: 'Wife', category: 'Spouse', description: 'Wife of Head', createdAt: '2026-01-01' },
  { id: 'r3', name: 'Husband', category: 'Spouse', description: 'Husband of Head', createdAt: '2026-01-01' },
  { id: 'r4', name: 'Son', category: 'Child', description: 'Son of Head', createdAt: '2026-01-01' },
  { id: 'r5', name: 'Daughter', category: 'Child', description: 'Daughter of Head', createdAt: '2026-01-01' },
  { id: 'r6', name: 'Father', category: 'Parent', description: 'Father of Head', createdAt: '2026-01-01' },
  { id: 'r7', name: 'Mother', category: 'Parent', description: 'Mother of Head', createdAt: '2026-01-01' },
  { id: 'r8', name: 'Brother', category: 'Sibling', description: 'Brother of Head', createdAt: '2026-01-01' },
  { id: 'r9', name: 'Sister', category: 'Sibling', description: 'Sister of Head', createdAt: '2026-01-01' },
  { id: 'r10', name: 'Other', category: 'Other', description: 'Other Relation', createdAt: '2026-01-01' },
];

export const defaultMasterAreas = [
  { id: 'a1', name: 'Main Road', city: 'Ahmedabad', pincode: '380001', createdAt: '2026-01-01' },
  { id: 'a2', name: 'Vastrapur', city: 'Ahmedabad', pincode: '380015', createdAt: '2026-01-01' },
  { id: 'a3', name: 'Satellite', city: 'Ahmedabad', pincode: '380015', createdAt: '2026-01-01' },
  { id: 'a4', name: 'Navrangpura', city: 'Ahmedabad', pincode: '380009', createdAt: '2026-01-01' },
  { id: 'a5', name: 'Bopal', city: 'Ahmedabad', pincode: '380058', createdAt: '2026-01-01' },
];

/* ---- Local Database Structure & Persistence ---- */
export function getLocalDB(clinicId = 'demo') {
  const key = `clinic_db_${clinicId || 'demo'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If parsed already has full 6 families, return it
      if (parsed.families && Object.keys(parsed.families).length >= 6) {
        return parsed;
      }
    }
  } catch (e) {}

  // Initial Full Demo Seed matching clinic screenshot exactly
  const initial = {
    families: {
      '000120260001': {
        id: '000120260001',
        famId: '000120260001',
        headName: 'PATEL RAMESHBHAI GOVINDBHAI',
        society: 'Shanti Niketan Apt',
        registeredBy: 'Self',
        area: 'VASTRAPUR',
        phone: '9876543210',
        year: 2026,
        sequence: 1,
        patients: {
          '00010001': {
            id: '00010001',
            patId: '00010001',
            familyId: '000120260001',
            name: 'PATEL RAMESHBHAI GOVINDBHAI',
            relation: 'Head',
            age: '46',
            gender: 'Male',
            bloodGroup: 'B+',
            allergy: 'Dust / Pollen',
            society: 'Shanti Niketan Apt',
            area: 'VASTRAPUR',
            phone: '9876543210',
            due: 0,
            visits: [
              {
                caseId: '00012026000101',
                visitNum: 1,
                date: todayISO(),
                time: '09:30 AM',
                weight: '74',
                bp: '130/85',
                sugar: '110',
                pulse: '76',
                reference: 'Dr. Shah',
                diagnosis: 'Acute Viral Pyrexia',
                complaint: 'High fever, body chills and shivering for 2 days',
                investigation: 'Complete Blood Count (CBC)',
                treatment: [
                  { name: 'Clinical Consultation', qty: '1', cost: 300 },
                  { name: 'Injection Paracetamol IM', qty: '1', cost: 300 },
                ],
                prescription: [
                  { name: 'Paracetamol 650mg', qty: '10', mor: '1', noon: '1', eve: '1', ngt: '0', timing: 'AF', notes: 'After food' },
                  { name: 'Pantoprazole 40mg', qty: '5', mor: '1', noon: '0', eve: '0', ngt: '0', timing: 'BF', notes: 'Before breakfast' },
                ],
                dietary: 'LQ: Light diet only. Khichdi, dal-rice, boiled vegetables, curd.',
                charge: 600,
                received: 600,
                due: 0,
              },
            ],
          },
          '00010002': {
            id: '00010002',
            patId: '00010002',
            familyId: '000120260001',
            name: 'PATEL SHARDABEN RAMESHBHAI',
            relation: 'Wife',
            age: '43',
            gender: 'Female',
            bloodGroup: 'B+',
            allergy: 'Penicillin',
            society: 'Shanti Niketan Apt',
            area: 'VASTRAPUR',
            phone: '9876543210',
            due: 300,
            visits: [
              {
                caseId: '00012026000102',
                visitNum: 1,
                date: '2026-09-29',
                time: '04:30 PM',
                weight: '62',
                bp: '120/80',
                reference: 'Self',
                diagnosis: 'Joint stiffness and lower backache',
                complaint: 'Joint stiffness and lower backache',
                investigation: 'X-Ray Lumbar Spine',
                treatment: [{ name: 'Orthopedic Consultation', qty: '1', cost: 500 }],
                prescription: [{ name: 'Aceclofenac + Paracetamol', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }],
                charge: 500,
                received: 200,
                due: 300,
              },
            ],
          },
          '00010003': {
            id: '00010003',
            patId: '00010003',
            familyId: '000120260001',
            name: 'PATEL DHRUVIL RAMESHBHAI',
            relation: 'Son',
            age: '20',
            gender: 'Male',
            bloodGroup: 'O+',
            allergy: 'None',
            society: 'Shanti Niketan Apt',
            area: 'VASTRAPUR',
            phone: '9876543210',
            due: 0,
            visits: [],
          },
        },
      },
      '000120260002': {
        id: '000120260002',
        famId: '000120260002',
        headName: 'SHARMA AMITBHAI DINESHBHAI',
        society: 'Gokuldham Society',
        registeredBy: 'Self',
        area: 'NAVRANGPURA',
        phone: '9876543211',
        year: 2026,
        sequence: 2,
        patients: {
          '00020001': {
            id: '00020001',
            patId: '00020001',
            familyId: '000120260002',
            name: 'SHARMA AMITBHAI DINESHBHAI',
            relation: 'Head',
            age: '50',
            gender: 'Male',
            bloodGroup: 'A+',
            allergy: 'None',
            society: 'Gokuldham Society',
            area: 'NAVRANGPURA',
            phone: '9876543211',
            due: 500,
            visits: [
              {
                caseId: '00012026000201',
                visitNum: 1,
                date: '2026-10-15',
                time: '11:00 AM',
                weight: '70',
                bp: '140/90',
                reference: 'Self',
                diagnosis: 'Hypertension Checkup',
                complaint: 'Occasional morning headache',
                charge: 500,
                received: 0,
                due: 500,
              },
            ],
          },
          '00020002': {
            id: '00020002',
            patId: '00020002',
            familyId: '000120260002',
            name: 'SHARMA PRIYABEN AMITBHAI',
            relation: 'Wife',
            age: '47',
            gender: 'Female',
            bloodGroup: 'A+',
            allergy: 'Sulfa Drugs',
            society: 'Gokuldham Society',
            area: 'NAVRANGPURA',
            phone: '9876543211',
            due: 0,
            visits: [
              {
                caseId: '00012026000202',
                visitNum: 1,
                date: todayISO(),
                time: '10:15 AM',
                weight: '58',
                bp: '118/78',
                pulse: '72',
                reference: 'Self',
                diagnosis: 'Acute Upper Respiratory Tract Infection (URTI)',
                complaint: 'Severe sore throat, dry painful cough and mild fever',
                investigation: '',
                treatment: [{ name: 'Consultation & Throat Examination', qty: '1', cost: 500 }],
                prescription: [
                  { name: 'Amoxicillin 500mg', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF', notes: '' },
                  { name: 'Cetirizine 10mg', qty: '5', mor: '0', noon: '0', eve: '1', ngt: '0', timing: 'AF', notes: 'At bedtime' },
                ],
                dietary: 'LQ: Light diet only. Warm water gargles.',
                charge: 500,
                received: 500,
                due: 0,
              },
            ],
          },
          '00020003': {
            id: '00020003',
            patId: '00020003',
            familyId: '000120260002',
            name: 'SHARMA RAHUL AMITBHAI',
            relation: 'Son',
            age: '22',
            gender: 'Male',
            bloodGroup: 'O+',
            allergy: 'None',
            society: 'Gokuldham Society',
            area: 'NAVRANGPURA',
            phone: '9876543211',
            due: 0,
            visits: [],
          },
        },
      },
      '000120260003': {
        id: '000120260003',
        famId: '000120260003',
        headName: 'DESAI BHUPENDRABHAI KANTILAL',
        society: 'Surya Kiran Heights',
        registeredBy: 'Self',
        area: 'SATELLITE',
        phone: '9876543212',
        year: 2026,
        sequence: 3,
        patients: {
          '00030001': {
            id: '00030001',
            patId: '00030001',
            familyId: '000120260003',
            name: 'DESAI BHUPENDRABHAI KANTILAL',
            relation: 'Head',
            age: '52',
            gender: 'Male',
            bloodGroup: 'B+',
            allergy: 'None',
            society: 'Surya Kiran Heights',
            area: 'SATELLITE',
            phone: '9876543212',
            due: 0,
            visits: [
              {
                caseId: '00012026000301',
                visitNum: 1,
                date: todayISO(),
                time: '11:00 AM',
                weight: '76',
                bp: '135/88',
                reference: 'Self',
                diagnosis: 'Lumbar Spondylosis with Sciatica',
                complaint: 'Chronic lower back pain radiating to left leg',
                treatment: [{ name: 'Physiotherapy & Spine Consultation', qty: '1', cost: 550 }],
                charge: 550,
                received: 550,
                due: 0,
              },
            ],
          },
          '00030002': {
            id: '00030002',
            patId: '00030002',
            familyId: '000120260003',
            name: 'DESAI MINABEN BHUPENDRABHAI',
            relation: 'Wife',
            age: '49',
            gender: 'Female',
            bloodGroup: 'O+',
            allergy: 'None',
            society: 'Surya Kiran Heights',
            area: 'SATELLITE',
            phone: '9876543212',
            due: 400,
            visits: [
              {
                caseId: '00012026000302',
                visitNum: 1,
                date: '2026-10-18',
                time: '05:00 PM',
                weight: '64',
                bp: '125/82',
                reference: 'Self',
                diagnosis: 'Osteoarthritis Knees',
                complaint: 'Bilateral knee pain during walking',
                charge: 500,
                received: 100,
                due: 400,
              },
            ],
          },
          '00030003': {
            id: '00030003',
            patId: '00030003',
            familyId: '000120260003',
            name: 'DESAI JAY BHUPENDRABHAI',
            relation: 'Son',
            age: '25',
            gender: 'Male',
            bloodGroup: 'B+',
            allergy: 'None',
            society: 'Surya Kiran Heights',
            area: 'SATELLITE',
            phone: '9876543212',
            due: 0,
            visits: [],
          },
        },
      },
      '000120260004': {
        id: '000120260004',
        famId: '000120260004',
        headName: 'SHAH JIGNESHBHAI PRAVINCHANDRA',
        society: 'Radhe Krishna Bunglows',
        registeredBy: 'Self',
        area: 'BOPAL',
        phone: '9876543213',
        year: 2026,
        sequence: 4,
        patients: {
          '00040001': {
            id: '00040001',
            patId: '00040001',
            familyId: '000120260004',
            name: 'SHAH JIGNESHBHAI PRAVINCHANDRA',
            relation: 'Head',
            age: '39',
            gender: 'Male',
            bloodGroup: 'O+',
            allergy: 'None',
            society: 'Radhe Krishna Bunglows',
            area: 'BOPAL',
            phone: '9876543213',
            due: 0,
            visits: [
              {
                caseId: '00012026000401',
                visitNum: 1,
                date: todayISO(),
                time: '11:45 AM',
                weight: '72',
                bp: '122/80',
                reference: 'Self',
                diagnosis: 'Gastroesophageal Reflux Disease (GERD)',
                complaint: 'Acid regurgitation, burning epigastric pain',
                treatment: [{ name: 'Gastroenterology Consultation', qty: '1', cost: 450 }],
                charge: 450,
                received: 450,
                due: 0,
              },
            ],
          },
          '00040002': {
            id: '00040002',
            patId: '00040002',
            familyId: '000120260004',
            name: 'SHAH BHAVIKABEN JIGNESHBHAI',
            relation: 'Wife',
            age: '36',
            gender: 'Female',
            bloodGroup: 'A+',
            allergy: 'None',
            society: 'Radhe Krishna Bunglows',
            area: 'BOPAL',
            phone: '9876543213',
            due: 350,
            visits: [
              {
                caseId: '00012026000402',
                visitNum: 1,
                date: '2026-10-10',
                time: '06:00 PM',
                weight: '55',
                bp: '115/75',
                reference: 'Self',
                diagnosis: 'Migraine Headache',
                complaint: 'Unilateral pulsating head pain with nausea',
                charge: 500,
                received: 150,
                due: 350,
              },
            ],
          },
          '00040003': {
            id: '00040003',
            patId: '00040003',
            familyId: '000120260004',
            name: 'SHAH HARSH JIGNESHBHAI',
            relation: 'Son',
            age: '12',
            gender: 'Male',
            bloodGroup: 'O+',
            allergy: 'None',
            society: 'Radhe Krishna Bunglows',
            area: 'BOPAL',
            phone: '9876543213',
            due: 0,
            visits: [],
          },
        },
      },
      '000120260005': {
        id: '000120260005',
        famId: '000120260005',
        headName: 'PRAJAPATI MANISHBHAI KANUBHAI',
        society: 'Vrindavan Society',
        registeredBy: 'Self',
        area: 'THALTEJ',
        phone: '9876543214',
        year: 2026,
        sequence: 5,
        patients: {
          '00050001': {
            id: '00050001',
            patId: '00050001',
            familyId: '000120260005',
            name: 'PRAJAPATI MANISHBHAI KANUBHAI',
            relation: 'Head',
            age: '41',
            gender: 'Male',
            bloodGroup: 'B+',
            allergy: 'None',
            society: 'Vrindavan Society',
            area: 'THALTEJ',
            phone: '9876543214',
            due: 250,
            visits: [
              {
                caseId: '00012026000501',
                visitNum: 1,
                date: todayISO(),
                time: '12:30 PM',
                weight: '68',
                bp: '128/84',
                reference: 'Self',
                diagnosis: 'Urinary Tract Infection (UTI)',
                complaint: 'Generalized fatigue, burning urination and mild flank pain',
                treatment: [{ name: 'Clinical Consultation', qty: '1', cost: 600 }],
                charge: 600,
                received: 350,
                due: 250,
              },
            ],
          },
          '00050002': {
            id: '00050002',
            patId: '00050002',
            familyId: '000120260005',
            name: 'PRAJAPATI GEETABEN MANISHBHAI',
            relation: 'Wife',
            age: '38',
            gender: 'Female',
            bloodGroup: 'B+',
            allergy: 'None',
            society: 'Vrindavan Society',
            area: 'THALTEJ',
            phone: '9876543214',
            due: 0,
            visits: [],
          },
        },
      },
      '000120260006': {
        id: '000120260006',
        famId: '000120260006',
        headName: 'MEHTA RAJESHBHAI CHANDRAKANT',
        society: 'Royal Residency',
        registeredBy: 'Self',
        area: 'SCIENCE CITY',
        phone: '9876543215',
        year: 2026,
        sequence: 6,
        patients: {
          '00060001': {
            id: '00060001',
            patId: '00060001',
            familyId: '000120260006',
            name: 'MEHTA RAJESHBHAI CHANDRAKANT',
            relation: 'Head',
            age: '44',
            gender: 'Male',
            bloodGroup: 'O+',
            allergy: 'None',
            society: 'Royal Residency',
            area: 'SCIENCE CITY',
            phone: '9876543215',
            due: 300,
            visits: [
              {
                caseId: '00012026000601',
                visitNum: 1,
                date: todayISO(),
                time: '01:15 PM',
                weight: '78',
                bp: '146/92',
                reference: 'Self',
                diagnosis: 'Essential Hypertension (Stage 1)',
                complaint: 'Intermittent dizziness, headache and elevated BP',
                treatment: [{ name: 'Cardio Consultation & ECG', qty: '1', cost: 600 }],
                charge: 600,
                received: 300,
                due: 300,
              },
            ],
          },
          '00060002': {
            id: '00060002',
            patId: '00060002',
            familyId: '000120260006',
            name: 'MEHTA REKHABEN RAJESHBHAI',
            relation: 'Wife',
            age: '42',
            gender: 'Female',
            bloodGroup: 'A+',
            allergy: 'None',
            society: 'Royal Residency',
            area: 'SCIENCE CITY',
            phone: '9876543215',
            due: 0,
            visits: [],
          },
        },
      },
    },
    certificates: [
      {
        certNo: 'MC-2026-0001',
        patientName: 'PATEL RAMESHBHAI GOVINDBHAI',
        patientAge: '46',
        patientGender: 'Male',
        diagnosis: 'Acute Viral Pyrexia',
        fromDate: todayISO(),
        toDate: todayISO(),
        restDays: 3,
        doctorName: 'Dr. Chirag Paghdal',
        issuedDate: todayISO(),
        place: 'Ahmedabad',
      },
    ],
    bills: [
      { billNo: 'INV-2026-00001', patientId: '00010001', patientName: 'PATEL RAMESHBHAI GOVINDBHAI', billDate: todayISO(), totalCharge: 600, paidAmount: 600, dueAmount: 0, status: 'Paid' },
      { billNo: 'INV-2026-00002', patientId: '00020002', patientName: 'SHARMA PRIYABEN AMITBHAI', billDate: todayISO(), totalCharge: 500, paidAmount: 500, dueAmount: 0, status: 'Paid' },
      { billNo: 'INV-2026-00003', patientId: '00030001', patientName: 'DESAI BHUPENDRABHAI KANTILAL', billDate: todayISO(), totalCharge: 550, paidAmount: 550, dueAmount: 0, status: 'Paid' },
      { billNo: 'INV-2026-00004', patientId: '00040001', patientName: 'SHAH JIGNESHBHAI PRAVINCHANDRA', billDate: todayISO(), totalCharge: 450, paidAmount: 450, dueAmount: 0, status: 'Paid' },
      { billNo: 'INV-2026-00005', patientId: '00050001', patientName: 'PRAJAPATI MANISHBHAI KANUBHAI', billDate: todayISO(), totalCharge: 600, paidAmount: 350, dueAmount: 250, status: 'Partial' },
      { billNo: 'INV-2026-00006', patientId: '00060001', patientName: 'MEHTA RAJESHBHAI CHANDRAKANT', billDate: todayISO(), totalCharge: 600, paidAmount: 300, dueAmount: 300, status: 'Partial' },
      { billNo: 'INV-2026-00007', patientId: '00010002', patientName: 'PATEL SHARDABEN RAMESHBHAI', billDate: '2026-09-29', totalCharge: 500, paidAmount: 200, dueAmount: 300, status: 'Partial' },
      { billNo: 'INV-2026-00008', patientId: '00020001', patientName: 'SHARMA AMITBHAI DINESHBHAI', billDate: '2026-10-15', totalCharge: 500, paidAmount: 0, dueAmount: 500, status: 'Due' },
    ],
    inventory: [
      { id: 'inv_1', itemName: 'Paracetamol 650mg', batchNo: 'B-991', quantity: 240, reorderLevel: 50, unitPrice: 5 },
      { id: 'inv_2', itemName: 'Amoxicillin 500mg', batchNo: 'A-210', quantity: 80, reorderLevel: 30, unitPrice: 12 },
      { id: 'inv_3', itemName: 'Pantoprazole 40mg', batchNo: 'P-112', quantity: 15, reorderLevel: 25, unitPrice: 8 },
    ],
    followUps: [
      { id: 'fup_1', patientId: '00010001', patientName: 'PATEL RAMESHBHAI GOVINDBHAI', followUpDate: todayISO(), reason: 'CBC & Platelet Count Recheck', status: 'Pending' },
      { id: 'fup_2', patientId: '00020002', patientName: 'SHARMA PRIYABEN AMITBHAI', followUpDate: todayISO(), reason: 'Throat swab & fever check', status: 'Pending' },
      { id: 'fup_3', patientId: '00030001', patientName: 'DESAI BHUPENDRABHAI KANTILAL', followUpDate: todayISO(), reason: 'Spine mobility review', status: 'Pending' },
      { id: 'fup_4', patientId: '00050001', patientName: 'PRAJAPATI MANISHBHAI KANUBHAI', followUpDate: todayISO(), reason: 'Urine routine re-check', status: 'Pending' },
      { id: 'fup_5', patientId: '00060001', patientName: 'MEHTA RAJESHBHAI CHANDRAKANT', followUpDate: todayISO(), reason: 'BP chart monitoring', status: 'Pending' },
    ],
    feedback: [],
  };

  saveLocalDB(clinicId, initial);
  return initial;
}

export function saveLocalDB(clinicId = 'demo', data) {
  const key = `clinic_db_${clinicId || 'demo'}`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

/* ---- Shared Master Data Helpers ---- */
const memoryMasterCache = {};

export function getSharedMasterCollection(type) {
  if (memoryMasterCache[type]) return memoryMasterCache[type];

  let defaults = [];
  if (type === 'complaints') defaults = defaultMasterComplaints;
  else if (type === 'investigations') defaults = defaultMasterInvestigations;
  else if (type === 'medicines') defaults = defaultMasterMedicines;
  else if (type === 'allergies') defaults = defaultMasterAllergies;
  else if (type === 'relations') defaults = defaultMasterRelations;
  else if (type === 'areas') defaults = defaultMasterAreas;

  memoryMasterCache[type] = defaults;
  return defaults;
}

export async function fetchMasterCollectionFromDB(type) {
  try {
    const res = await apiFetch(`/masters/${type}`);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      memoryMasterCache[type] = res.data;
      return res.data;
    }
  } catch (err) {
    console.warn(err);
  }
  return getSharedMasterCollection(type);
}

export function addSharedMasterItem(type, item) {
  const list = getSharedMasterCollection(type);
  const exists = list.some((i) => (i.name || '').toLowerCase() === (item.name || '').toLowerCase());
  if (!exists) {
    const newItem = { id: `${type}_${uid()}`, ...item, createdAt: todayISO() };
    list.push(newItem);
    memoryMasterCache[type] = list;
    apiFetch(`/masters/${type}`, {
      method: 'POST',
      body: { items: list },
    }).catch(() => {});
  }
}

export function saveSharedMasterCollection(type, items) {
  memoryMasterCache[type] = items;
  apiFetch(`/masters/${type}`, {
    method: 'POST',
    body: { items },
  }).catch(() => {});
}

/* ---- Offline API Fallback Dispatcher ---- */
function fallbackLocalHandler(endpoint, config) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';
  const db = getLocalDB(clinicId);

  // Fallback for families
  if (endpoint.startsWith('/families') || endpoint.startsWith('/family')) {
    const list = Object.values(db.families || {});
    return { success: true, count: list.length, data: list };
  }

  // Fallback for stats
  if (endpoint.startsWith('/reports/stats') || endpoint.startsWith('/report/stats')) {
    const allPats = [];
    const allVisits = [];
    Object.values(db.families || {}).forEach((f) => {
      Object.values(f.patients || {}).forEach((p) => {
        allPats.push(p);
        (p.visits || []).forEach((v) => allVisits.push({ ...v, famHead: f.headName, famId: f.id, patName: p.name }));
      });
    });

    const targetDate = todayISO();
    const targetVisits = allVisits.filter((v) => v.date === targetDate);
    const dateCollection = targetVisits.reduce((s, v) => s + (Number(v.received) || 0), 0);
    const totalDue = allVisits.reduce((s, v) => s + (Number(v.due) || 0), 0);

    return {
      success: true,
      data: {
        totalFamilies: Object.keys(db.families || {}).length,
        totalPatients: allPats.length,
        visitsCount: targetVisits.length,
        dateCollection,
        totalDue,
        drCounts: { Self: allVisits.length },
        diagCounts: {},
        areaCounts: {},
      },
    };
  }

  // Fallback for certificates
  if (endpoint.startsWith('/certificates') || endpoint.startsWith('/certificate')) {
    return { success: true, count: (db.certificates || []).length, data: db.certificates || [] };
  }

  // Fallback for inventory
  if (endpoint.startsWith('/inventory')) {
    return { success: true, count: (db.inventory || []).length, data: db.inventory || [] };
  }

  // Fallback for followups
  if (endpoint.startsWith('/followups') || endpoint.startsWith('/followup')) {
    return { success: true, count: (db.followUps || []).length, data: db.followUps || [] };
  }

  // Fallback for billing
  if (endpoint.startsWith('/billing') || endpoint.startsWith('/bills')) {
    return { success: true, count: (db.bills || []).length, data: db.bills || [] };
  }

  // Fallback for feedback
  if (endpoint.startsWith('/feedback') || endpoint.startsWith('/support')) {
    return { success: true, count: (db.feedback || []).length, data: db.feedback || [] };
  }

  return { success: true, data: [] };
}
