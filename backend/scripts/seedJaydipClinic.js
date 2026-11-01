require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jaydipclinic';

const MasterData = require('../models/MasterData');
const CertificateTemplate = require('../models/CertificateTemplate');
const Certificate = require('../models/Certificate');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const Family = require('../models/Family');
const Patient = require('../models/Patient');
const Consultation = require('../models/Consultation');
const FollowUp = require('../models/FollowUp');
const Bill = require('../models/Bill');

const MASTERS_DATA = {
  dietary: [
    { id: 'diet-1', code: 'DB', title: 'Diabetic Diet', description: 'Diabetic diet: avoid sugar, sweets and fried food. Prefer high-fibre meals, eat on time.', createdAt: '2026-01-01' },
    { id: 'diet-2', code: 'CV', title: 'Cardiac / Low Salt', description: 'Low-salt, low-oil diet. Avoid red meat and packaged/processed food.', createdAt: '2026-01-01' },
    { id: 'diet-3', code: 'LQ', title: 'Liquid & Soft Food', description: 'Plenty of fluids and light, easily digestible food until fever/cough settles.', createdAt: '2026-01-01' },
    { id: 'diet-4', code: 'SUGAR', title: 'Strict Sugar-Free', description: 'Avoid direct sugar, jaggery, honey, sweets, sweet fruits like mango & banana.', createdAt: '2026-01-01' },
    { id: 'diet-5', code: 'BP', title: 'Hypertension / Low Sodium', description: 'Strict low salt diet. Avoid pickles, papad, processed cheese and salty snacks.', createdAt: '2026-01-01' },
    { id: 'diet-6', code: 'ACID', title: 'GERD / Acidity Care', description: 'Avoid spicy food, oily dishes, tea, coffee, citrus fruits. Drink cool milk or coconut water.', createdAt: '2026-01-01' },
    { id: 'diet-7', code: 'LVR', title: 'Liver Care', description: 'Avoid alcohol, deep-fried food, heavy fats, eat fresh fruits and boiled veggies.', createdAt: '2026-01-01' },
  ],
  complaints: [
    { id: 'c1', name: 'Fever / High Temperature', category: 'General', description: 'Body temperature above 100°F with chills' },
    { id: 'c2', name: 'Cough / Cold / Sore Throat', category: 'Respiratory', description: 'Dry or productive throat irritation and congestion' },
    { id: 'c3', name: 'Headache / Migraine', category: 'Neurological', description: 'Frontal or throbbing head pain' },
    { id: 'c4', name: 'Chest Pain / Discomfort', category: 'Cardiovascular', description: 'Substernal tightness or radiating pain' },
    { id: 'c5', name: 'Acidity / Heartburn / Gastric Pain', category: 'Gastrointestinal', description: 'Epigastric burning sensation after meals' },
    { id: 'c6', name: 'Joint Pain / Knee Swelling', category: 'Orthopedic', description: 'Arthritic pain and stiffness' },
    { id: 'c7', name: 'General Weakness / Fatigue', category: 'General', description: 'Lethargy and malaise' },
    { id: 'c8', name: 'Hypertension Check / Giddiness', category: 'Cardiovascular', description: 'Dizziness and elevated blood pressure' },
    { id: 'c9', name: 'High Blood Sugar / Polyuria', category: 'Endocrine', description: 'Excessive thirst and urination' },
    { id: 'c10', name: 'Nausea / Vomiting', category: 'Gastrointestinal', description: 'Stomach upset and regurgitation' },
    { id: 'c11', name: 'Skin Rash / Itching / Allergy', category: 'Dermatological', description: 'Pruritic erythematous lesions' },
    { id: 'c12', name: 'Breathlessness / Wheezing', category: 'Respiratory', description: 'Shortness of breath on exertion or nocturnal dyspnea' },
  ],
  investigations: [
    { id: 'inv1', name: 'Complete Blood Count (CBC)', category: 'Blood / Hematology', sampleType: 'Whole Blood (EDTA)', description: 'Hb, TLC, DLC, Platelet count assessment' },
    { id: 'inv2', name: 'Blood Sugar Fasting & PP (FBS/PPBS)', category: 'Biochemistry', sampleType: 'Fluoride Plasma', description: 'Glycemic control and diabetes evaluation' },
    { id: 'inv3', name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', sampleType: 'Whole Blood (EDTA)', description: '3-month average blood glucose level' },
    { id: 'inv4', name: 'Lipid Profile Complete', category: 'Biochemistry', sampleType: 'Serum', description: 'Cholesterol, Triglycerides, HDL, LDL, VLDL' },
    { id: 'inv5', name: 'Liver Function Test (LFT)', category: 'Biochemistry', sampleType: 'Serum', description: 'SGPT, SGOT, Bilirubin, Alkaline Phosphatase' },
    { id: 'inv6', name: 'Renal / Kidney Function Test (KFT/RFT)', category: 'Biochemistry', sampleType: 'Serum', description: 'Serum Creatinine, Blood Urea, Uric Acid' },
    { id: 'inv7', name: 'Urine Routine & Microscopic (R/M)', category: 'Pathology', sampleType: 'Clean Catch Urine', description: 'Pus cells, Albumin, Sugar, RBCs in urine' },
    { id: 'inv8', name: '12-Lead ECG (Electrocardiogram)', category: 'Cardiology', sampleType: '12-Lead Tracing', description: 'Cardiac rhythm and ST-T segment evaluation' },
    { id: 'inv9', name: 'Serum Electrolytes (Na+, K+, Cl-)', category: 'Biochemistry', sampleType: 'Serum', description: 'Electrolyte balance assessment' },
    { id: 'inv10', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrine', sampleType: 'Serum', description: 'Thyroid function screening' },
    { id: 'inv11', name: 'Widal Test / Typhidot IgM', category: 'Serology', sampleType: 'Serum', description: 'Typhoid enteric fever diagnosis' },
    { id: 'inv12', name: 'Dengue NS1 Ag & IgM/IgG', category: 'Serology', sampleType: 'Serum', description: 'Dengue viral antigen and antibody detection' },
    { id: 'inv13', name: 'Chest X-Ray PA View', category: 'Radiology', sampleType: 'Digital X-Ray', description: 'Pulmonary parenchyma and cardiac silhouette' },
    { id: 'inv14', name: 'USG Abdomen & Pelvis', category: 'Radiology', sampleType: 'Ultrasound', description: 'Hepatobiliary, renal and pelvic organ sonography' },
  ],
  medicines: [
    { id: 'm1', name: 'Paracetamol 650mg (Dolo 650 / Calpol)', category: 'Antipyretic / Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 5 },
    { id: 'm2', name: 'Paracetamol 500mg (Crocin)', category: 'Antipyretic / Analgesic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 4 },
    { id: 'm3', name: 'Ibuprofen 400mg (Brufen)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 6 },
    { id: 'm4', name: 'Combiflam (Ibuprofen + Paracetamol)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 7 },
    { id: 'm5', name: 'Zerodol-P (Aceclofenac 100mg + Paracetamol 325mg)', category: 'NSAID / Pain Relief', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 9 },
    { id: 'm6', name: 'Amoxicillin 500mg (Novamox 500)', category: 'Antibiotic (Penicillin)', form: 'Capsule', defaultDosage: '1-0-1 AF', unitPrice: 12 },
    { id: 'm7', name: 'Augmentin 625 (Amoxyclav 625 Duo)', category: 'Broad Spectrum Antibiotic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 22 },
    { id: 'm8', name: 'Azithromycin 500mg (Azithral 500)', category: 'Macrolide Antibiotic', form: 'Tablet', defaultDosage: '1-0-0 OD', unitPrice: 20 },
    { id: 'm9', name: 'Pantoprazole 40mg (Pan 40 / Pantocid)', category: 'Antacid / PPI', form: 'Tablet', defaultDosage: '1-0-0 BF', unitPrice: 8 },
    { id: 'm10', name: 'Pantoprazole + Domperidone (Pan-D)', category: 'Antacid / PPI + Prokinetic', form: 'Capsule', defaultDosage: '1-0-0 BF', unitPrice: 14 },
    { id: 'm11', name: 'Cetirizine 10mg (Cetzine / Alerid)', category: 'Antihistamine / Allergy', form: 'Tablet', defaultDosage: '0-0-1 HS', unitPrice: 4 },
    { id: 'm12', name: 'Montair-LC (Levocetirizine + Montelukast)', category: 'Allergic Rhinitis / Asthma', form: 'Tablet', defaultDosage: '0-0-1 HS', unitPrice: 16 },
    { id: 'm13', name: 'Metformin 500mg (Glyciphage 500)', category: 'Antidiabetic', form: 'Tablet', defaultDosage: '1-0-1 AF', unitPrice: 6 },
    { id: 'm14', name: 'Telmisartan 40mg (Telma 40)', category: 'Antihypertensive', form: 'Tablet', defaultDosage: '1-0-0 BF', unitPrice: 10 },
    { id: 'm15', name: 'Amlodipine 5mg (Amlong 5)', category: 'Antihypertensive', form: 'Tablet', defaultDosage: '1-0-0 OD', unitPrice: 5 },
    { id: 'm16', name: 'Atorvastatin 10mg (Atorva 10)', category: 'Lipid Lowering / Statin', form: 'Tablet', defaultDosage: '0-0-1 HS', unitPrice: 11 },
    { id: 'm17', name: 'Cough Syrup (Ascoril-D / Benadryl)', category: 'Cough Expectorant', form: 'Syrup', defaultDosage: '10ml TDS', unitPrice: 85 },
    { id: 'm18', name: 'ORS Sachet (Electral / Enerzal)', category: 'Rehydration Salts', form: 'Sachet', defaultDosage: '1 in 1L Water', unitPrice: 22 },
    { id: 'm19', name: 'Becosules Z (B-Complex with Zinc)', category: 'Multivitamin', form: 'Capsule', defaultDosage: '1-0-0 AF', unitPrice: 5 },
    { id: 'm20', name: 'Shelcal 500 (Calcium + Vit D3)', category: 'Bone & Calcium Support', form: 'Tablet', defaultDosage: '0-0-1 AF', unitPrice: 9 },
  ],
  allergies: [
    { id: 'al1', name: 'None', category: 'General', severity: 'None' },
    { id: 'al2', name: 'Penicillin', category: 'Drug Allergy', severity: 'Severe' },
    { id: 'al3', name: 'Sulfa Drugs', category: 'Drug Allergy', severity: 'Moderate' },
    { id: 'al4', name: 'Aspirin / NSAIDs', category: 'Drug Allergy', severity: 'Moderate' },
    { id: 'al5', name: 'Dust / Pollen', category: 'Environmental', severity: 'Mild' },
    { id: 'al6', name: 'Peanuts / Nuts', category: 'Food Allergy', severity: 'Severe' },
    { id: 'al7', name: 'Iodine / Contrast Media', category: 'Drug Allergy', severity: 'Severe' },
    { id: 'al8', name: 'Lactose / Dairy', category: 'Food Intolerance', severity: 'Mild' },
    { id: 'al9', name: 'Latex / Rubber', category: 'Contact Allergy', severity: 'Moderate' },
  ],
  relations: [
    { id: 'r1', name: 'Head', category: 'Primary', description: 'Head of Family' },
    { id: 'r2', name: 'Wife', category: 'Spouse', description: 'Wife of Head' },
    { id: 'r3', name: 'Husband', category: 'Spouse', description: 'Husband of Head' },
    { id: 'r4', name: 'Son', category: 'Child', description: 'Son of Head' },
    { id: 'r5', name: 'Daughter', category: 'Child', description: 'Daughter of Head' },
    { id: 'r6', name: 'Father', category: 'Parent', description: 'Father of Head' },
    { id: 'r7', name: 'Mother', category: 'Parent', description: 'Mother of Head' },
    { id: 'r8', name: 'Brother', category: 'Sibling', description: 'Brother of Head' },
    { id: 'r9', name: 'Sister', category: 'Sibling', description: 'Sister of Head' },
    { id: 'r10', name: 'Grandfather', category: 'Grandparent', description: 'Grandfather of Head' },
    { id: 'r11', name: 'Grandmother', category: 'Grandparent', description: 'Grandmother of Head' },
    { id: 'r12', name: 'Daughter-in-Law', category: 'In-Law', description: 'Daughter-in-Law of Head' },
    { id: 'r13', name: 'Son-in-Law', category: 'In-Law', description: 'Son-in-Law of Head' },
    { id: 'r14', name: 'Other', category: 'Other', description: 'Other Relation' },
  ],
  areas: [
    { id: 'a1', name: 'Main Road', city: 'Ahmedabad', pincode: '380001' },
    { id: 'a2', name: 'Vastrapur', city: 'Ahmedabad', pincode: '380015' },
    { id: 'a3', name: 'Satellite', city: 'Ahmedabad', pincode: '380015' },
    { id: 'a4', name: 'Navrangpura', city: 'Ahmedabad', pincode: '380009' },
    { id: 'a5', name: 'Bopal', city: 'Ahmedabad', pincode: '380058' },
    { id: 'a6', name: 'Thaltej', city: 'Ahmedabad', pincode: '380059' },
    { id: 'a7', name: 'Bodakdev', city: 'Ahmedabad', pincode: '380054' },
    { id: 'a8', name: 'Maninagar', city: 'Ahmedabad', pincode: '380008' },
    { id: 'a9', name: 'Naranpura', city: 'Ahmedabad', pincode: '380013' },
    { id: 'a10', name: 'Paldi', city: 'Ahmedabad', pincode: '380007' },
    { id: 'a11', name: 'Gota', city: 'Ahmedabad', pincode: '380060' },
    { id: 'a12', name: 'Amroli', city: 'Surat', pincode: '394107' },
  ],
  societies: [
    { id: 's1', name: 'Shanti Niketan Apt', area: 'Vastrapur' },
    { id: 's2', name: 'Gokuldham Society', area: 'Navrangpura' },
    { id: 's3', name: 'Surya Kiran Heights', area: 'Satellite' },
    { id: 's4', name: 'Parijat Residency', area: 'Bopal' },
    { id: 's5', name: 'Royal Residency', area: 'Thaltej' },
    { id: 's6', name: 'Shiv Sagar Appt', area: 'Bodakdev' },
    { id: 's7', name: 'Radhe Shyam Complex', area: 'Maninagar' },
    { id: 's8', name: 'Tulsi Row House', area: 'Gota' },
    { id: 's9', name: 'Mahavir Heights', area: 'Amroli' },
  ],
  navigation: [
    { id: 'sc1', key: 'F1', target: 'family', title: 'Family Head Registration', category: 'Navigation' },
    { id: 'sc2', key: 'F2', target: 'patient', title: 'Add Family Member', category: 'Navigation' },
    { id: 'sc3', key: 'F3', target: 'case', title: 'Patient Record & Case', category: 'Navigation' },
    { id: 'sc4', key: 'F4', target: 'dashboard', title: 'Clinical Dashboard', category: 'Navigation' },
    { id: 'sc5', key: 'F5', target: 'reports', title: 'Clinical Reports', category: 'Navigation' },
    { id: 'sc6', key: 'F6', target: 'certificates', title: 'Medical Certificate', category: 'Navigation' },
    { id: 'sc7', key: 'F7', target: 'masters', title: 'Master Data Setup', category: 'Navigation' },
    { id: 'sc8', key: 'F8', target: 'feedback', title: 'Send Complaint / Feedback', category: 'Support' },
    { id: 'sc9', key: '/', target: 'quick_search', title: 'Quick Global Search', category: 'Action' },
    { id: 'sc10', key: 'Esc', target: 'close_modal', title: 'Close Modal / Unfocus', category: 'Action' },
  ],
};

const DEFAULT_CERT_TEMPLATES = [
  {
    templateName: 'Medical Fitness Certificate',
    title: 'MEDICAL FITNESS CERTIFICATE',
    body: 'This is to certify that {PATIENT_NAME}, aged {AGE}, has been examined by me. The patient has clinically recovered from {DIAGNOSIS} and is now found medically fit in all respects to resume normal daily duties.',
    category: 'Fitness',
    isDefault: true,
  },
  {
    templateName: 'Medical Leave & Rest Certificate',
    title: 'MEDICAL SICK LEAVE CERTIFICATE',
    body: 'This is to certify that {PATIENT_NAME}, aged {AGE}, is suffering from {DIAGNOSIS} and has been under my medical care. The patient is advised complete bed rest and absence from work/studies from {FROM_DATE} to {TO_DATE} ({REST_DAYS} days) for proper recovery.',
    category: 'Leave',
    isDefault: true,
  },
  {
    templateName: 'Medical Examination & Treatment Certificate',
    title: 'CERTIFICATE OF MEDICAL EXAMINATION',
    body: 'This is to certify that {PATIENT_NAME} was medically examined and provided treatment for {DIAGNOSIS} on {TODAY_DATE} at this clinic. The patient has been given necessary medications and medical advice.',
    category: 'General',
    isDefault: true,
  },
  {
    templateName: 'Light Duty / Work Exemption Certificate',
    title: 'MEDICAL EXEMPTION / LIGHT WORK CERTIFICATE',
    body: 'This is to certify that {PATIENT_NAME} is undergoing medical management for {DIAGNOSIS}. The patient is advised to avoid heavy physical exertion, lifting, or prolonged standing from {FROM_DATE} to {TO_DATE}, and is recommended only light duties.',
    category: 'Exemption',
    isDefault: true,
  },
];

async function seed() {
  console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected! Seeding collections for jaydipclinic...');

  // 1. Seed MasterData
  for (const [type, items] of Object.entries(MASTERS_DATA)) {
    const existing = await MasterData.findOne({ type });
    if (!existing || !existing.items || existing.items.length === 0) {
      await MasterData.findOneAndUpdate(
        { type },
        { clinicId: 'shared', type, items },
        { upsert: true, new: true }
      );
      console.log(`✓ Seeded master data category: ${type} (${items.length} items)`);
    } else {
      console.log(`- Master data category "${type}" already has ${existing.items.length} items.`);
    }
  }

  // 2. Seed Certificate Templates
  const tplCount = await CertificateTemplate.countDocuments();
  if (tplCount === 0) {
    await CertificateTemplate.insertMany(DEFAULT_CERT_TEMPLATES.map(t => ({ ...t, clinicId: 'demo' })));
    console.log(`✓ Seeded ${DEFAULT_CERT_TEMPLATES.length} certificate templates.`);
  } else {
    console.log(`- Certificate templates already exist (${tplCount}).`);
  }

  // 3. Seed Demo Certificate
  const certCount = await Certificate.countDocuments();
  if (certCount === 0) {
    await Certificate.create({
      certNo: 'CERT-2026-0001',
      patientId: '101',
      patientName: 'PATEL RAMESHBHAI GOVINDBHAI',
      patientAge: '48',
      patientGender: 'Male',
      diagnosis: 'Acute Viral Pyrexia',
      fromDate: '2026-10-31',
      toDate: '2026-11-04',
      restDays: 5,
      templateName: 'Medical Fitness / Leave',
      customBody: 'This is to certify that PATEL RAMESHBHAI GOVINDBHAI, aged 48 Yrs, has been examined by me. The patient has clinically recovered from Acute Viral Pyrexia and is now found medically fit in all respects to resume normal daily duties.',
      doctorName: 'Dr. Chirag Paghdal',
      clinicId: 'demo',
      issuedDate: '31/10/2026',
      place: 'Ahmedabad',
      status: 'Issued',
    });
    console.log('✓ Seeded sample certificate CERT-2026-0001.');
  }

  // 4. Seed Clinic
  const clinicCount = await Clinic.countDocuments();
  if (clinicCount === 0) {
    await Clinic.create({
      clinicId: 'CLN-001',
      name: 'Jaydip Clinic & Hospital',
      city: 'Ahmedabad',
      doctorsCount: 5,
      status: 'Active',
      services: ['digitalPrescription', 'certificates', 'billing'],
      specialties: 'General Medicine, Pediatrics',
      phone: '9876543210',
      email: 'contact@jaydipclinic.com',
      registration: 'GUJ-MED-2026-001',
      address: '101, Medical Enclave, CG Road, Navrangpura, Ahmedabad, Gujarat - 380009',
      days: 'Monday - Saturday',
      hours: '08:30 AM - 08:30 PM',
    });
    console.log('✓ Seeded default clinic: Jaydip Clinic & Hospital (CLN-001)');
  }

  // 5. Seed Doctor User
  const docUser = await User.findOne({ username: 'dhyey' });
  if (!docUser) {
    await User.create({
      username: 'dhyey',
      password: '123',
      role: 'doctor',
      name: 'Dr. Chirag Paghdal',
      degree: 'B.H.M.S.',
      regNo: 'G-9035',
      clinics: [{ id: 'demo', name: 'Jaydip Clinic & Hospital' }],
      activeClinicId: 'demo',
    });
    console.log('✓ Seeded doctor user (dhyey / 123).');
  }

  // 6. Seed Initial Demo Families if empty
  const famCount = await Family.countDocuments();
  if (famCount === 0) {
    await Family.create({
      famId: '1',
      headName: 'PATEL RAMESHBHAI GOVINDBHAI',
      society: 'Shanti Niketan Apt',
      registeredBy: 'Self',
      area: 'Vastrapur',
      phone: '9876543210',
      year: 2026,
      sequence: 1,
      clinicId: 'demo',
    });

    await Patient.create([
      {
        patId: '101',
        familyId: '1',
        name: 'PATEL RAMESHBHAI GOVINDBHAI',
        relation: 'Head',
        age: '48',
        gender: 'Male',
        bloodGroup: 'B+',
        allergy: 'None',
        society: 'Shanti Niketan Apt',
        area: 'Vastrapur',
        phone: '9876543210',
        clinicId: 'demo',
      },
      {
        patId: '102',
        familyId: '1',
        name: 'PATEL SHARDABEN RAMESHBHAI',
        relation: 'Wife',
        age: '43',
        gender: 'Female',
        bloodGroup: 'B+',
        allergy: 'Penicillin',
        society: 'Shanti Niketan Apt',
        area: 'Vastrapur',
        phone: '9876543210',
        clinicId: 'demo',
      }
    ]);

    await Consultation.create({
      caseId: '10101',
      visitNum: 1,
      patientId: '101',
      familyId: '1',
      clinicId: 'demo',
      date: '2026-10-31',
      time: '09:30 AM',
      weight: '74',
      bp: '130/85',
      sugar: '110',
      pulse: '76',
      reference: 'Self',
      diagnosis: 'Acute Viral Pyrexia',
      complaint: 'High fever, body chills and shivering for 2 days',
      treatment: [
        { name: 'Clinical Consultation', qty: 1, cost: 300 },
        { name: 'Injection Paracetamol IM', qty: 1, cost: 300 },
      ],
      prescription: [{ name: 'Paracetamol 650mg', qty: '10', mor: '1', noon: '1', eve: '1', ngt: '0', timing: 'AF' }],
      charge: 600,
      received: 600,
      due: 0,
    });

    console.log('✓ Seeded initial Family 1, Patients (101, 102), and Case 10101.');
  }

  console.log('\nAll seed operations completed successfully on jaydipclinic!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
