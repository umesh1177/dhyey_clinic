/**
 * =========================================================
 * CLINIC API CLIENT & DATA ADAPTER
 * Unified native fetch() API wrapper with offline fallback
 * =========================================================
 */

const API_BASE_URL = window.location.origin.includes('5000')
  ? ''
  : window.location.port === '' || window.location.port === '80'
  ? ''
  : 'http://localhost:5000';

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
  return `${prefix}${y}${s}`; // 4 digit clinic + 4 digit year + 4 digit sequence (e.g. 000120260001)
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
    console.warn(`[API Network fallback for ${endpoint}]:`, err.message);
    return fallbackLocalHandler(endpoint, config);
  }
}

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
  { id: 'inv11', name: 'USG Whole Abdomen & Pelvis', category: 'Radiology', sampleType: 'Sonography', description: 'Liver, gallbladder, kidneys, spleen, bladder ultrasound', createdAt: '2026-01-01' },
  { id: 'inv12', name: 'Widal Test / Typhoid Serology', category: 'Serology', sampleType: 'Serum', description: 'Typhoid fever antibody slide agglutination', createdAt: '2026-01-01' },
  { id: 'inv13', name: 'Dengue NS1 Antigen & IgM/IgG', category: 'Serology', sampleType: 'Serum', description: 'Rapid antigen/antibody test for Dengue fever', createdAt: '2026-01-01' },
  { id: 'inv14', name: 'Vitamin D3 & B12 Levels', category: 'Immunoassay', sampleType: 'Serum', description: '25-OH Vitamin D and Cyanocobalamin evaluation', createdAt: '2026-01-01' },
];

export const defaultMasterMedicines = [
  { id: 'm1', name: 'Paracetamol 650mg (Dolo 650 / Calpol)', category: 'Antipyretic / Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 5, createdAt: '2026-01-01' },
  { id: 'm2', name: 'Paracetamol 500mg (Crocin)', category: 'Antipyretic / Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 4, createdAt: '2026-01-01' },
  { id: 'm3', name: 'Ibuprofen 400mg (Brufen)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 6, createdAt: '2026-01-01' },
  { id: 'm4', name: 'Combiflam (Ibuprofen + Paracetamol)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 7, createdAt: '2026-01-01' },
  { id: 'm5', name: 'Zerodol-P (Aceclofenac 100mg + Paracetamol 325mg)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 9, createdAt: '2026-01-01' },
  { id: 'm6', name: 'Zerodol-SP (Aceclo + Paracetamol + Serratiopeptidase)', category: 'Anti-inflammatory / Pain', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 14, createdAt: '2026-01-01' },
  { id: 'm7', name: 'Voveran 50mg (Diclofenac Sodium)', category: 'NSAID / Joint Pain', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 8, createdAt: '2026-01-01' },
  { id: 'm8', name: 'Meftal-Spas (Mefenamic Acid + Dicyclomine)', category: 'Antispasmodic / Cramps', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 8, createdAt: '2026-01-01' },
  { id: 'm9', name: 'Cyclopam (Dicyclomine + Paracetamol)', category: 'Antispasmodic / Abdominal Pain', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 7, createdAt: '2026-01-01' },
  { id: 'm10', name: 'Drotin-M (Drotaverine 80mg + Mefenamic Acid 250mg)', category: 'Antispasmodic / Colic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 12, createdAt: '2026-01-01' },
  { id: 'm11', name: 'Tramadol 50mg + Paracetamol (Ultracet)', category: 'Severe Pain / Opioid Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 18, createdAt: '2026-01-01' },
  { id: 'm12', name: 'Amoxicillin 500mg (Novamox 500)', category: 'Antibiotic (Penicillin)', form: 'Capsule', defaultDosage: '1-0-1 AF', unitPrice: 12, createdAt: '2026-01-01' },
  { id: 'm13', name: 'Augmentin 625 (Amoxyclav 625 Duo)', category: 'Broad Spectrum Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 22, createdAt: '2026-01-01' },
  { id: 'm14', name: 'Azithromycin 500mg (Azithral 500)', category: 'Macrolide Antibiotic (RTI)', form: 'Tablet', defaultDosage: '1-0-0 OD', unitPrice: 20, createdAt: '2026-01-01' },
  { id: 'm15', name: 'Azithromycin 250mg (Azithral 250)', category: 'Macrolide Antibiotic', form: 'Tablet', defaultDosage: '1-0-0 OD', unitPrice: 12, createdAt: '2026-01-01' },
  { id: 'm16', name: 'Cefixime 200mg (Taxim-O 200 / Zifi 200)', category: 'Cephalosporin Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 16, createdAt: '2026-01-01' },
  { id: 'm17', name: 'Cefuroxime Axetil 500mg (Ceftum 500)', category: 'Cephalosporin Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 38, createdAt: '2026-01-01' },
  { id: 'm18', name: 'Ciprofloxacin 500mg (Ciplox 500)', category: 'Fluoroquinolone Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 10, createdAt: '2026-01-01' },
  { id: 'm19', name: 'Ofloxacin 200mg (Oflox 200)', category: 'Fluoroquinolone Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 11, createdAt: '2026-01-01' },
  { id: 'm20', name: 'Norfloxacin + Tinidazole (Norflox-TZ)', category: 'Gastrointestinal Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 12, createdAt: '2026-01-01' },
  { id: 'm21', name: 'Ofloxacin + Ornidazole (O2 / Zenflox-OZ)', category: 'GI Infection / Diarrhea', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 15, createdAt: '2026-01-01' },
  { id: 'm22', name: 'Metronidazole 400mg (Metrogyl 400)', category: 'Antiprotozoal / Amoebiasis', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 6, createdAt: '2026-01-01' },
  { id: 'm23', name: 'Levofloxacin 500mg (Levomac 500)', category: 'Respiratory Antibiotic', form: 'Tablet', defaultDosage: '1-0-0 OD', unitPrice: 16, createdAt: '2026-01-01' },
  { id: 'm24', name: 'Doxycycline 100mg (Doxicip 100)', category: 'Tetracycline Antibiotic', form: 'Capsule', defaultDosage: '1-0-1 AF', unitPrice: 9, createdAt: '2026-01-01' },
  { id: 'm25', name: 'Pantoprazole 40mg (Pan 40 / Pantocid)', category: 'Antacid / PPI', form: 'Tablet', defaultDosage: '1-0-0 BF', unitPrice: 8, createdAt: '2026-01-01' },
  { id: 'm26', name: 'Pantoprazole + Domperidone (Pan-D / Pantop-D)', category: 'Antacid / PPI + Prokinetic', form: 'Capsule', defaultDosage: '1-0-0 BF', unitPrice: 14, createdAt: '2026-01-01' },
  { id: 'm27', name: 'Rabeprazole 20mg (Razo 20 / Happi 20)', category: 'Antacid / PPI', form: 'Tablet', defaultDosage: '1-0-0 BF', unitPrice: 9, createdAt: '2026-01-01' },
  { id: 'm28', name: 'Rabeprazole + Domperidone (Rablet-D / Rabekind-D)', category: 'Antacid / PPI + Prokinetic', form: 'Capsule', defaultDosage: '1-0-0 BF', unitPrice: 15, createdAt: '2026-01-01' },
  { id: 'm29', name: 'Omeprazole 20mg (Ocid 20 / Omez)', category: 'Antacid / PPI', form: 'Capsule', defaultDosage: '1-0-0 BF', unitPrice: 7, createdAt: '2026-01-01' },
  { id: 'm30', name: 'Omeprazole + Domperidone (Omez-D)', category: 'Antacid / PPI + Prokinetic', form: 'Capsule', defaultDosage: '1-0-0 BF', unitPrice: 12, createdAt: '2026-01-01' },
  { id: 'm31', name: 'Esomeprazole 40mg (Nexpro 40)', category: 'Antacid / PPI', form: 'Tablet', defaultDosage: '1-0-0 BF', unitPrice: 11, createdAt: '2026-01-01' },
  { id: 'm32', name: 'Ranitidine 150mg (Rantac 150 / Aciloc 150)', category: 'H2 Blocker / Acidity', form: 'Tablet', defaultDosage: '1-0-1 BF', unitPrice: 4, createdAt: '2026-01-01' },
  { id: 'm33', name: 'Ondansetron 4mg (Ondem 4 / Emeset)', category: 'Antiemetic / Nausea & Vomiting', form: 'Tablet', defaultDosage: '1-0-1 BF', unitPrice: 7, createdAt: '2026-01-01' },
  { id: 'm34', name: 'Domperidone 10mg (Domstal / Vomistop)', category: 'Antiemetic / Prokinetic', form: 'Tablet', defaultDosage: '1-0-1 BF', unitPrice: 5, createdAt: '2026-01-01' },
  { id: 'm35', name: 'Cetirizine 10mg (Cetzine / Alerid)', category: 'Antihistamine / Allergy', form: 'Tablet', defaultDosage: '0-0-1 HS', unitPrice: 4, createdAt: '2026-01-01' },
  { id: 'm36', name: 'Levocetirizine 5mg (Levocet / 1-AL)', category: 'Antihistamine / Allergy', form: 'Tablet', defaultDosage: '0-0-1 HS', unitPrice: 6, createdAt: '2026-01-01' },
  { id: 'm37', name: 'Montair-LC (Levocetirizine 5mg + Montelukast 10mg)', category: 'Allergic Rhinitis / Asthma', form: 'Tablet', defaultDosage: '0-0-1 HS', unitPrice: 16, createdAt: '2026-01-01' },
  { id: 'm38', name: 'Allegra 120mg (Fexofenadine)', category: 'Non-sedating Antihistamine', form: 'Tablet', defaultDosage: '1-0-0 OD', unitPrice: 18, createdAt: '2026-01-01' },
  { id: 'm39', name: 'Sinarest (Paracetamol + Phenylephrine + CPM)', category: 'Cold, Sinus & Fever', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 6, createdAt: '2026-01-01' },
  { id: 'm40', name: 'Ascoril-LS Syrup (Levosalbutamol + Ambroxol + Guaiphenesin)', category: 'Wet Cough / Expectorant', form: 'Syrup', defaultDosage: '2 Tsp TDS', unitPrice: 110, createdAt: '2026-01-01' },
  { id: 'm41', name: 'Telmisartan 40mg (Telma 40 / Telpres 40)', category: 'Antihypertensive (ARB)', form: 'Tablet', defaultDosage: '1-0-0 OD', unitPrice: 10, createdAt: '2026-01-01' },
  { id: 'm42', name: 'Amlodipine 5mg (Amlong 5 / Stamlo 5)', category: 'Calcium Channel Blocker', form: 'Tablet', defaultDosage: '1-0-0 OD', unitPrice: 5, createdAt: '2026-01-01' },
  { id: 'm43', name: 'Atorvastatin 10mg / 20mg (Atorva 10 / Storvas)', category: 'Statin / Cholesterol', form: 'Tablet', defaultDosage: '0-0-1 HS', unitPrice: 14, createdAt: '2026-01-01' },
  { id: 'm44', name: 'Metformin 500mg (Glycomet 500)', category: 'Antidiabetic (Biguanide)', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 4, createdAt: '2026-01-01' },
  { id: 'm45', name: 'Becosules (Vitamin B-Complex + Vitamin C)', category: 'Multivitamin / Mouth Ulcers', form: 'Capsule', defaultDosage: '1-0-0 AF', unitPrice: 5, createdAt: '2026-01-01' },
  { id: 'm46', name: 'Shelcal 500 (Calcium 500mg + Vitamin D3 250IU)', category: 'Calcium Supplement / Bone', form: 'Tablet', defaultDosage: '0-1-0 AF', unitPrice: 9, createdAt: '2026-01-01' },
  { id: 'm47', name: 'Calcirol Sachet 60,000 IU (Cholecalciferol D3)', category: 'Vitamin D3 Deficiency', form: 'Sachet', defaultDosage: '1 Sachet Weekly', unitPrice: 40, createdAt: '2026-01-01' },
];

export const defaultMasterAllergies = [
  { id: 'al1', name: 'None', category: 'General', severity: 'None', createdAt: '2026-01-01' },
  { id: 'al2', name: 'Penicillin', category: 'Drug Allergy', severity: 'Severe', createdAt: '2026-01-01' },
  { id: 'al3', name: 'Sulfa Drugs', category: 'Drug Allergy', severity: 'Moderate', createdAt: '2026-01-01' },
  { id: 'al4', name: 'Aspirin / NSAIDs', category: 'Drug Allergy', severity: 'Moderate', createdAt: '2026-01-01' },
  { id: 'al5', name: 'Dust / Pollen', category: 'Environmental', severity: 'Mild', createdAt: '2026-01-01' },
  { id: 'al6', name: 'Peanuts / Nuts', category: 'Food Allergy', severity: 'Severe', createdAt: '2026-01-01' },
  { id: 'al7', name: 'Latex', category: 'Contact Allergy', severity: 'Mild', createdAt: '2026-01-01' },
  { id: 'al8', name: 'Ciprofloxacin', category: 'Drug Allergy', severity: 'Moderate', createdAt: '2026-01-01' },
  { id: 'al9', name: 'Amoxicillin', category: 'Drug Allergy', severity: 'Moderate', createdAt: '2026-01-01' },
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
  { id: 'r10', name: 'Grandfather', category: 'Grandparent', description: 'Grandfather of Head', createdAt: '2026-01-01' },
  { id: 'r11', name: 'Grandmother', category: 'Grandparent', description: 'Grandmother of Head', createdAt: '2026-01-01' },
  { id: 'r12', name: 'Daughter-in-Law', category: 'In-Law', description: 'Daughter-in-Law of Head', createdAt: '2026-01-01' },
  { id: 'r13', name: 'Son-in-Law', category: 'In-Law', description: 'Son-in-Law of Head', createdAt: '2026-01-01' },
  { id: 'r14', name: 'Other', category: 'Other', description: 'Other Relation', createdAt: '2026-01-01' },
];

export const defaultMasterAreas = [
  { id: 'a1', name: 'Main Road', city: 'Ahmedabad', pincode: '380001', createdAt: '2026-01-01' },
  { id: 'a2', name: 'Vastrapur', city: 'Ahmedabad', pincode: '380015', createdAt: '2026-01-01' },
  { id: 'a3', name: 'Satellite', city: 'Ahmedabad', pincode: '380015', createdAt: '2026-01-01' },
  { id: 'a4', name: 'Navrangpura', city: 'Ahmedabad', pincode: '380009', createdAt: '2026-01-01' },
  { id: 'a5', name: 'Bopal', city: 'Ahmedabad', pincode: '380058', createdAt: '2026-01-01' },
  { id: 'a6', name: 'Thaltej', city: 'Ahmedabad', pincode: '380059', createdAt: '2026-01-01' },
  { id: 'a7', name: 'Gota', city: 'Ahmedabad', pincode: '382481', createdAt: '2026-01-01' },
  { id: 'a8', name: 'Maninagar', city: 'Ahmedabad', pincode: '380008', createdAt: '2026-01-01' },
  { id: 'a9', name: 'Paldi', city: 'Ahmedabad', pincode: '380007', createdAt: '2026-01-01' },
  { id: 'a10', name: 'Science City', city: 'Ahmedabad', pincode: '380060', createdAt: '2026-01-01' },
  { id: 'a11', name: 'Varachha', city: 'Surat', pincode: '395006', createdAt: '2026-01-01' },
  { id: 'a12', name: 'Adajan', city: 'Surat', pincode: '395009', createdAt: '2026-01-01' },
];

export const defaultMasterSocieties = [
  { id: 's1', name: 'Central Society', area: 'Main Road', createdAt: '2026-01-01' },
  { id: 's2', name: 'Shanti Niketan Apt', area: 'Vastrapur', createdAt: '2026-01-01' },
  { id: 's3', name: 'Gokuldham Society', area: 'Satellite', createdAt: '2026-01-01' },
  { id: 's4', name: 'Surya Kiran Heights', area: 'Satellite', createdAt: '2026-01-01' },
  { id: 's5', name: 'Radhe Krishna Bunglows', area: 'Bopal', createdAt: '2026-01-01' },
  { id: 's6', name: 'Vrindavan Society', area: 'Thaltej', createdAt: '2026-01-01' },
  { id: 's7', name: 'Royal Residency', area: 'Gota', createdAt: '2026-01-01' },
  { id: 's8', name: 'Shivam Heights', area: 'Maninagar', createdAt: '2026-01-01' },
  { id: 's9', name: 'Silver Crest', area: 'Science City', createdAt: '2026-01-01' },
];

/**
 * Shared Master Data System:
 * A single shared master collection for clinical entities across all clinics.
 * Note: Shortcuts are strictly clinic-specific and are never stored in the shared master collection!
 */
function sanitizeSharedList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(item => {
    if (!item || typeof item !== 'object') return item;
    const { code, ...rest } = item;
    return rest;
  });
}

function sanitizeSharedItem(item) {
  if (!item || typeof item !== 'object') return item;
  const { code, ...rest } = item;
  return rest;
}

// In-memory master collection storage backed by MongoDB
const _sharedMasterMemoryStore = {};
let _mastersSyncInitiated = false;

export function initSharedMastersFromMongoDB() {
  if (_mastersSyncInitiated) return;
  _mastersSyncInitiated = true;
  apiFetch('/masters/all')
    .then(res => {
      if (res && res.data && typeof res.data === 'object') {
        Object.entries(res.data).forEach(([t, items]) => {
          if (Array.isArray(items) && items.length > 0) {
            _sharedMasterMemoryStore[t] = sanitizeSharedList(items);
          }
        });
      }
    })
    .catch(() => {});
}
// Trigger async sync on load
setTimeout(initSharedMastersFromMongoDB, 50);

export function getSharedMasterCollection(type) {
  if (_sharedMasterMemoryStore[type] && _sharedMasterMemoryStore[type].length > 0) {
    return _sharedMasterMemoryStore[type];
  }
  let defaultList = [];
  if (type === 'medicines') defaultList = defaultMasterMedicines;
  else if (type === 'complaints') defaultList = defaultMasterComplaints;
  else if (type === 'investigations') defaultList = defaultMasterInvestigations;
  else if (type === 'allergies') defaultList = defaultMasterAllergies;
  else if (type === 'relations') defaultList = defaultMasterRelations;
  else if (type === 'areas') defaultList = defaultMasterAreas;
  else if (type === 'societies') defaultList = defaultMasterSocieties;

  _sharedMasterMemoryStore[type] = sanitizeSharedList(defaultList);
  return _sharedMasterMemoryStore[type];
}

export function saveSharedMasterCollection(type, list) {
  const cleanList = sanitizeSharedList(list);
  _sharedMasterMemoryStore[type] = cleanList;
  // Persist directly to MongoDB
  apiFetch(`/masters/${type}`, {
    method: 'POST',
    body: { items: cleanList }
  }).catch(err => {
    console.warn(`[Masters MongoDB Sync Notice] (${type}):`, err.message);
  });
}

export function addSharedMasterItem(type, item, currentDb = null) {
  const cleanItem = sanitizeSharedItem(item);
  const list = getSharedMasterCollection(type);
  const exists = list.some(existing => (existing.name && cleanItem.name && existing.name.toLowerCase() === cleanItem.name.toLowerCase()) || (existing.id && existing.id === cleanItem.id));

  if (!exists) {
    list.unshift(cleanItem);
    saveSharedMasterCollection(type, list);

    // Auto-assign '-' shortcut if applicable
    const shortcutKeys = ['complaints', 'investigations', 'medicines', 'allergies', 'relations'];
    if (shortcutKeys.includes(type) && currentDb) {
      if (!currentDb.clinicShortcuts) currentDb.clinicShortcuts = {};
      if (!currentDb.clinicShortcuts[type]) currentDb.clinicShortcuts[type] = {};
      if (cleanItem.name && !currentDb.clinicShortcuts[type][cleanItem.name]) {
        currentDb.clinicShortcuts[type][cleanItem.name] = '-';
        const session = getAuthSession();
        const activeId = session?.profile?.activeClinicId || 'demo';
        saveLocalDB(currentDb, activeId);
      }
    }
  }
  return list;
}

export function updateSharedMasterItem(type, updatedItem) {
  const cleanItem = sanitizeSharedItem(updatedItem);
  const list = getSharedMasterCollection(type);
  const idx = list.findIndex(item => (cleanItem.id && item.id === cleanItem.id) || (cleanItem.name && item.name && item.name.toLowerCase() === cleanItem.name.toLowerCase()));
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...cleanItem };
    saveSharedMasterCollection(type, list);
  } else {
    list.unshift(cleanItem);
    saveSharedMasterCollection(type, list);
  }
  return list;
}

export function deleteSharedMasterItem(type, filterFn) {
  const list = getSharedMasterCollection(type);
  const updated = list.filter(item => filterFn(item));
  saveSharedMasterCollection(type, updated);
  return updated;
}


export const defaultCertificateTemplates = [
  {
    id: 'tpl-1',
    templateName: 'Medical Fitness Certificate',
    title: 'MEDICAL FITNESS CERTIFICATE',
    body: 'This is to certify that {PATIENT_NAME}, aged {AGE}, has been examined by me. The patient has clinically recovered from {DIAGNOSIS} and is now found medically fit in all respects to resume normal daily duties.',
    category: 'Fitness',
    isDefault: true,
  },
  {
    id: 'tpl-2',
    templateName: 'Medical Leave & Sickness Certificate',
    title: 'MEDICAL SICKNESS & LEAVE CERTIFICATE',
    body: 'This is to certify that {PATIENT_NAME}, aged {AGE}, is suffering from {DIAGNOSIS} and has been under my medical care. The patient is advised complete bed rest and absence from work/studies from {FROM_DATE} to {TO_DATE} ({REST_DAYS} days) for proper recovery.',
    category: 'Leave',
    isDefault: true,
  },
  {
    id: 'tpl-3',
    templateName: 'Medical Examination & Treatment Certificate',
    title: 'CERTIFICATE OF MEDICAL EXAMINATION',
    body: 'This is to certify that {PATIENT_NAME} was medically examined and provided treatment for {DIAGNOSIS} on {TODAY_DATE} at this clinic. The patient has been given necessary medications and medical advice.',
    category: 'General',
    isDefault: true,
  },
  {
    id: 'tpl-4',
    templateName: 'Light Duty / Work Exemption Certificate',
    title: 'MEDICAL EXEMPTION / LIGHT WORK CERTIFICATE',
    body: 'This is to certify that {PATIENT_NAME} is undergoing medical management for {DIAGNOSIS}. The patient is advised to avoid heavy physical exertion, lifting, or prolonged standing from {FROM_DATE} to {TO_DATE}, and is recommended only light duties.',
    category: 'Exemption',
    isDefault: true,
  },
];

export const defaultFeedbacks = [
  {
    id: 'tkt-1',
    ticketNo: 'TKT-2026-0001',
    doctorId: 'demo',
    doctorName: 'Dr. Chirag Paghdal',
    clinicId: 'demo',
    clinicName: 'Dhyey Clinic & Hospital',
    category: 'clinic_request',
    categoryLabel: 'New Clinic Registration Request',
    priority: 'High',
    subject: 'Request for New Branch Registration: Dhyey Wellness Centre - Satellite',
    message: 'Respected Admin, We are inaugurating our new OPD branch in Satellite area from next Monday. Kindly register and enable this new branch under our doctor account so we can seamlessly switch between Vastrapur and Satellite clinics for consultations.',
    metaDetails: {
      requestedClinicName: 'Dhyey Wellness Centre - Satellite',
      clinicCity: 'Ahmedabad',
      clinicAddress: 'FF-204, Surya Kiran Complex, Near Iscon Cross Roads, Satellite',
      clinicPhone: '+91 98765 43210',
      speciality: 'Family Medicine, Diabetes & Lifestyle Care',
      clinicApproved: true,
    },
    status: 'Resolved',
    replies: [
      {
        senderRole: 'admin',
        senderName: 'System Administrator (Admin)',
        message: 'Dear Dr. Chirag, congratulations on your new branch! We have successfully approved and registered "Dhyey Wellness Centre - Satellite" to your account. You can now select it from the top profile dropdown.',
        createdAt: '2026-09-30T11:45:00.000Z',
      },
    ],
    createdAt: '2026-09-30T09:15:00.000Z',
    lastReplyAt: '2026-09-30T11:45:00.000Z',
  },
  {
    id: 'tkt-2',
    ticketNo: 'TKT-2026-0002',
    doctorId: 'demo',
    doctorName: 'Dr. Chirag Paghdal',
    clinicId: 'demo',
    clinicName: 'Dhyey Clinic & Hospital',
    category: 'feature_request',
    categoryLabel: 'Feature Request / Enhancement',
    priority: 'Normal',
    subject: 'Feature Request: Direct WhatsApp Prescription Sharing with Patient',
    message: 'It would be extremely helpful if we can have a 1-click WhatsApp share button on the prescription print screen to instantly send digital prescription summary to the patient’s registered mobile number.',
    metaDetails: {
      targetModule: 'Prescription & Billing',
      expectedBenefit: 'Saves paper printing time and allows patients to store digital Rx on their smartphones.',
    },
    status: 'In Progress',
    replies: [
      {
        senderRole: 'admin',
        senderName: 'Technical Support Team',
        message: 'Hello Doctor, thanks for this excellent suggestion! Our development team has queued the WhatsApp API gateway integration for the upcoming sprint update.',
        createdAt: '2026-10-01T14:20:00.000Z',
      },
    ],
    createdAt: '2026-10-01T10:00:00.000Z',
    lastReplyAt: '2026-10-01T14:20:00.000Z',
  },
  {
    id: 'tkt-3',
    ticketNo: 'TKT-2026-0003',
    doctorId: 'demo',
    doctorName: 'Dr. Chirag Paghdal',
    clinicId: 'demo',
    clinicName: 'Dhyey Clinic & Hospital',
    category: 'bug_report',
    categoryLabel: 'Technical Issue / Bug Report',
    priority: 'Low',
    subject: 'Thermal printer 80mm margin alignment query',
    message: 'When printing bills on 3-inch roll receipt printers, the rightmost rupees symbol sometimes clips slightly on edge browsers. Kindly check if print CSS padding can be fine-tuned.',
    metaDetails: {
      affectedModule: 'Billing & Receipt Print',
      deviceInfo: 'Windows 11 / Chrome 120 / TVS RP-3200 Printer',
    },
    status: 'Pending',
    replies: [],
    createdAt: '2026-10-01T16:30:00.000Z',
    lastReplyAt: null,
  },
];

/* ---- In-Memory Clinic Store Backed by MongoDB API ---- */
const _clinicMemoryStores = {};
const _clinicSyncStatus = {};

export async function syncClinicFromMongoDB(clinicId = 'demo') {
  const cleanId = String(clinicId || 'demo').trim();
  if (_clinicSyncStatus[cleanId]) return;
  _clinicSyncStatus[cleanId] = true;

  try {
    const [famRes, certRes, tplRes, billRes, feedRes, masterRes] = await Promise.all([
      apiFetch('/families').catch(() => null),
      apiFetch('/certificates').catch(() => null),
      apiFetch('/certificates/templates').catch(() => null),
      apiFetch('/bills').catch(() => null),
      apiFetch('/feedback').catch(() => null),
      apiFetch('/masters/all').catch(() => null),
    ]);

    const db = _clinicMemoryStores[cleanId] || getLocalDB(cleanId);

    if (famRes && famRes.data && Array.isArray(famRes.data)) {
      db.families = {};
      famRes.data.forEach(f => {
        const fid = f.famId || f.id;
        db.families[fid] = f;
      });
      db.counters.family = Math.max(db.counters.family || 0, famRes.data.length);
    }

    if (certRes && certRes.data && Array.isArray(certRes.data)) {
      db.certificates = certRes.data;
    }

    if (tplRes && tplRes.data && Array.isArray(tplRes.data) && tplRes.data.length > 0) {
      db.certificateTemplates = tplRes.data;
    }

    if (billRes && billRes.data && Array.isArray(billRes.data)) {
      db.bills = billRes.data;
    }

    if (feedRes && feedRes.data && Array.isArray(feedRes.data)) {
      db.feedbacks = feedRes.data;
    }

    if (masterRes && masterRes.data && typeof masterRes.data === 'object') {
      if (masterRes.data.medicines) db.masterMedicines = masterRes.data.medicines;
      if (masterRes.data.complaints) db.masterComplaints = masterRes.data.complaints;
      if (masterRes.data.investigations) db.masterInvestigations = masterRes.data.investigations;
      if (masterRes.data.allergies) db.masterAllergies = masterRes.data.allergies;
      if (masterRes.data.relations) db.masterRelations = masterRes.data.relations;
      if (masterRes.data.areas) db.masterAreas = masterRes.data.areas;
      if (masterRes.data.societies) db.masterSocieties = masterRes.data.societies;
      if (masterRes.data.customShortcuts) db.customShortcuts = masterRes.data.customShortcuts;
      if (masterRes.data.clinicShortcuts) db.clinicShortcuts = masterRes.data.clinicShortcuts;
    }

    _clinicMemoryStores[cleanId] = db;
  } catch (err) {
    console.warn(`[MongoDB Sync Notice for ${cleanId}]:`, err.message);
  } finally {
    _clinicSyncStatus[cleanId] = false;
  }
}

export function getLocalDB(clinicId = 'demo') {
  const cleanId = String(clinicId || 'demo').trim();
  let db = _clinicMemoryStores[cleanId];

  if (!db) {
    if (cleanId === 'demo') {
      db = seedLocalDatabase();
    } else {
      db = {
        counters: { family: 0, patient: 0, visit: 0 },
        families: {},
        certificates: [],
        certificateTemplates: [...defaultCertificateTemplates],
        bills: [],
        feedbacks: [],
        dietary: {},
        clinicShortcuts: {
          medicines: {},
          complaints: {},
          investigations: {},
          allergies: {},
          relations: {},
          areas: {},
          societies: {},
        },
        _shortcutsCleanedV2: true,
        masterMedicines: [],
        masterComplaints: [],
        masterInvestigations: [],
        masterAreas: [],
        masterSocieties: [],
        masterAllergies: [],
        masterRelations: [],
        customShortcuts: [
          { id: 'sc1', key: 'F1', target: 'family', title: 'Family Head Registration', category: 'Navigation' },
          { id: 'sc2', key: 'F2', target: 'patient', title: 'Add Family Member', category: 'Navigation' },
          { id: 'sc3', key: 'F3', target: 'case', title: 'Patient Record & Case', category: 'Navigation' },
          { id: 'sc4', key: 'F4', target: 'dashboard', title: 'Clinical Dashboard', category: 'Navigation' },
          { id: 'sc5', key: 'F5', target: 'reports', title: 'Clinical Reports', category: 'Navigation' },
          { id: 'sc6', key: 'F6', target: 'certificates', title: 'Medical Certificate', category: 'Navigation' },
          { id: 'sc7', key: 'F7', target: 'masters', title: 'Master Data Setup', category: 'Navigation' },
          { id: 'sc8', key: 'F8', target: 'feedback', title: 'Send Complaint / Feedback', category: 'Support' },
          { id: 'sc9', key: '/', target: 'quick_search', title: 'Quick Global Search', category: 'Action' },
          { id: 'sc10', key: 'Esc', target: 'close_modal', title: 'Close Modal / Unfocus', category: 'Action' }
        ]
      };
    }
    _clinicMemoryStores[cleanId] = db;
    // Kick off asynchronous live sync from MongoDB
    setTimeout(() => syncClinicFromMongoDB(cleanId), 100);
  }

  // Ensure all collections exist
  if (!db.families) db.families = {};
  if (!db.certificates) db.certificates = [];
  if (!db.certificateTemplates) db.certificateTemplates = [...defaultCertificateTemplates];
  if (!db.bills) db.bills = [];
  if (!db.feedbacks) db.feedbacks = [];
  if (!db.dietary) db.dietary = {};
  if (!db.clinicShortcuts) {
    db.clinicShortcuts = {
      medicines: {},
      complaints: {},
      investigations: {},
      allergies: {},
      relations: {},
      areas: {},
      societies: {},
    };
  }
  if (!db.customShortcuts) db.customShortcuts = [];
  if (!db.masterMedicines) db.masterMedicines = [];
  if (!db.masterComplaints) db.masterComplaints = [];
  if (!db.masterInvestigations) db.masterInvestigations = [];
  if (!db.masterAreas) db.masterAreas = [];
  if (!db.masterSocieties) db.masterSocieties = [];
  if (!db.masterAllergies) db.masterAllergies = [];
  if (!db.masterRelations) db.masterRelations = [];

  return db;
}

export function saveLocalDB(db, clinicId = 'demo') {
  const cleanId = String(clinicId || 'demo').trim();
  _clinicMemoryStores[cleanId] = db;

  // Persist shortcuts and custom shortcuts to MongoDB MasterData collection
  if (db.clinicShortcuts || db.customShortcuts) {
    if (db.clinicShortcuts) {
      apiFetch('/masters/clinicShortcuts', {
        method: 'POST',
        body: { items: db.clinicShortcuts },
      }).catch(() => {});
    }
    if (db.customShortcuts) {
      apiFetch('/masters/customShortcuts', {
        method: 'POST',
        body: { items: db.customShortcuts },
      }).catch(() => {});
    }
  }
}

function seedLocalDatabase() {
  const curDate = todayISO();
  return {
    counters: { family: 6, patient: 16, visit: 12 },
    dietary: {
      DB: {
        id: 'd1',
        code: 'DB',
        disease: 'Diabetes Mellitus',
        eat: 'Green leafy vegetables, whole grains, pulses, salads, bitter gourd, fresh water',
        avoid: 'Direct sugar, sweets, jaggery, potatoes, mangoes, bananas, bakery products, soft drinks',
        text: 'Diabetes Diet: Eat whole grains, green vegetables, salads. Strictly avoid sugar, sweets, potatoes, soft drinks.',
        createdAt: '2026-01-10',
      },
      BP: {
        id: 'd2',
        code: 'BP',
        disease: 'Hypertension (High Blood Pressure)',
        eat: 'Fresh fruits, vegetables, oats, garlic, coconut water, low-sodium foods',
        avoid: 'Extra salt, pickles, papad, processed cheese, namkeen, fried snacks, canned food',
        text: 'Hypertension Diet: Eat fresh fruits, vegetables, oats. Strictly avoid extra salt, pickles, papad, salty snacks.',
        createdAt: '2026-01-10',
      },
      ACID: {
        id: 'd3',
        code: 'ACID',
        disease: 'Acidity / GERD / Gastritis',
        eat: 'Cold milk, coconut water, bananas, boiled vegetables, oatmeal, light meals',
        avoid: 'Spicy curries, oily/fried foods, tea, coffee, citrus fruits, late night heavy meals',
        text: 'Acidity / GERD Diet: Eat light boiled meals, cold milk, coconut water. Avoid spicy food, fried items, tea, coffee.',
        createdAt: '2026-01-10',
      },
      THYROID: {
        id: 'd4',
        code: 'THYROID',
        disease: 'Hypothyroidism / Thyroid Disorders',
        eat: 'Iodized salt, eggs, nuts, whole grains, roasted pumpkin seeds, fresh fruits',
        avoid: 'Raw cabbage, cauliflower, broccoli, soy products, gluten, processed junk',
        text: 'Thyroid Diet: Eat iodized salt, whole grains, nuts. Avoid raw cabbage, cauliflower, broccoli, soy products.',
        createdAt: '2026-01-10',
      },
      URIC: {
        id: 'd5',
        code: 'URIC',
        disease: 'Hyperuricemia / Gout (High Uric Acid)',
        eat: 'Cherries, lemons, fresh vegetables, high fluid intake, low-fat curd, water (3-4L)',
        avoid: 'Red meat, seafood, organ meats, beer/alcohol, sugary drinks, high-purine pulses',
        text: 'Uric Acid Diet: Drink 3-4L water, eat fresh vegetables, cherries. Avoid red meat, seafood, alcohol, high-purine pulses.',
        createdAt: '2026-01-10',
      },
      CV: {
        id: 'd6',
        code: 'CV',
        disease: 'Cardiovascular / Heart Disease / High Cholesterol',
        eat: 'Oats, flaxseeds, almonds, olive oil, boiled vegetables, garlic, apples',
        avoid: 'Red meat, butter, ghee, fried snacks, trans fats, packaged/processed fast foods',
        text: 'Cardiovascular Diet: Eat oats, flaxseeds, garlic, boiled vegetables. Avoid butter, ghee, red meat, fried snacks.',
        createdAt: '2026-01-10',
      },
      LQ: {
        id: 'd7',
        code: 'LQ',
        disease: 'Viral Fever / Weakness / Dehydration',
        eat: 'Plenty of warm fluids, coconut water, dal water, khichdi, soup, boiled water',
        avoid: 'Cold beverages, oily food, heavy spicy meals, street food, hard-to-digest items',
        text: 'Fever / Fluid Diet: Plenty of warm fluids, coconut water, soup, khichdi. Avoid cold drinks, oily heavy food.',
        createdAt: '2026-01-10',
      },
    },
    clinicShortcuts: {
      medicines: {
        'Paracetamol 650mg (Dolo 650 / Calpol)': 'PCM',
        'Paracetamol 650mg': 'PCM',
        'Paracetamol 500mg (Crocin)': 'PCM500',
        'Ibuprofen 400mg (Brufen)': 'IBU',
        'Combiflam (Ibuprofen + Paracetamol)': 'COMBI',
        'Zerodol-P (Aceclofenac 100mg + Paracetamol 325mg)': 'ZP',
        'Amoxicillin 500mg (Novamox 500)': 'AMOX',
        'Amoxicillin 500mg': 'AMOX',
        'Augmentin 625 (Amoxyclav 625 Duo)': 'AUG',
        'Azithromycin 500mg (Azithral 500)': 'AZITH',
        'Azithromycin 500mg': 'AZITH',
        'Cefixime 200mg (Taxim-O 200 / Zifi 200)': 'CEF',
        'Ciprofloxacin 500mg (Ciplox 500)': 'CIPRO',
        'Pantoprazole 40mg (Pan 40 / Pantocid)': 'PANTO',
        'Pantoprazole 40mg': 'PANTO',
        'Pantoprazole + Domperidone (Pan-D / Pantop-D)': 'PAND',
        'Rabeprazole 20mg (Razo 20 / Happi 20)': 'RAB',
        'Omeprazole 20mg (Ocid 20 / Omez)': 'OMEZ',
        'Cetirizine 10mg (Cetzine / Alerid)': 'CET',
        'Cetirizine 10mg': 'CET',
        'Levocetirizine 5mg (Levocet / 1-AL)': 'LEVOCET',
        'Montair-LC (Levocetirizine 5mg + Montelukast 10mg)': 'MONTAIR',
        'Telmisartan 40mg (Telma 40 / Telpres 40)': 'TELMA',
        'Telmisartan 40mg': 'TELMI',
        'Amlodipine 5mg (Amlong 5 / Stamlo 5)': 'AMLO',
        'Atorvastatin 10mg / 20mg (Atorva 10 / Storvas)': 'ATORVA',
        'Atorvastatin 10mg': 'ATORVA',
        'Metformin 500mg (Glycomet 500)': 'MET500',
        'Metformin 500mg': 'METFOR',
        'Becosules (Vitamin B-Complex + Vitamin C)': 'BECO',
        'Shelcal 500 (Calcium 500mg + Vitamin D3 250IU)': 'SHELCAL',
        'Calcirol Sachet 60,000 IU (Cholecalciferol D3)': 'D3',
        'Cough Relief Syrup 100ml': 'COUGH',
      },
      complaints: {
        'Fever / High Temperature': 'FEV',
        'Cough / Cold / Sore Throat': 'COUGH',
        'Headache / Migraine': 'HEAD',
        'Chest Pain / Discomfort': 'CHEST',
        'Acidity / Heartburn / Gastric Pain': 'ACID',
        'Joint Pain / Knee Swelling': 'JOINT',
        'General Weakness / Fatigue': 'WEAK',
        'Hypertension Check / Giddiness': 'BP',
        'High Blood Sugar / Polyuria': 'DIAB',
        'Nausea / Vomiting': 'VOM',
        'Breathlessness / Dyspnea': 'BREATH',
        'Skin Rash / Itching': 'SKIN',
      },
      investigations: {
        'Complete Blood Count (CBC)': 'CBC',
        'Blood Sugar Fasting & PP (FBS/PPBS)': 'BSF',
        'HbA1c (Glycated Hemoglobin)': 'HBA1C',
        'Lipid Profile Complete': 'LIPID',
        'Liver Function Test (LFT)': 'LFT',
        'Renal / Kidney Function Test (KFT/RFT)': 'RFT',
        'Urine Routine & Microscopic (R/M)': 'URINE',
        'Thyroid Profile (T3, T4, TSH)': 'THYROID',
        'Chest X-Ray PA View': 'XRAY',
        '12-Lead ECG (Electrocardiogram)': 'ECG',
        'USG Whole Abdomen & Pelvis': 'USG',
        'Widal Test / Typhoid Serology': 'WIDAL',
        'Dengue NS1 Antigen & IgM/IgG': 'DENGUE',
        'Vitamin D3 & B12 Levels': 'VITD',
      },
      allergies: {
        'None': 'NONE',
        'Penicillin': 'PEN',
        'Sulfa Drugs': 'SULFA',
        'Aspirin / NSAIDs': 'ASP',
        'Dust / Pollen': 'DUST',
        'Peanuts / Nuts': 'NUT',
        'Latex': 'LATEX',
        'Ciprofloxacin': 'CIPRO',
        'Amoxicillin': 'AMOX',
      },
      relations: {
        'Head': 'HEAD',
        'Wife': 'WIFE',
        'Husband': 'HUSB',
        'Son': 'SON',
        'Daughter': 'DAU',
        'Father': 'FAT',
        'Mother': 'MOT',
        'Brother': 'BRO',
        'Sister': 'SIS',
        'Grandfather': 'GFAT',
        'Grandmother': 'GMOT',
        'Daughter-in-Law': 'DIL',
        'Son-in-Law': 'SIL',
        'Other': 'OTH',
      },
      areas: {},
      societies: {},
    },
    masterAreas: [],
    masterMedicines: [],
    masterAllergies: [],
    masterRelations: [],
    masterSocieties: [],
    masterComplaints: [],
    masterInvestigations: [],
    customComplaints: [],
    customInvestigations: [],
    followups: [
      { id: 'fu1', patientId: '00010001', patientName: 'PATEL RAMESHBHAI GOVINDBHAI', date: curDate, reason: 'Platelet Count & Dengue Serology Recheck', status: 'Pending' },
      { id: 'fu2', patientId: '00030001', patientName: 'DESAI BHUPENDRABHAI KANTILAL', date: curDate, reason: 'Endoscopy & H. Pylori Report Review', status: 'Pending' },
      { id: 'fu3', patientId: '00030003', patientName: 'DESAI KANTABEN KANTILAL', date: '2026-10-04', reason: 'Bilateral Knee Joint Pain Follow-up', status: 'Scheduled' },
      { id: 'fu4', patientId: '00040001', patientName: 'SHAH JIGNESHBHAI PRAVINCHANDRA', date: '2026-10-06', reason: 'Migraine Prophylaxis Assessment', status: 'Scheduled' },
      { id: 'fu5', patientId: '00060001', patientName: 'MEHTA RAJESHBHAI CHANDRAKANT', date: '2026-10-08', reason: 'Fasting Blood Sugar & HbA1c Review', status: 'Scheduled' },
    ],
    bills: [
      { id: 'b1', billNo: 'INV-2026-001', billDate: curDate, patientId: '00010001', patientName: 'PATEL RAMESHBHAI GOVINDBHAI', caseId: '00012026000101', totalCharge: 600, paidAmount: 600, dueAmount: 0, status: 'Paid' },
      { id: 'b2', billNo: 'INV-2026-002', billDate: curDate, patientId: '00020002', patientName: 'SHARMA PRIYABEN AMITBHAI', caseId: '00012026000201', totalCharge: 500, paidAmount: 500, dueAmount: 0, status: 'Paid' },
      { id: 'b3', billNo: 'INV-2026-003', billDate: curDate, patientId: '00030001', patientName: 'DESAI BHUPENDRABHAI KANTILAL', caseId: '00012026000301', totalCharge: 500, paidAmount: 250, dueAmount: 250, status: 'Partial' },
      { id: 'b4', billNo: 'INV-2026-004', billDate: curDate, patientId: '00030003', patientName: 'DESAI KANTABEN KANTILAL', caseId: '00012026000302', totalCharge: 750, paidAmount: 750, dueAmount: 0, status: 'Paid' },
      { id: 'b5', billNo: 'INV-2026-005', billDate: curDate, patientId: '00040001', patientName: 'SHAH JIGNESHBHAI PRAVINCHANDRA', caseId: '00012026000401', totalCharge: 500, paidAmount: 200, dueAmount: 300, status: 'Partial' },
      { id: 'b6', billNo: 'INV-2026-006', billDate: curDate, patientId: '00040003', patientName: 'SHAH AARAV JIGNESHBHAI', caseId: '00012026000402', totalCharge: 450, paidAmount: 450, dueAmount: 0, status: 'Paid' },
      { id: 'b7', billNo: 'INV-2026-007', billDate: '2026-09-30', patientId: '00050001', patientName: 'PRAJAPATI MANISHBHAI KANUBHAI', caseId: '00012026000501', totalCharge: 550, paidAmount: 100, dueAmount: 450, status: 'Partial' },
      { id: 'b8', billNo: 'INV-2026-008', billDate: '2026-09-29', patientId: '00060001', patientName: 'MEHTA RAJESHBHAI CHANDRAKANT', caseId: '00012026000601', totalCharge: 800, paidAmount: 0, dueAmount: 800, status: 'Due' },
    ],
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
        createdAt: curDate,
        patients: {
          '00010001': {
            id: '00010001',
            patId: '00010001',
            familyId: '000120260001',
            name: 'PATEL RAMESHBHAI GOVINDBHAI',
            relation: 'Head',
            age: '46',
            gender: 'Male',
            bloodGroup: 'O+',
            society: 'Shanti Niketan Apt',
            allergy: 'Dust / Pollen',
            phone: '9876543210',
            visits: [
              {
                id: 'v1',
                caseId: '00012026000101',
                visitNum: 1,
                date: curDate,
                time: '09:30 AM',
                weight: '74',
                bp: '130/85',
                sugar: '110',
                reference: 'Dr. Shah',
                complaint: 'High fever, body chills and shivering for 2 days',
                diagnosis: 'Acute Viral Pyrexia',
                treatment: [{ name: 'Clinical Consultation', qty: '1' }, { name: 'Injection Paracetamol IM', qty: '1' }],
                prescription: [
                  { name: 'Paracetamol 650mg', qty: '10', mor: '1', noon: '1', eve: '1', ngt: '0', timing: 'AF' },
                  { name: 'Pantoprazole 40mg', qty: '5', mor: '1', noon: '0', eve: '0', ngt: '0', timing: 'BF' }
                ],
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
            society: 'Shanti Niketan Apt',
            allergy: 'Penicillin',
            phone: '9876543210',
            visits: [
              {
                id: 'v2',
                caseId: '00012026000102',
                visitNum: 1,
                date: '2026-09-29',
                time: '04:30 PM',
                weight: '62',
                bp: '120/80',
                sugar: '',
                reference: '',
                complaint: 'Joint stiffness and lower backache',
                diagnosis: 'Mild Lumbar Spondylosis',
                treatment: [{ name: 'Physiotherapy Heat', qty: '1' }],
                prescription: [{ name: 'Ibuprofen 400mg', qty: '6', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }],
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
            age: '19',
            gender: 'Male',
            bloodGroup: 'O+',
            society: 'Shanti Niketan Apt',
            allergy: 'None',
            phone: '9876543210',
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
        createdAt: curDate,
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
            society: 'Gokuldham Society',
            allergy: 'None',
            phone: '9876543211',
            visits: [
              {
                id: 'v3',
                caseId: '00012026000201',
                visitNum: 1,
                date: '2026-09-30',
                time: '11:00 AM',
                weight: '68',
                bp: '124/82',
                sugar: '105',
                reference: 'Self',
                complaint: 'Stomach burning, bloating and acidity after meals',
                diagnosis: 'Gastroesophageal Reflux Disease (GERD)',
                treatment: [{ name: 'Clinical Consultation', qty: '1' }],
                prescription: [{ name: 'Pantoprazole 40mg', qty: '10', mor: '1', noon: '0', eve: '0', ngt: '0', timing: 'BF' }],
                charge: 400,
                received: 400,
                due: 0,
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
            society: 'Gokuldham Society',
            allergy: 'Sulfa Drugs',
            phone: '9876543211',
            visits: [
              {
                id: 'v4',
                caseId: '00012026000202',
                visitNum: 1,
                date: curDate,
                time: '10:15 AM',
                weight: '58',
                bp: '118/78',
                sugar: '',
                reference: '',
                complaint: 'Severe sore throat, dry painful cough and mild fever',
                diagnosis: 'Acute Upper Respiratory Tract Infection (URTI)',
                treatment: [{ name: 'Consultation & Throat Examination', qty: '1' }],
                prescription: [
                  { name: 'Amoxicillin 500mg', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' },
                  { name: 'Cough Relief Syrup 100ml', qty: '1', mor: '2', noon: '2', eve: '2', ngt: '0', timing: 'AF' }
                ],
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
            name: 'SHARMA ANANYA AMITBHAI',
            relation: 'Daughter',
            age: '21',
            gender: 'Female',
            bloodGroup: 'AB+',
            society: 'Gokuldham Society',
            allergy: 'None',
            phone: '9876543211',
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
        createdAt: curDate,
        patients: {
          '00030001': {
            id: '00030001',
            patId: '00030001',
            familyId: '000120260003',
            name: 'DESAI BHUPENDRABHAI KANTILAL',
            relation: 'Head',
            age: '58',
            gender: 'Male',
            bloodGroup: 'B+',
            society: 'Surya Kiran Heights',
            allergy: 'None',
            phone: '9876543212',
            visits: [
              {
                id: 'v5',
                caseId: '00012026000301',
                visitNum: 1,
                date: curDate,
                time: '11:00 AM',
                weight: '82',
                bp: '142/92',
                sugar: '138',
                reference: 'Dr. Mehta',
                complaint: 'Chest burning after spicy meals, chronic acidity and belching',
                diagnosis: 'Chronic Gastritis & Mild Hypertension',
                treatment: [{ name: 'Clinical Consultation', qty: '1' }],
                prescription: [
                  { name: 'Pantoprazole 40mg', qty: '15', mor: '1', noon: '0', eve: '0', ngt: '0', timing: 'BF' },
                  { name: 'Telmisartan 40mg', qty: '15', mor: '1', noon: '0', eve: '0', ngt: '0', timing: 'BF' }
                ],
                charge: 500,
                received: 250,
                due: 250,
              },
            ],
          },
          '00030002': {
            id: '00030002',
            patId: '00030002',
            familyId: '000120260003',
            name: 'DESAI MEENABEN BHUPENDRABHAI',
            relation: 'Wife',
            age: '55',
            gender: 'Female',
            bloodGroup: 'B+',
            society: 'Surya Kiran Heights',
            allergy: 'None',
            phone: '9876543212',
            visits: [],
          },
          '00030003': {
            id: '00030003',
            patId: '00030003',
            familyId: '000120260003',
            name: 'DESAI KANTABEN KANTILAL',
            relation: 'Mother',
            age: '82',
            gender: 'Female',
            bloodGroup: 'O+',
            society: 'Surya Kiran Heights',
            allergy: 'Aspirin / NSAIDs',
            phone: '9876543212',
            visits: [
              {
                id: 'v6',
                caseId: '00012026000302',
                visitNum: 1,
                date: curDate,
                time: '11:45 AM',
                weight: '54',
                bp: '135/85',
                sugar: '98',
                reference: '',
                complaint: 'Severe bilateral knee pain, difficulty walking and swelling',
                diagnosis: 'Primary Osteoarthritis of Both Knees',
                treatment: [{ name: 'Orthopaedic Knee Checkup', qty: '1' }, { name: 'Pain Relief Spray Application', qty: '1' }],
                prescription: [
                  { name: 'Paracetamol 650mg', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' },
                  { name: 'Vitamin C + Zinc Chewable', qty: '15', mor: '1', noon: '0', eve: '0', ngt: '0', timing: 'OD' }
                ],
                charge: 750,
                received: 750,
                due: 0,
              },
            ],
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
        createdAt: curDate,
        patients: {
          '00040001': {
            id: '00040001',
            patId: '00040001',
            familyId: '000120260004',
            name: 'SHAH JIGNESHBHAI PRAVINCHANDRA',
            relation: 'Head',
            age: '42',
            gender: 'Male',
            bloodGroup: 'B+',
            society: 'Radhe Krishna Bunglows',
            allergy: 'None',
            phone: '9876543213',
            visits: [
              {
                id: 'v7',
                caseId: '00012026000401',
                visitNum: 1,
                date: curDate,
                time: '04:15 PM',
                weight: '70',
                bp: '122/80',
                sugar: '',
                reference: '',
                complaint: 'Intense unilateral throbbing headache, nausea & sensitivity to light',
                diagnosis: 'Migraine without Aura',
                treatment: [{ name: 'Clinical Consultation', qty: '1' }],
                prescription: [
                  { name: 'Paracetamol 650mg', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' },
                  { name: 'Pantoprazole 40mg', qty: '5', mor: '1', noon: '0', eve: '0', ngt: '0', timing: 'BF' }
                ],
                charge: 500,
                received: 200,
                due: 300,
              },
            ],
          },
          '00040002': {
            id: '00040002',
            patId: '00040002',
            familyId: '000120260004',
            name: 'SHAH HETALBEN JIGNESHBHAI',
            relation: 'Wife',
            age: '39',
            gender: 'Female',
            bloodGroup: 'A+',
            society: 'Radhe Krishna Bunglows',
            allergy: 'None',
            phone: '9876543213',
            visits: [],
          },
          '00040003': {
            id: '00040003',
            patId: '00040003',
            familyId: '000120260004',
            name: 'SHAH AARAV JIGNESHBHAI',
            relation: 'Son',
            age: '12',
            gender: 'Male',
            bloodGroup: 'B+',
            society: 'Radhe Krishna Bunglows',
            allergy: 'Dust / Pollen',
            phone: '9876543213',
            visits: [
              {
                id: 'v8',
                caseId: '00012026000402',
                visitNum: 1,
                date: curDate,
                time: '05:00 PM',
                weight: '38',
                bp: '105/68',
                sugar: '',
                reference: '',
                complaint: 'Frequent sneezing, running nose and watery eyes',
                diagnosis: 'Allergic Rhinitis / Dust Allergy',
                treatment: [{ name: 'Pediatric Checkup', qty: '1' }],
                prescription: [{ name: 'Cetirizine 10mg', qty: '5', mor: '0', noon: '0', eve: '0', ngt: '1', timing: 'HS' }],
                charge: 450,
                received: 450,
                due: 0,
              },
            ],
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
        createdAt: curDate,
        patients: {
          '00050001': {
            id: '00050001',
            patId: '00050001',
            familyId: '000120260005',
            name: 'PRAJAPATI MANISHBHAI KANUBHAI',
            relation: 'Head',
            age: '36',
            gender: 'Male',
            bloodGroup: 'O+',
            society: 'Vrindavan Society',
            allergy: 'None',
            phone: '9876543214',
            visits: [
              {
                id: 'v9',
                caseId: '00012026000501',
                visitNum: 1,
                date: '2026-09-30',
                time: '06:00 PM',
                weight: '76',
                bp: '148/96',
                sugar: '162',
                reference: 'Self',
                complaint: 'General fatigue, polyuria and high random blood glucose',
                diagnosis: 'Type 2 Diabetes Mellitus & Stage 1 HTN',
                treatment: [{ name: 'Comprehensive Metabolic Checkup', qty: '1' }],
                prescription: [
                  { name: 'Metformin 500mg', qty: '30', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' },
                  { name: 'Telmisartan 40mg', qty: '30', mor: '1', noon: '0', eve: '0', ngt: '0', timing: 'BF' }
                ],
                charge: 550,
                received: 100,
                due: 450,
              },
            ],
          },
          '00050002': {
            id: '00050002',
            patId: '00050002',
            familyId: '000120260005',
            name: 'PRAJAPATI REKHABEN MANISHBHAI',
            relation: 'Wife',
            age: '34',
            gender: 'Female',
            bloodGroup: 'AB+',
            society: 'Vrindavan Society',
            allergy: 'None',
            phone: '9876543214',
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
        createdAt: curDate,
        patients: {
          '00060001': {
            id: '00060001',
            patId: '00060001',
            familyId: '000120260006',
            name: 'MEHTA RAJESHBHAI CHANDRAKANT',
            relation: 'Head',
            age: '52',
            gender: 'Male',
            bloodGroup: 'A+',
            society: 'Royal Residency',
            allergy: 'None',
            phone: '9876543215',
            visits: [
              {
                id: 'v10',
                caseId: '00012026000601',
                visitNum: 1,
                date: '2026-09-29',
                time: '07:15 PM',
                weight: '84',
                bp: '138/88',
                sugar: '115',
                reference: '',
                complaint: 'Routine lipid screening and elevated serum cholesterol',
                diagnosis: 'Dyslipidemia / Hypercholesterolemia',
                treatment: [{ name: 'Cardiac & Lipid Consultation', qty: '1' }],
                prescription: [{ name: 'Atorvastatin 10mg', qty: '30', mor: '0', noon: '0', eve: '0', ngt: '1', timing: 'HS' }],
                charge: 800,
                received: 0,
                due: 800,
              },
            ],
          },
          '00060002': {
            id: '00060002',
            patId: '00060002',
            familyId: '000120260006',
            name: 'MEHTA BHAVISHA RAJESHBHAI',
            relation: 'Wife',
            age: '49',
            gender: 'Female',
            bloodGroup: 'O+',
            society: 'Royal Residency',
            allergy: 'None',
            phone: '9876543215',
            visits: [],
          },
        },
      },
    },
  };
}

function fallbackLocalHandler(endpoint, config) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';
  const db = getLocalDB(clinicId);

  // Fallback for families
  if (endpoint.startsWith('/families')) {
    const list = Object.values(db.families);
    return { success: true, count: list.length, data: list };
  }

  // Fallback for stats
  if (endpoint.startsWith('/reports/stats')) {
    const allPats = [];
    const allVisits = [];
    Object.values(db.families).forEach((f) => {
      Object.values(f.patients).forEach((p) => {
        allPats.push(p);
        p.visits.forEach((v) => allVisits.push({ ...v, famHead: f.headName, famId: f.id, patName: p.name }));
      });
    });

    const targetDate = todayISO();
    const targetVisits = allVisits.filter((v) => v.date === targetDate);
    const dateCollection = targetVisits.reduce((s, v) => s + (Number(v.received) || 0), 0);
    const totalDue = allVisits.reduce((s, v) => s + (Number(v.due) || 0), 0);

    return {
      success: true,
      data: {
        totalFamilies: Object.keys(db.families).length,
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

  // Fallback for certificate templates
  if (endpoint.startsWith('/certificates/templates')) {
    if (config.method === 'POST') {
      const body = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
      const newTpl = {
        id: 'tpl-' + uid(),
        templateName: body.templateName || 'Custom Template',
        title: (body.title || 'MEDICAL CERTIFICATE').toUpperCase(),
        body: body.body || '',
        category: body.category || 'Custom',
        isDefault: false,
        createdAt: todayISO(),
      };
      if (!db.certificateTemplates) db.certificateTemplates = [...defaultCertificateTemplates];
      db.certificateTemplates.push(newTpl);
      saveLocalDB(db, clinicId);
      return { success: true, message: 'Template saved', data: newTpl };
    }
    if (config.method === 'DELETE') {
      const parts = endpoint.split('/');
      const id = parts[parts.length - 1];
      if (db.certificateTemplates) {
        db.certificateTemplates = db.certificateTemplates.filter((t) => t.id !== id);
        saveLocalDB(db, clinicId);
      }
      return { success: true, message: 'Template deleted' };
    }
    const tpls = db.certificateTemplates || defaultCertificateTemplates;
    return { success: true, count: tpls.length, data: tpls };
  }

  // Fallback for certificate verification
  if (endpoint.startsWith('/certificates/verify/')) {
    const certNo = decodeURIComponent(endpoint.replace('/certificates/verify/', '')).trim();
    const certs = db.certificates || [];
    const found = certs.find((c) => (c.certNo || '').toLowerCase() === certNo.toLowerCase());
    if (!found) {
      return { success: false, valid: false, message: `No certificate found for ID: ${certNo}` };
    }
    return { success: true, valid: true, data: found, message: 'Certificate successfully verified' };
  }

  // Fallback for certificates CRUD
  if (endpoint.startsWith('/certificates')) {
    if (config.method === 'POST') {
      const body = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
      if (!db.certificates) db.certificates = [];
      const year = new Date().getFullYear();
      const count = db.certificates.length + 1;
      const certNo = body.certNo || `CERT-${year}-${pad(count, 4)}`;

      const newCert = {
        id: 'cert-' + uid(),
        certNo,
        patientId: body.patientId || '',
        patientName: (body.patientName || '').trim(),
        patientAge: body.patientAge || '',
        patientGender: body.patientGender || '',
        diagnosis: (body.diagnosis || '').trim(),
        fromDate: body.fromDate || todayISO(),
        toDate: body.toDate || todayISO(),
        restDays: Number(body.restDays) || 0,
        templateId: body.templateId || '',
        templateName: body.templateName || 'Medical Fitness / Leave',
        title: body.title || 'MEDICAL CERTIFICATE',
        customBody: body.customBody || '',
        reason: body.reason || 'Medical Rest & Treatment',
        place: body.place || 'Surat',
        doctorName: body.doctorName || 'Dr. Chirag Paghdal',
        issuedDate: todayISO(),
        status: 'Issued',
      };

      db.certificates.unshift(newCert);
      saveLocalDB(db, clinicId);
      return { success: true, message: 'Certificate issued', data: newCert };
    }

    if (config.method === 'DELETE') {
      const parts = endpoint.split('/');
      const id = parts[parts.length - 1];
      if (db.certificates) {
        db.certificates = db.certificates.filter((c) => c.id !== id && c.certNo !== id);
        saveLocalDB(db, clinicId);
      }
      return { success: true, message: 'Certificate deleted' };
    }

    const certList = db.certificates || [];
    return { success: true, count: certList.length, data: certList };
  }

  // Fallback for billing & bills
  if (endpoint.startsWith('/billing') || endpoint.startsWith('/bills')) {
    const list = db.bills || [];
    return { success: true, count: list.length, data: list };
  }

  // Fallback for followups
  if (endpoint.startsWith('/followups') || endpoint.startsWith('/followup')) {
    const list = db.followups || [];
    return { success: true, count: list.length, data: list };
  }

  // Fallback for patients list
  if (endpoint.startsWith('/patients') || endpoint.startsWith('/patient')) {
    const allPats = [];
    Object.values(db.families || {}).forEach((f) => {
      Object.values(f.patients || {}).forEach((p) => {
        allPats.push({ ...p, family: f });
      });
    });
    return { success: true, count: allPats.length, data: allPats };
  }

  // Fallback for feedback, complaints, support & clinic requests
  if (endpoint.startsWith('/feedback') || endpoint.startsWith('/support')) {
    if (!db.feedbacks) db.feedbacks = [...defaultFeedbacks];

    // POST /feedback/:id/approve-clinic
    if (endpoint.includes('/approve-clinic') && config.method === 'POST') {
      const parts = endpoint.split('/');
      const id = parts[parts.indexOf('feedback') + 1] || parts[parts.indexOf('support') + 1];
      const ticket = db.feedbacks.find((t) => t.id === id || t.ticketNo === id);
      if (ticket) {
        if (!ticket.metaDetails) ticket.metaDetails = {};
        ticket.metaDetails.clinicApproved = true;
        ticket.status = 'Resolved';
        const clinicName = ticket.metaDetails.requestedClinicName || ticket.subject;
        ticket.replies.push({
          senderRole: 'admin',
          senderName: 'System Administrator (Admin)',
          message: `Official Approval: Your request for registering "${clinicName}" has been APPROVED. The clinic is now active in your clinics list!`,
          createdAt: new Date().toISOString(),
        });
        ticket.lastReplyAt = new Date().toISOString();

        // Also add new clinic to current session clinics list
        const curSession = getAuthSession();
        if (curSession && curSession.profile) {
          if (!curSession.profile.clinics) curSession.profile.clinics = [];
          const newClinicId = 'clinic-' + Date.now();
          if (!curSession.profile.clinics.some((c) => c.name.toLowerCase() === clinicName.toLowerCase())) {
            curSession.profile.clinics.push({ id: newClinicId, name: clinicName });
            setAuthSession(curSession);
          }
        }

        saveLocalDB(db, clinicId);
        return { success: true, message: `Clinic "${clinicName}" approved and registered!`, data: ticket };
      }
      return { success: false, message: 'Ticket not found' };
    }

    // POST /feedback/:id/reply
    if (endpoint.includes('/reply') && config.method === 'POST') {
      const parts = endpoint.split('/');
      const id = parts[parts.indexOf('feedback') + 1] || parts[parts.indexOf('support') + 1];
      const body = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
      const ticket = db.feedbacks.find((t) => t.id === id || t.ticketNo === id);
      if (ticket) {
        const senderRole = body.senderRole || (session?.role === 'admin' ? 'admin' : 'doctor');
        const senderName = body.senderName || (senderRole === 'admin' ? 'System Administrator' : (session?.profile?.name || 'Dr. Chirag Paghdal'));
        const replyObj = {
          senderRole,
          senderName,
          message: (body.message || '').trim(),
          createdAt: new Date().toISOString(),
        };
        ticket.replies.push(replyObj);
        ticket.lastReplyAt = new Date().toISOString();
        if (body.status) {
          ticket.status = body.status;
        } else if (senderRole === 'admin') {
          ticket.status = 'Resolved';
        } else {
          ticket.status = 'Pending';
        }
        saveLocalDB(db, clinicId);
        return { success: true, message: 'Reply sent', data: ticket };
      }
      return { success: false, message: 'Ticket not found' };
    }

    // PATCH /feedback/:id/status
    if (config.method === 'PATCH' && endpoint.includes('/status')) {
      const parts = endpoint.split('/');
      const id = parts[parts.indexOf('feedback') + 1] || parts[parts.indexOf('support') + 1];
      const body = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
      const ticket = db.feedbacks.find((t) => t.id === id || t.ticketNo === id);
      if (ticket && body.status) {
        ticket.status = body.status;
        saveLocalDB(db, clinicId);
        return { success: true, message: 'Status updated', data: ticket };
      }
      return { success: false, message: 'Ticket not found or invalid status' };
    }

    // POST /feedback (Create new ticket)
    if (config.method === 'POST') {
      const body = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
      const year = new Date().getFullYear();
      const count = db.feedbacks.length + 1;
      const ticketNo = `TKT-${year}-${pad(count, 4)}`;

      const categoryLabels = {
        clinic_request: 'New Clinic Registration Request',
        feature_request: 'Feature Request / Enhancement',
        bug_report: 'Technical Issue / Bug Report',
        general_feedback: 'General Feedback / Support',
      };

      const newTicket = {
        id: 'tkt-' + uid(),
        ticketNo,
        doctorId: session?.profile?.id || 'demo',
        doctorName: body.doctorName || session?.profile?.name || 'Dr. Chirag Paghdal',
        clinicId: clinicId || 'demo',
        clinicName: body.clinicName || 'Dhyey Clinic & Hospital',
        category: body.category || 'general_feedback',
        categoryLabel: body.categoryLabel || categoryLabels[body.category] || 'General Feedback',
        priority: body.priority || 'Normal',
        subject: (body.subject || '').trim(),
        message: (body.message || '').trim(),
        metaDetails: body.metaDetails || {},
        status: 'Pending',
        replies: [],
        createdAt: new Date().toISOString(),
        lastReplyAt: null,
      };

      db.feedbacks.unshift(newTicket);
      saveLocalDB(db, clinicId);

      return { success: true, message: 'Support ticket submitted successfully', data: newTicket };
    }

    // GET /feedback / /feedback/admin/all
    return { success: true, count: db.feedbacks.length, data: db.feedbacks };
  }

  return { success: true, data: [] };
}

// ==========================================
// UNIVERSAL DATALIST AUTOCOMPLETE INTERCEPTOR
// ==========================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const input = e.target;
    if (input.tagName === 'INPUT' && input.hasAttribute('list')) {
      const listId = input.getAttribute('list');
      if (!listId) return;

      const datalist = document.getElementById(listId);
      if (datalist && datalist.options.length > 0) {
        const val = input.value.trim().toLowerCase();
        if (val) {
          const options = Array.from(datalist.options);

          // Find first matching option (prioritize startsWith over includes)
          let match = options.find(opt => opt.value.toLowerCase().startsWith(val));
          if (!match) {
            match = options.find(opt => opt.value.toLowerCase().includes(val));
          }

          if (match && match.value.toLowerCase() !== val) {
            // Prevent immediate form submission so the doctor can confirm the autocompleted word
            e.preventDefault();
            input.value = match.value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    }
  }
});

