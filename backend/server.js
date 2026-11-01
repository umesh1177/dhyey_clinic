require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');
const authMiddleware = require('./middleware/authMiddleware');
const { aggregateClinicStats } = require('./services/reportService');
const { getDietaryLibrary } = require('./services/prescriptionService');
const { generateBillNumber } = require('./services/billingService');
const { uid, pad, todayISO, nowTime, makeCaseId } = require('./utils/generateId');

// MongoDB Models
const Clinic = require('./models/Clinic');
const User = require('./models/User');
const Family = require('./models/Family');
const Patient = require('./models/Patient');
const Consultation = require('./models/Consultation');
const FollowUp = require('./models/FollowUp');
const Bill = require('./models/Bill');
const Payment = require('./models/Payment');
const Prescription = require('./models/Prescription');
const Certificate = require('./models/Certificate');
const CertificateTemplate = require('./models/CertificateTemplate');
const Diagnosis = require('./models/Diagnosis');
const Medicine = require('./models/Medicine');
const Inventory = require('./models/Inventory');
const MedicalHistory = require('./models/MedicalHistory');
const MasterData = require('./models/MasterData');
const Feedback = require('./models/Feedback');

const app = express();

// =========================================================
// DEFAULT DATA CONSTANTS & UTILITIES
// =========================================================

const DEFAULT_MASTERS = {
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
  ],
  allergies: [
    { id: 'al1', name: 'None', category: 'General', severity: 'None' },
    { id: 'al2', name: 'Penicillin', category: 'Drug Allergy', severity: 'Severe' },
    { id: 'al3', name: 'Sulfa Drugs', category: 'Drug Allergy', severity: 'Moderate' },
    { id: 'al4', name: 'Aspirin / NSAIDs', category: 'Drug Allergy', severity: 'Moderate' },
    { id: 'al5', name: 'Dust / Pollen', category: 'Environmental', severity: 'Mild' },
    { id: 'al6', name: 'Peanuts / Nuts', category: 'Food Allergy', severity: 'Severe' },
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
    { id: 'r10', name: 'Other', category: 'Other', description: 'Other Relation' },
  ],
  areas: [
    { id: 'a1', name: 'Main Road', city: 'Ahmedabad', pincode: '380001' },
    { id: 'a2', name: 'Vastrapur', city: 'Ahmedabad', pincode: '380015' },
    { id: 'a3', name: 'Satellite', city: 'Ahmedabad', pincode: '380015' },
    { id: 'a4', name: 'Navrangpura', city: 'Ahmedabad', pincode: '380009' },
    { id: 'a5', name: 'Bopal', city: 'Ahmedabad', pincode: '380058' },
    { id: 'a6', name: 'Thaltej', city: 'Ahmedabad', pincode: '380059' },
  ],
  societies: [
    { id: 's1', name: 'Shanti Niketan Apt', area: 'Vastrapur' },
    { id: 's2', name: 'Gokuldham Society', area: 'Navrangpura' },
    { id: 's3', name: 'Surya Kiran Heights', area: 'Satellite' },
    { id: 's4', name: 'Parijat Residency', area: 'Bopal' },
    { id: 's5', name: 'Royal Residency', area: 'Thaltej' },
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
    { id: 'sc10', key: 'Esc', target: 'close_modal', title: 'Close Modal / Unfocus', category: 'Action' },
  ],
  clinicShortcuts: {
    medicines: {},
    complaints: {},
    investigations: {},
    allergies: {},
    relations: {},
    areas: {},
    societies: {},
  },
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
    title: 'MEDICAL SICKNESS & LEAVE CERTIFICATE',
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

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      username: user.username,
      role: 'doctor',
      activeClinicId: user.activeClinicId || 'demo',
      name: user.name || user.username,
    },
    process.env.JWT_SECRET || 'wad_clinic_super_secure_jwt_token_2026_key',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// =========================================================
// DATABASE SEEDING
// =========================================================

const seedDemoData = async () => {
  try {
    const curDate = todayISO();

    const clinicCount = await Clinic.countDocuments();
    if (clinicCount === 0) {
      console.log('[Database Seeding]: Seeding default clinics to MongoDB...');
      await Clinic.insertMany([
        {
          clinicId: 'CLN-001',
          name: 'Dhyey Main Clinic',
          city: 'Ahmedabad',
          doctorsCount: 12,
          status: 'Active',
          services: ['digitalPrescription', 'certificates', 'billing'],
          specialties: 'General Medicine, Cardiology, Pediatrics',
          facilities: 'Pharmacy, Pathology Lab, ECG, Emergency Care',
          phone: '9876543210',
          email: 'contact@dhyeyclinic.com',
          registration: 'GUJ-MED-2026-001',
          address: '101, Medical Enclave, CG Road, Navrangpura, Ahmedabad, Gujarat - 380009',
          days: 'Monday - Saturday',
          hours: '08:30 AM - 08:30 PM',
          verifiedDocuments: 13,
        },
        {
          clinicId: 'CLN-002',
          name: 'Satellite Wellness Centre',
          city: 'Ahmedabad',
          doctorsCount: 7,
          status: 'Active',
          services: ['digitalPrescription', 'billing'],
          specialties: 'Dermatology, Cosmetology, Trichology',
          facilities: 'Laser Suite, Minor Procedure Room',
          phone: '9876543222',
          email: 'help@satelliteclinic.com',
          registration: 'GUJ-MED-2026-002',
          address: '304, Titanium City Centre, Anandnagar Road, Satellite, Ahmedabad, Gujarat - 380015',
          days: 'Monday - Saturday',
          hours: '09:00 AM - 08:00 PM',
          verifiedDocuments: 8,
        },
      ]);
    }

    const doctorUser = await User.findOne({ username: 'dhyey' });
    if (!doctorUser) {
      console.log('[Database Seeding]: Seeding default doctor user (dhyey / 123)...');
      await new User({
        username: 'dhyey',
        password: '123',
        role: 'doctor',
        name: 'Dr. Chirag Paghdal',
        degree: 'B.H.M.S.',
        regNo: 'G-9035',
        clinics: [
          { id: 'CLN-001', name: 'Dhyey Main Clinic', address: '101, Medical Enclave, CG Road, Ahmedabad', phone: '9876543210' },
          { id: 'CLN-002', name: 'Satellite Wellness Centre', address: '304, Titanium City Centre, Satellite, Ahmedabad', phone: '9876543222' },
        ],
        activeClinicId: 'CLN-001',
      }).save();
    }

    const famCount = await Family.countDocuments({ clinicId: 'demo' });
    if (famCount < 3) {
      console.log('[Database Seeding]: Seeding initial rich clinic demo dataset to MongoDB...');
      await Family.deleteMany({ clinicId: 'demo' });
      await Patient.deleteMany({ clinicId: 'demo' });
      await Consultation.deleteMany({ clinicId: 'demo' });
      await FollowUp.deleteMany({ clinicId: 'demo' });
      await Bill.deleteMany({ clinicId: 'demo' });

      // Family 1
      await new Family({
        famId: '000120260001',
        headName: 'PATEL RAMESHBHAI GOVINDBHAI',
        society: 'Shanti Niketan Apt',
        registeredBy: 'Self',
        area: 'VASTRAPUR',
        phone: '9876543210',
        year: 2026,
        sequence: 1,
        clinicId: 'demo',
      }).save();

      await new Patient({
        patId: '00010001',
        familyId: '000120260001',
        name: 'PATEL RAMESHBHAI GOVINDBHAI',
        relation: 'Head',
        age: '48',
        bloodGroup: 'B+',
        allergy: 'None',
        society: 'Shanti Niketan Apt',
        area: 'VASTRAPUR',
        phone: '9876543210',
        clinicId: 'demo',
      }).save();

      await new Patient({
        patId: '00010002',
        familyId: '000120260001',
        name: 'PATEL SHARDABEN RAMESHBHAI',
        relation: 'Wife',
        age: '43',
        bloodGroup: 'B+',
        allergy: 'Penicillin',
        society: 'Shanti Niketan Apt',
        area: 'VASTRAPUR',
        phone: '9876543210',
        clinicId: 'demo',
      }).save();

      await new Patient({
        patId: '00010003',
        familyId: '000120260001',
        name: 'PATEL DHRUVIL RAMESHBHAI',
        relation: 'Son',
        age: '19',
        bloodGroup: 'O+',
        allergy: 'None',
        society: 'Shanti Niketan Apt',
        area: 'VASTRAPUR',
        phone: '9876543210',
        clinicId: 'demo',
      }).save();

      await new Consultation({
        caseId: '00012026000101',
        visitNum: 1,
        patientId: '00010001',
        familyId: '000120260001',
        clinicId: 'demo',
        date: curDate,
        time: '09:30 AM',
        weight: '74',
        bp: '130/85',
        sugar: '110',
        pulse: '76',
        reference: 'Dr. Shah',
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
      }).save();

      // Family 2
      await new Family({
        famId: '000120260002',
        headName: 'SHARMA AMITBHAI DINESHBHAI',
        society: 'Gokuldham Society',
        registeredBy: 'Self',
        area: 'NAVRANGPURA',
        phone: '9876543211',
        year: 2026,
        sequence: 2,
        clinicId: 'demo',
      }).save();

      await new Patient({
        patId: '00020001',
        familyId: '000120260002',
        name: 'SHARMA AMITBHAI DINESHBHAI',
        relation: 'Head',
        age: '50',
        bloodGroup: 'A+',
        allergy: 'None',
        society: 'Gokuldham Society',
        area: 'NAVRANGPURA',
        phone: '9876543211',
        clinicId: 'demo',
      }).save();

      await new Patient({
        patId: '00020002',
        familyId: '000120260002',
        name: 'SHARMA PRIYABEN AMITBHAI',
        relation: 'Wife',
        age: '47',
        bloodGroup: 'A+',
        allergy: 'Sulfa Drugs',
        society: 'Gokuldham Society',
        area: 'NAVRANGPURA',
        phone: '9876543211',
        clinicId: 'demo',
      }).save();

      await new Consultation({
        caseId: '00012026000201',
        visitNum: 1,
        patientId: '00020002',
        familyId: '000120260002',
        clinicId: 'demo',
        date: curDate,
        time: '10:15 AM',
        weight: '58',
        bp: '118/78',
        pulse: '72',
        reference: 'Self',
        diagnosis: 'Acute Upper Respiratory Tract Infection (URTI)',
        complaint: 'Severe sore throat, dry painful cough and mild fever',
        treatment: [{ name: 'Consultation & Throat Examination', qty: 1, cost: 500 }],
        prescription: [{ name: 'Amoxicillin 500mg', qty: '10', mor: '1', noon: '0', eve: '1', ngt: '0', timing: 'AF' }],
        charge: 500,
        received: 500,
        due: 0,
      }).save();

      // Family 3
      await new Family({
        famId: '000120260003',
        headName: 'DESAI BHUPENDRABHAI KANTILAL',
        society: 'Surya Kiran Heights',
        registeredBy: 'Self',
        area: 'SATELLITE',
        phone: '9876543212',
        year: 2026,
        sequence: 3,
        clinicId: 'demo',
      }).save();

      await new Patient({
        patId: '00030001',
        familyId: '000120260003',
        name: 'DESAI BHUPENDRABHAI KANTILAL',
        relation: 'Head',
        age: '58',
        bloodGroup: 'B+',
        allergy: 'None',
        society: 'Surya Kiran Heights',
        area: 'SATELLITE',
        phone: '9876543212',
        clinicId: 'demo',
      }).save();

      await new Patient({
        patId: '00030003',
        familyId: '000120260003',
        name: 'DESAI KANTABEN KANTILAL',
        relation: 'Mother',
        age: '82',
        bloodGroup: 'O+',
        allergy: 'Aspirin / NSAIDs',
        society: 'Surya Kiran Heights',
        area: 'SATELLITE',
        phone: '9876543212',
        clinicId: 'demo',
      }).save();

      await new Consultation({
        caseId: '00012026000301',
        visitNum: 1,
        patientId: '00030001',
        familyId: '000120260003',
        clinicId: 'demo',
        date: curDate,
        time: '11:00 AM',
        weight: '82',
        bp: '142/92',
        sugar: '138',
        pulse: '80',
        reference: 'Dr. Mehta',
        diagnosis: 'Chronic Gastritis & Mild Hypertension',
        complaint: 'Chest burning after spicy meals, chronic acidity and belching',
        treatment: [{ name: 'Clinical Consultation', qty: 1, cost: 500 }],
        prescription: [{ name: 'Pantoprazole 40mg', qty: '15', mor: '1', noon: '0', eve: '0', ngt: '0', timing: 'BF' }],
        charge: 500,
        received: 250,
        due: 250,
      }).save();

      // Seed FollowUps
      await FollowUp.insertMany([
        { patientId: '00010001', patientName: 'PATEL RAMESHBHAI GOVINDBHAI', followUpDate: curDate, reason: 'Platelet Count & Dengue Serology Recheck', status: 'Pending', clinicId: 'demo' },
        { patientId: '00030001', patientName: 'DESAI BHUPENDRABHAI KANTILAL', followUpDate: curDate, reason: 'Endoscopy & H. Pylori Report Review', status: 'Pending', clinicId: 'demo' },
        { patientId: '00030003', patientName: 'DESAI KANTABEN KANTILAL', followUpDate: '2026-10-04', reason: 'Bilateral Knee Joint Pain Follow-up', status: 'Pending', clinicId: 'demo' },
      ]);

      // Seed Bills
      await Bill.insertMany([
        { billNo: 'INV-2026-001', billDate: curDate, patientId: '00010001', patientName: 'PATEL RAMESHBHAI GOVINDBHAI', totalCharge: 600, netAmount: 600, paidAmount: 600, dueAmount: 0, status: 'Paid', clinicId: 'demo' },
        { billNo: 'INV-2026-002', billDate: curDate, patientId: '00020002', patientName: 'SHARMA PRIYABEN AMITBHAI', totalCharge: 500, netAmount: 500, paidAmount: 500, dueAmount: 0, status: 'Paid', clinicId: 'demo' },
        { billNo: 'INV-2026-003', billDate: curDate, patientId: '00030001', patientName: 'DESAI BHUPENDRABHAI KANTILAL', totalCharge: 500, netAmount: 500, paidAmount: 250, dueAmount: 250, status: 'Partial', clinicId: 'demo' },
      ]);

      console.log('[Database Seeding]: Rich demo dataset seeded successfully to MongoDB.');
    // Seed MasterData in seedDemoData
    const masterTypes = ['dietary', 'complaints', 'investigations', 'areas', 'medicines', 'allergies', 'relations', 'societies', 'navigation'];
    for (const t of masterTypes) {
      const existing = await MasterData.findOne({ type: t });
      if (!existing || !existing.items || existing.items.length === 0) {
        const items = DEFAULT_MASTERS[t] || (t === 'navigation' ? DEFAULT_MASTERS.customShortcuts : []);
        if (items && items.length > 0) {
          await MasterData.findOneAndUpdate(
            { type: t },
            { clinicId: 'shared', type: t, items },
            { upsert: true, new: true }
          );
        }
      }
    }

    const tplCount = await CertificateTemplate.countDocuments();
    if (tplCount === 0) {
      await CertificateTemplate.insertMany(DEFAULT_CERT_TEMPLATES.map(tmpl => ({ ...tmpl, clinicId: 'demo' })));
    }

    }
  } catch (err) {
    console.warn('[Database Seeding Warning]:', err.message);
  }
};

connectDB().then(() => {
  seedDemoData();
});

// =========================================================
// MIDDLEWARE CONFIGURATION
// =========================================================

const corsOptions = {
  origin: true,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static frontend assets (support both React Vite dist/ and fallback)
const frontendDist = path.join(__dirname, '../frontend/dist');
const frontendStatic = fs.existsSync(frontendDist) ? frontendDist : path.join(__dirname, '../frontend');
app.use(express.static(frontendStatic));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Doctor Clinic Management System API',
    database: 'MongoDB Local (127.0.0.1:27017)',
  });
});

// =========================================================
// 1. AUTHENTICATION API ENDPOINTS
// =========================================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password' });
    }

    if (username.trim().toLowerCase() === 'dhyey' && password === '123') {
      const demoDoctor = {
        id: 'demo',
        username: 'dhyey',
        role: 'doctor',
        name: 'Dr. Chirag Paghdal',
        degree: 'B.H.M.S.',
        regNo: 'G-9035',
        clinics: [{ id: 'demo', name: 'Dhyey Clinic & Nursing Home' }],
        activeClinicId: 'demo',
      };
      const token = generateToken(demoDoctor);
      return res.json({ success: true, token, user: demoDoctor });
    }

    let user = await User.findOne({ username: username.trim() });
    if (user) {
      const isMatch = (user.password === password) || (await bcrypt.compare(password, user.password).catch(() => false));
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }

      const token = generateToken(user);
      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          role: 'doctor',
          name: user.name || `Dr. ${user.username}`,
          degree: user.degree,
          regNo: user.regNo,
          clinics: user.clinics || [{ id: 'demo', name: 'Default Clinic' }],
          activeClinicId: user.activeClinicId || 'demo',
        },
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/register-doctor
app.post('/api/auth/register-doctor', async (req, res) => {
  try {
    const { username, password, clinicName, name, degree, regNo } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const clinicId = uid();
    const newUser = new User({
      username: username.trim(),
      password,
      role: 'doctor',
      name: name || `Dr. ${username.trim()}`,
      degree: degree || 'M.B.B.S.',
      regNo: regNo || 'REG-' + Math.floor(1000 + Math.random() * 9000),
      clinics: [{ id: clinicId, name: (clinicName && clinicName.trim()) || 'My Clinic' }],
      activeClinicId: clinicId,
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Doctor account created successfully',
      doctor: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        clinics: newUser.clinics,
        activeClinicId: newUser.activeClinicId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/switch-clinic
app.post('/api/auth/switch-clinic', authMiddleware, async (req, res) => {
  try {
    const { clinicId } = req.body;
    const userId = req.user.id;

    if (userId !== 'demo') {
      await User.findByIdAndUpdate(userId, { activeClinicId: clinicId });
    }

    res.json({ success: true, message: 'Active clinic updated', activeClinicId: clinicId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/add-clinic
app.post('/api/auth/add-clinic', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Clinic name is required' });
    }

    const newClinic = { id: uid(), name: name.trim() };

    if (userId !== 'demo') {
      const user = await User.findById(userId);
      if (user) {
        user.clinics.push(newClinic);
        user.activeClinicId = newClinic.id;
        await user.save();
      }
    }

    res.json({ success: true, clinic: newClinic });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 2. CLINICS API ENDPOINTS
// =========================================================

app.get(['/api/clinics', '/api/clinic'], async (req, res) => {
  try {
    let clinics = await Clinic.find().sort({ createdAt: -1 });
    const results = await Promise.all(
      clinics.map(async (c) => {
        const cObj = c.toObject();
        const cid = c.clinicId;
        const patientCount = await Patient.countDocuments({ clinicId: cid });
        const visitCount = await Consultation.countDocuments({ clinicId: cid });
        const doctorCount = await User.countDocuments({ role: 'doctor', $or: [{ activeClinicId: cid }, { 'clinics.id': cid }] });

        return {
          ...cObj,
          id: c.clinicId,
          patients: patientCount,
          visits: visitCount,
          doctors: doctorCount || c.doctorsCount || 1,
        };
      })
    );
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/clinic/info', authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || req.query.clinicId || 'demo';
    const clinicDoc = await Clinic.findOne({
      $or: [{ clinicId }, { clinicId: 'CLN-001' }],
    }).lean();

    const clinicInfo = {
      id: clinicDoc?.clinicId || clinicId,
      name: clinicDoc?.name || 'Dhyey Clinic & Nursing Home',
      address: clinicDoc?.address || '101, Medical Enclave, CG Road, Navrangpura, Ahmedabad',
      phone: clinicDoc?.phone || '9876543210',
      city: clinicDoc?.city || 'Ahmedabad',
      services: clinicDoc?.services || ['digitalPrescription', 'certificates', 'billing'],
    };
    res.json({ success: true, data: clinicInfo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/clinics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clinic = await Clinic.findOne({ clinicId: id });
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    const cObj = clinic.toObject();
    cObj.id = clinic.clinicId;
    res.json({ success: true, data: cObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/clinics', '/api/clinic'], authMiddleware, async (req, res) => {
  try {
    const data = req.body || {};
    const count = await Clinic.countDocuments();
    const clinicId = data.clinicId || data.id || `CLN-${String(count + 1).padStart(3, '0')}`;

    const newClinic = new Clinic({
      clinicId,
      name: data.name,
      city: data.city || 'Ahmedabad',
      phone: data.phone || '',
      email: data.email || '',
      registration: data.registration || '',
      address: data.address || '',
      days: data.days || 'Monday - Saturday',
      hours: data.hours || '09:00 AM - 08:00 PM',
      specialties: data.specialties || 'General Medicine',
      facilities: data.facilities || 'OPD, Pharmacy',
      status: data.status || 'Active',
      services: data.services || ['digitalPrescription', 'certificates', 'billing'],
      doctorsCount: Number(data.doctorsCount || 1),
    });

    await newClinic.save();
    const cObj = newClinic.toObject();
    cObj.id = newClinic.clinicId;
    res.status(201).json({ success: true, message: 'Clinic created successfully', data: cObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put(['/api/clinics/:id', '/api/clinic/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body || {};
    delete updateData._id;
    delete updateData.clinicId;

    const clinic = await Clinic.findOneAndUpdate({ clinicId: id }, updateData, { new: true });
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    const cObj = clinic.toObject();
    cObj.id = clinic.clinicId;
    res.json({ success: true, message: 'Clinic updated successfully', data: cObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch(['/api/clinics/:id/services', '/api/clinic/:id/services'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { services } = req.body;
    if (!Array.isArray(services)) {
      return res.status(400).json({ success: false, message: 'Services array is required' });
    }

    const clinic = await Clinic.findOneAndUpdate({ clinicId: id }, { services }, { new: true });
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    res.json({ success: true, message: 'Clinic services updated', data: clinic });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete(['/api/clinics/:id', '/api/clinic/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Clinic.findOneAndDelete({ clinicId: id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    res.json({ success: true, message: `Clinic ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 3. FAMILIES API ENDPOINTS
// =========================================================

app.get(['/api/families', '/api/family'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const families = await Family.find({ clinicId }).sort({ createdAt: -1 });
    const patients = await Patient.find({ clinicId });
    const consultations = await Consultation.find({ clinicId }).sort({ date: 1, time: 1 });

    const result = families.map((fam) => {
      const famObj = fam.toObject();
      famObj.patients = {};
      patients
        .filter((p) => p.familyId === fam.famId)
        .forEach((p) => {
          const pObj = p.toObject();
          pObj.visits = consultations.filter((c) => c.patientId === p.patId);
          famObj.patients[p.patId] = pObj;
        });
      return famObj;
    });

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/families/:id', '/api/family/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    let family = await Family.findOne({ famId: id, clinicId });
    if (!family) {
      family = await Family.findOne({ famId: id });
    }
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    const patients = await Patient.find({ familyId: id });
    const consultations = await Consultation.find({ familyId: id }).sort({ date: -1, time: -1 });

    const famObj = family.toObject();
    famObj.patients = {};
    patients.forEach((p) => {
      const pObj = p.toObject();
      pObj.visits = consultations.filter((c) => c.patientId === p.patId);
      famObj.patients[p.patId] = pObj;
    });

    res.json({ success: true, data: famObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/families', '/api/family'], authMiddleware, async (req, res) => {
  try {
    const { headName, age, bloodGroup, society, registeredBy, allergy, area, phone, famId: customFamId } = req.body;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    if (!headName || !headName.trim()) {
      return res.status(400).json({ success: false, message: 'Family head name is required' });
    }

    const currentYear = new Date().getFullYear();
    const cleanClinicCode = (clinicId === 'demo' ? '0001' : (String(clinicId).replace(/\D/g, '') || String(clinicId).toUpperCase().replace(/[^A-Z0-9]/g, '')).padStart(4, '0').slice(-4)) || '0001';

    const allFam = await Family.find({}, { sequence: 1, famId: 1 });
    const maxSeq = allFam.reduce((max, f) => {
      const s = Number(f.sequence || f.famId || 0);
      return !isNaN(s) && s > max ? s : max;
    }, 0);
    const sequence = maxSeq + 1;
    const nextFamId = customFamId ? String(customFamId).trim() : String(sequence);
    const nextPatId = `${nextFamId}01`;

    const newFamily = new Family({
      famId: nextFamId,
      headName: headName.trim().toUpperCase(),
      society: (society || '').trim(),
      registeredBy: registeredBy || 'Self',
      area: (area || '').trim(),
      phone: (phone || '').trim(),
      year: currentYear,
      sequence,
      clinicId,
    });
    await newFamily.save();

    const newPatient = new Patient({
      patId: nextPatId,
      familyId: nextFamId,
      name: headName.trim().toUpperCase(),
      relation: 'Head',
      age: age ? String(age).trim() : '',
      bloodGroup: (bloodGroup || '').trim(),
      allergy: (allergy || '').trim(),
      society: (society || '').trim(),
      area: (area || '').trim(),
      phone: (phone || '').trim(),
      clinicId,
    });
    await newPatient.save();

    res.status(201).json({
      success: true,
      message: `Family ID ${nextFamId} generated, patient ${nextPatId} added`,
      data: {
        family: newFamily,
        headPatient: newPatient,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put(['/api/families/:id', '/api/family/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { headName, age, bloodGroup, society, registeredBy, allergy, area, phone } = req.body;

    const updated = await Family.findOneAndUpdate(
      { famId: id, clinicId },
      {
        ...(headName && { headName: headName.trim().toUpperCase() }),
        ...(society !== undefined && { society: society.trim() }),
        ...(registeredBy !== undefined && { registeredBy }),
        ...(area !== undefined && { area: area.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    const headPatient = await Patient.findOneAndUpdate(
      { familyId: id, relation: 'Head', clinicId },
      {
        ...(headName && { name: headName.trim().toUpperCase() }),
        ...(age !== undefined && { age: String(age).trim() }),
        ...(bloodGroup !== undefined && { bloodGroup: bloodGroup.trim() }),
        ...(allergy !== undefined && { allergy: allergy.trim() }),
        ...(society !== undefined && { society: society.trim() }),
        ...(area !== undefined && { area: area.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Family head details updated successfully',
      data: {
        family: updated,
        headPatient,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete(['/api/families/:id', '/api/family/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    await Family.findOneAndDelete({ famId: id, clinicId });
    await Patient.deleteMany({ familyId: id, clinicId });
    await Consultation.deleteMany({ familyId: id, clinicId });

    res.json({ success: true, message: `Family ${id} and associated records deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 4. PATIENTS API ENDPOINTS
// =========================================================

app.get(['/api/patients', '/api/patient'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const patients = await Patient.find({ clinicId }).sort({ patId: 1 });
    const families = await Family.find({ clinicId });
    const consultations = await Consultation.find({ clinicId });

    const famMap = {};
    families.forEach((f) => { famMap[f.famId] = f; });

    const result = patients.map((pat) => {
      const patVisits = consultations.filter((c) => c.patientId === pat.patId);
      const totalDue = patVisits.reduce((acc, v) => acc + (Number(v.due) || 0), 0);
      const lastVisit = patVisits.length > 0 ? patVisits[patVisits.length - 1] : null;

      return {
        ...pat.toObject(),
        family: famMap[pat.familyId] || null,
        visits: patVisits,
        totalDue,
        lastVisit,
      };
    });

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/patients/:id', '/api/patient/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    const patient = await Patient.findOne({ patId: id, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const family = await Family.findOne({ famId: patient.familyId, clinicId });
    const visits = await Consultation.find({ patientId: id, clinicId }).sort({ createdAt: 1 });
    const totalDue = visits.reduce((acc, v) => acc + (Number(v.due) || 0), 0);

    res.json({
      success: true,
      data: {
        ...patient.toObject(),
        family,
        visits,
        totalDue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/patients', '/api/patient'], authMiddleware, async (req, res) => {
  try {
    const { familyId, name, relation, age, gender, bloodGroup, allergy, society, area, phone } = req.body;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    if (!familyId || !name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Family ID and member name are required' });
    }

    const family = await Family.findOne({ famId: familyId, clinicId });
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    const memberCount = await Patient.countDocuments({ familyId });
    const nextPatId = req.body.patId || `${familyId}${pad(memberCount + 1, 2)}`;

    const newPatient = new Patient({
      patId: nextPatId,
      familyId,
      name: name.trim().toUpperCase(),
      relation: (relation || 'Member').trim(),
      age: (age || '').trim(),
      gender: gender || 'Male',
      bloodGroup: (bloodGroup || '').trim().toUpperCase(),
      allergy: (allergy || '').trim().toUpperCase(),
      society: (society !== undefined ? society : family.society || '').trim(),
      area: (area !== undefined ? area : family.area || '').trim(),
      phone: (phone || family.phone || '').trim(),
      clinicId,
    });

    await newPatient.save();

    res.status(201).json({
      success: true,
      message: `${newPatient.name} added to family ${familyId}`,
      data: newPatient,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put(['/api/patients/:id', '/api/patient/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { name, relation, age, gender, bloodGroup, allergy, phone, society, area, oldName } = req.body;

    const existingPatient = await Patient.findOne({ patId: id, clinicId });
    if (!existingPatient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const prevName = existingPatient.name;
    const prevRelation = existingPatient.relation || '';
    const familyId = existingPatient.familyId;

    const updated = await Patient.findOneAndUpdate(
      { patId: id, clinicId },
      {
        ...(name && { name: name.trim().toUpperCase() }),
        ...(relation !== undefined && { relation: relation.trim() }),
        ...(age !== undefined && { age: String(age).trim() }),
        ...(gender !== undefined && { gender }),
        ...(bloodGroup !== undefined && { bloodGroup: bloodGroup.trim().toUpperCase() }),
        ...(allergy !== undefined && { allergy: allergy.trim().toUpperCase() }),
        ...(society !== undefined && { society: society.trim() }),
        ...(area !== undefined && { area: area.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
      },
      { new: true }
    );

    // Maintain Data Consistency with Families collection:
    // If this patient is Head/Self or matches family headName, keep Family collection in sync!
    const isHead = (prevRelation && (prevRelation.toLowerCase() === 'head' || prevRelation.toLowerCase() === 'self')) ||
                   (relation && (relation.toLowerCase() === 'head' || relation.toLowerCase() === 'self')) ||
                   id === familyId ||
                   id === familyId + '-01' ||
                   id === familyId + '01';

    if (familyId) {
      const familyDoc = await Family.findOne({ famId: familyId, clinicId });
      if (familyDoc) {
        const isFamHeadMatch = isHead ||
          (prevName && familyDoc.headName && familyDoc.headName.toUpperCase() === prevName.toUpperCase()) ||
          (oldName && familyDoc.headName && familyDoc.headName.toUpperCase() === oldName.trim().toUpperCase());

        if (isFamHeadMatch) {
          const famUpdates = {};
          if (name) famUpdates.headName = name.trim().toUpperCase();
          if (phone !== undefined && phone !== '') famUpdates.phone = phone.trim();
          if (society !== undefined && society !== '') famUpdates.society = society.trim();
          if (area !== undefined && area !== '') famUpdates.area = area.trim();

          if (Object.keys(famUpdates).length > 0) {
            await Family.findOneAndUpdate({ famId: familyId, clinicId }, famUpdates);
          }
        }
      }
    }

    res.json({ success: true, message: 'Patient and family consistency updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete(['/api/patients/:id', '/api/patient/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    await Patient.findOneAndDelete({ patId: id, clinicId });
    await Consultation.deleteMany({ patientId: id, clinicId });

    res.json({ success: true, message: `Patient ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 5. CONSULTATIONS API ENDPOINTS
// =========================================================

app.get(['/api/consultations', '/api/consultation'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { patientId, familyId, date } = req.query;

    const query = {};
    if (patientId) {
      query.patientId = patientId;
    } else {
      query.clinicId = clinicId;
    }
    if (familyId) query.familyId = familyId;
    if (date) query.date = date;

    const visits = await Consultation.find(query).sort({ date: -1, time: -1 });
    res.json({ success: true, count: visits.length, data: visits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/consultations', '/api/consultation'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const {
      familyId,
      patientId,
      date,
      time,
      weight,
      bp,
      sugar,
      pulse,
      other,
      otherVitals,
      reference,
      investigation,
      complaint,
      diagnosis,
      dietary,
      treatment,
      prescription,
      charge,
      received,
    } = req.body;

    if (!familyId || !patientId) {
      return res.status(400).json({ success: false, message: 'Family ID and Patient ID are required' });
    }

    let patient = await Patient.findOne({ patId: patientId, clinicId });
    if (!patient) {
      patient = await Patient.findOne({ patId: patientId });
    }
    if (!patient) {
      patient = await Patient.findById(patientId).catch(() => null);
    }
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const actualClinicId = patient.clinicId || clinicId || 'demo';
    const existingVisitsCount = await Consultation.countDocuments({ patientId });
    const visitNum = Number(req.body.visitNum) || existingVisitsCount + 1;
    const caseId = req.body.caseId || makeCaseId(familyId, patientId, visitNum);

    const chargeNum = Number(charge || 0);
    const recNum = Number(received || 0);
    const dueNum = Math.max(0, chargeNum - recNum);

    const newVisit = new Consultation({
      caseId,
      visitNum,
      patientId,
      familyId,
      clinicId: actualClinicId,
      date: date || todayISO(),
      time: time || nowTime(),
      weight: String(weight || '').trim(),
      bp: String(bp || '').trim(),
      sugar: String(sugar || '').trim(),
      pulse: String(pulse || '').trim(),
      other: String(other || otherVitals || '').trim(),
      reference: String(reference || 'Self').trim(),
      investigation: String(investigation || '').trim(),
      complaint: String(complaint || '').trim(),
      diagnosis: String(diagnosis || '').trim(),
      dietary: String(dietary || '').trim(),
      labReport: req.body.labReport || null,
      labReportFile: String(req.body.labReportFile || '').trim(),
      treatment: (treatment || []).filter(t => t && t.name && String(t.name).trim()),
      prescription: (prescription || []).filter(p => p && p.name && String(p.name).trim()),
      charge: chargeNum,
      received: recNum,
      due: dueNum,
    });

    await newVisit.save();

    if (prescription && prescription.length > 0) {
      const newRx = new Prescription({
        caseId,
        patientId,
        familyId,
        clinicId,
        doctorId: req.user?.id || 'demo',
        medicines: prescription,
      });
      await newRx.save();
    }

    if (chargeNum > 0) {
      const newBill = new Bill({
        billNo: `INV-${caseId}`,
        caseId,
        patientId,
        patientName: patient.name,
        familyId,
        clinicId,
        totalCharge: chargeNum,
        netAmount: chargeNum,
        paidAmount: recNum,
        dueAmount: dueNum,
        status: dueNum === 0 ? 'Paid' : recNum > 0 ? 'Partial' : 'Due',
        billDate: date || todayISO(),
        items: (treatment || []).map((t) => ({
          description: t.name,
          qty: Number(t.qty) || 1,
          rate: Number(t.cost) || chargeNum,
          amount: Number(t.cost) || chargeNum,
        })),
      });
      await newBill.save();
    }

    if (recNum > 0) {
      const newPayment = new Payment({
        receiptNo: `REC-${caseId}`,
        caseId,
        patientId,
        patientName: patient.name,
        familyId,
        clinicId,
        amount: recNum,
        paymentMethod: 'Cash',
        paymentDate: date || todayISO(),
        remarks: `Consultation Case ${caseId}`,
      });
      await newPayment.save();
    }

    res.status(201).json({
      success: true,
      message: `Visit saved for ${patient.name}! Case ${caseId}`,
      data: newVisit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put(['/api/consultations/:id', '/api/consultation/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    const chargeNum = Number(req.body.charge || 0);
    const recNum = Number(req.body.received || 0);
    const dueNum = Math.max(0, chargeNum - recNum);

    const updateData = {
      ...req.body,
      charge: chargeNum,
      received: recNum,
      due: dueNum,
    };

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { caseId: id }] }
      : { caseId: id };

    const updated = await Consultation.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    res.json({ success: true, message: 'Visit updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete(['/api/consultations/:id', '/api/consultation/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { caseId: id }] }
      : { caseId: id };

    const deleted = await Consultation.findOneAndDelete(query);
    if (deleted && deleted.caseId) {
      await Prescription.deleteMany({ caseId: deleted.caseId });
      await Bill.deleteMany({ caseId: deleted.caseId });
      await Payment.deleteMany({ caseId: deleted.caseId });
    }
    res.json({ success: true, message: 'Visit deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 6. PRESCRIPTIONS API ENDPOINTS
// =========================================================

app.get(['/api/prescriptions', '/api/prescription'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { patientId, caseId } = req.query;

    const query = { clinicId };
    if (patientId) query.patientId = patientId;
    if (caseId) query.caseId = caseId;

    const list = await Prescription.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/prescriptions/dietary', '/api/prescription/dietary'], (req, res) => {
  res.json({ success: true, data: getDietaryLibrary() });
});

app.post(['/api/prescriptions', '/api/prescription'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { caseId, patientId, familyId, medicines, dietaryAdvice, dietaryCodes } = req.body;

    if (!caseId || !patientId) {
      return res.status(400).json({ success: false, message: 'Case ID and Patient ID are required' });
    }

    const rx = await Prescription.findOneAndUpdate(
      { caseId, clinicId },
      {
        caseId,
        patientId,
        familyId,
        clinicId,
        doctorId: req.user?.id || 'demo',
        medicines: medicines || [],
        dietaryAdvice: dietaryAdvice || '',
        dietaryCodes: dietaryCodes || [],
      },
      { new: true, upsert: true }
    );

    res.status(201).json({ success: true, message: 'Prescription saved', data: rx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/prescriptions/print/:caseId', '/api/prescription/print/:caseId'], authMiddleware, async (req, res) => {
  try {
    const { caseId } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    const visit = await Consultation.findOne({ caseId, clinicId });
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    const patient = await Patient.findOne({ patId: visit.patientId, clinicId });
    const doctor = (await User.findById(visit.doctorId)) || { name: 'Dr. Chirag Paghdal', username: 'dhyey' };

    res.json({
      success: true,
      data: {
        visit,
        patient,
        doctor,
        dietaryLibrary: getDietaryLibrary(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 7. MEDICAL CERTIFICATES API ENDPOINTS
// =========================================================

app.get(['/api/certificates', '/api/certificate'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const certs = await Certificate.find({ clinicId }).sort({ createdAt: -1 });
    res.json({ success: true, count: certs.length, data: certs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/certificates', '/api/certificate'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const {
      patientName,
      patientAge,
      patientGender,
      patientId,
      diagnosis,
      fromDate,
      toDate,
      restDays,
      templateId,
      templateName,
      customBody,
      place,
    } = req.body;

    if (!patientName || !diagnosis || !fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'Patient name, diagnosis, and dates are required' });
    }

    const count = await Certificate.countDocuments({ clinicId });
    const year = new Date().getFullYear();
    let certNo = `CERT-${year}-${pad(count + 1, 4)}`;

    let exists = await Certificate.findOne({ certNo, clinicId });
    let seq = count + 1;
    while (exists) {
      seq++;
      certNo = `CERT-${year}-${pad(seq, 4)}`;
      exists = await Certificate.findOne({ certNo, clinicId });
    }

    const newCert = new Certificate({
      certNo,
      patientId: patientId || '',
      patientName: patientName.trim(),
      patientAge: patientAge || '',
      patientGender: patientGender || '',
      diagnosis: diagnosis.trim(),
      fromDate,
      toDate,
      restDays: Number(restDays) || 0,
      templateId: templateId || '',
      templateName: templateName || 'Medical Fitness / Leave',
      customBody: customBody || '',
      clinicId,
      doctorName: req.user?.name || 'Dr. Chirag Paghdal',
      issuedDate: todayISO(),
      place: place || 'Ahmedabad',
      status: 'Issued',
    });

    await newCert.save();
    res.status(201).json({ success: true, message: 'Certificate issued successfully', data: newCert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/certificates/verify/:certNo', '/api/certificate/verify/:certNo'], async (req, res) => {
  try {
    const { certNo } = req.params;
    const cert = await Certificate.findOne({ certNo: certNo.trim() });
    if (!cert) {
      return res.status(404).json({ success: false, message: `No certificate found with ID: ${certNo}`, valid: false });
    }
    res.json({
      success: true,
      valid: true,
      data: cert,
      message: 'Certificate successfully verified as authentic & valid',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete(['/api/certificates/:id', '/api/certificate/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Certificate.findByIdAndDelete(id);
    res.json({ success: true, message: 'Certificate deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/certificates/templates', '/api/certificate/templates'], async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || 'demo';
    const customTemplates = await CertificateTemplate.find({ clinicId }).sort({ createdAt: -1 });
    const allTemplates = [...DEFAULT_CERT_TEMPLATES, ...customTemplates];
    res.json({ success: true, count: allTemplates.length, data: allTemplates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/certificates/templates', '/api/certificate/templates'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { templateName, title, body, category } = req.body;

    if (!templateName || !body) {
      return res.status(400).json({ success: false, message: 'Template name and body text are required' });
    }

    const newTemplate = new CertificateTemplate({
      templateName: templateName.trim(),
      title: title ? title.trim().toUpperCase() : 'MEDICAL CERTIFICATE',
      body: body.trim(),
      category: category || 'Custom',
      clinicId,
      doctorId: req.user?.id || 'demo',
      isDefault: false,
    });

    await newTemplate.save();
    res.status(201).json({ success: true, message: 'Certificate template created', data: newTemplate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete(['/api/certificates/templates/:id', '/api/certificate/templates/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await CertificateTemplate.findByIdAndDelete(id);
    res.json({ success: true, message: 'Certificate template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 8. BILLING & DUES API ENDPOINTS
// =========================================================

app.get(['/api/billing', '/api/bills'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { patientId, status, date } = req.query;

    const query = { clinicId };
    if (patientId) query.patientId = patientId;
    if (status) query.status = status;
    if (date) query.billDate = date;

    const bills = await Bill.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/billing', '/api/bills'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { patientId, caseId, items, totalCharge, discount, paidAmount, billDate } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }

    const patient = await Patient.findOne({ patId: patientId, clinicId });
    const patientName = patient ? patient.name : 'Patient';
    const familyId = patient ? patient.familyId : '';

    const chargeNum = Number(totalCharge || 0);
    const discNum = Number(discount || 0);
    const netAmount = Math.max(0, chargeNum - discNum);
    const paidNum = Number(paidAmount || 0);
    const dueAmount = Math.max(0, netAmount - paidNum);

    const count = await Bill.countDocuments({ clinicId });
    const billNo = generateBillNumber(count + 1);

    const newBill = new Bill({
      billNo,
      caseId: caseId || '',
      patientId,
      patientName,
      familyId,
      doctorId: req.user?.id || 'demo',
      clinicId,
      items: items || [],
      totalCharge: chargeNum,
      discount: discNum,
      netAmount,
      paidAmount: paidNum,
      dueAmount,
      status: dueAmount === 0 ? 'Paid' : paidNum > 0 ? 'Partial' : 'Due',
      billDate: billDate || todayISO(),
    });

    await newBill.save();
    res.status(201).json({ success: true, message: 'Bill generated successfully', data: newBill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/billing/dues', '/api/bills/dues'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const visits = await Consultation.find({ clinicId, due: { $gt: 0 } });
    const patients = await Patient.find({ clinicId });
    const families = await Family.find({ clinicId });

    const famMap = {};
    families.forEach((f) => { famMap[f.famId] = f; });

    const patMap = {};
    patients.forEach((p) => { patMap[p.patId] = p; });

    const patientDues = {};
    visits.forEach((v) => {
      if (!patientDues[v.patientId]) {
        const pat = patMap[v.patientId] || { name: 'Unknown', familyId: v.familyId };
        const fam = famMap[v.familyId] || { headName: 'Unknown' };
        patientDues[v.patientId] = {
          patientId: v.patientId,
          patientName: pat.name,
          familyId: v.familyId,
          familyHead: fam.headName,
          totalDue: 0,
          visitsCount: 0,
          lastVisitDate: v.date,
        };
      }
      patientDues[v.patientId].totalDue += Number(v.due || 0);
      patientDues[v.patientId].visitsCount += 1;
    });

    const duesList = Object.values(patientDues).sort((a, b) => b.totalDue - a.totalDue);
    const grandTotalDue = duesList.reduce((s, d) => s + d.totalDue, 0);

    res.json({
      success: true,
      grandTotalDue,
      count: duesList.length,
      data: duesList,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 9. PAYMENTS API ENDPOINTS
// =========================================================

app.get(['/api/payments', '/api/payment'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { date, patientId } = req.query;

    const query = { clinicId };
    if (date) query.paymentDate = date;
    if (patientId) query.patientId = patientId;

    const payments = await Payment.find(query).sort({ paymentDate: -1, createdAt: -1 });
    const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    res.json({
      success: true,
      count: payments.length,
      totalCollected,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/payments', '/api/payment'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { patientId, caseId, billId, amount, paymentMethod, transactionRef, remarks, paymentDate } = req.body;

    const payAmount = Number(amount || 0);
    if (!patientId || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid patient ID and positive amount are required' });
    }

    const patient = await Patient.findOne({ patId: patientId, clinicId });
    const patientName = patient ? patient.name : 'Patient';
    const familyId = patient ? patient.familyId : '';

    const count = await Payment.countDocuments({ clinicId });
    const receiptNo = `REC-${new Date().getFullYear()}-${pad(count + 1, 5)}`;

    const newPayment = new Payment({
      receiptNo,
      billId: billId || '',
      caseId: caseId || '',
      patientId,
      patientName,
      familyId,
      clinicId,
      amount: payAmount,
      paymentMethod: paymentMethod || 'Cash',
      transactionRef: transactionRef || '',
      paymentDate: paymentDate || todayISO(),
      remarks: remarks || '',
    });

    await newPayment.save();

    if (caseId) {
      const visit = await Consultation.findOne({ caseId, clinicId });
      if (visit) {
        visit.received = (Number(visit.received) || 0) + payAmount;
        visit.due = Math.max(0, (Number(visit.charge) || 0) - visit.received);
        await visit.save();
      }
    }

    res.status(201).json({
      success: true,
      message: `Payment of ₹${payAmount} recorded successfully`,
      data: newPayment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 10. FOLLOW-UPS API ENDPOINTS
// =========================================================

app.get(['/api/followups', '/api/followup'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { date, status, patientId } = req.query;

    const query = { clinicId };
    if (date) query.followUpDate = date;
    if (status) query.status = status;
    if (patientId) query.patientId = patientId;

    const list = await FollowUp.find(query).sort({ followUpDate: 1 });
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/followups', '/api/followup'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { patientId, followUpDate, reason, notes } = req.body;

    if (!patientId || !followUpDate) {
      return res.status(400).json({ success: false, message: 'Patient ID and follow-up date are required' });
    }

    const patient = await Patient.findOne({ patId: patientId, clinicId });
    const patientName = patient ? patient.name : req.body.patientName || 'Patient';
    const familyId = patient ? patient.familyId : '';

    const newFollowUp = new FollowUp({
      patientId,
      patientName,
      familyId,
      clinicId,
      followUpDate,
      reason: reason || 'Review checkup',
      notes: notes || '',
      status: 'Pending',
    });

    await newFollowUp.save();
    res.status(201).json({ success: true, message: 'Follow-up scheduled', data: newFollowUp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put(['/api/followups/:id', '/api/followup/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, followUpDate, notes } = req.body;

    const updated = await FollowUp.findByIdAndUpdate(
      id,
      {
        ...(status && { status }),
        ...(followUpDate && { followUpDate }),
        ...(notes !== undefined && { notes }),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    res.json({ success: true, message: 'Follow-up updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete(['/api/followups/:id', '/api/followup/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await FollowUp.findByIdAndDelete(id);
    res.json({ success: true, message: 'Follow-up deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 11. DIAGNOSIS API ENDPOINTS
// =========================================================

app.get(['/api/diagnoses', '/api/diagnosis'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const diagnoses = await Diagnosis.find({ clinicId }).sort({ name: 1 });
    res.json({ success: true, count: diagnoses.length, data: diagnoses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/diagnoses/analytics', '/api/diagnosis/analytics'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const visits = await Consultation.find({ clinicId });

    const counts = {};
    visits.forEach((v) => {
      if (v.diagnosis && v.diagnosis.trim()) {
        const d = v.diagnosis.trim();
        counts[d] = (counts[d] || 0) + 1;
      }
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data: sorted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/diagnoses', '/api/diagnosis'], authMiddleware, async (req, res) => {
  try {
    const { name, category, description } = req.body;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Diagnosis name is required' });
    }

    const newDiag = new Diagnosis({
      name: name.trim(),
      category: category || 'General',
      description: description || '',
      clinicId,
    });

    await newDiag.save();
    res.status(201).json({ success: true, message: 'Diagnosis added', data: newDiag });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete(['/api/diagnoses/:id', '/api/diagnosis/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Diagnosis.findByIdAndDelete(id);
    res.json({ success: true, message: 'Diagnosis deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 12. MEDICINES API ENDPOINTS
// =========================================================

app.get(['/api/medicines', '/api/medicine'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { search } = req.query;

    let query = { clinicId };
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    let list = await Medicine.find(query).sort({ name: 1 });
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/medicines', '/api/medicine'], authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { name, genericName, category, form, defaultDosage, unitPrice } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Medicine name is required' });
    }

    const newMed = new Medicine({
      name: name.trim(),
      genericName: (genericName || '').trim(),
      category: category || 'General',
      form: form || 'Tablet',
      defaultDosage: defaultDosage || '1-0-1',
      unitPrice: Number(unitPrice || 0),
      clinicId,
    });

    await newMed.save();
    res.status(201).json({ success: true, message: 'Medicine added', data: newMed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put(['/api/medicines/:id', '/api/medicine/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Medicine.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ success: true, message: 'Medicine updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete(['/api/medicines/:id', '/api/medicine/:id'], authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Medicine.findByIdAndDelete(id);
    res.json({ success: true, message: 'Medicine deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 13. INVENTORY API ENDPOINTS
// =========================================================

app.get('/api/inventory', authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const items = await Inventory.find({ clinicId }).sort({ itemName: 1 });
    const lowStockItems = items.filter((i) => i.quantity <= i.reorderLevel);

    res.json({
      success: true,
      count: items.length,
      lowStockCount: lowStockItems.length,
      data: items,
      lowStockItems,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/inventory', authMiddleware, async (req, res) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { itemName, batchNo, quantity, reorderLevel, unitPrice } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ success: false, message: 'Item name is required' });
    }

    const newItem = new Inventory({
      itemName: itemName.trim(),
      batchNo: (batchNo || '').trim(),
      quantity: Number(quantity || 0),
      reorderLevel: Number(reorderLevel || 10),
      unitPrice: Number(unitPrice || 0),
      clinicId,
    });

    await newItem.save();
    res.status(201).json({ success: true, message: 'Stock item added', data: newItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/inventory/:id/stock', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityChange, setQuantity } = req.body;

    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (setQuantity !== undefined) {
      item.quantity = Number(setQuantity);
    } else if (quantityChange !== undefined) {
      item.quantity += Number(quantityChange);
    }

    await item.save();
    res.json({ success: true, message: 'Stock updated', data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/inventory/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Inventory.findByIdAndDelete(id);
    res.json({ success: true, message: 'Stock item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 14. MEDICAL HISTORY API ENDPOINTS
// =========================================================

app.get('/api/history/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    let history = await MedicalHistory.findOne({ patientId });

    if (!history) {
      history = {
        patientId,
        chronicConditions: [],
        allergies: [],
        pastSurgeries: [],
        familyHistory: [],
        ongoingMedications: [],
        notes: '',
      };
    }

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/history/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { chronicConditions, allergies, pastSurgeries, familyHistory, ongoingMedications, notes } = req.body;

    const history = await MedicalHistory.findOneAndUpdate(
      { patientId },
      {
        chronicConditions: chronicConditions || [],
        allergies: allergies || [],
        pastSurgeries: pastSurgeries || [],
        familyHistory: familyHistory || [],
        ongoingMedications: ongoingMedications || [],
        notes: notes || '',
        updatedBy: req.user?.username || 'Doctor',
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Medical history updated', data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/history/timeline/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';

    const patient = await Patient.findOne({ patId: patientId, clinicId });
    const visits = await Consultation.find({ patientId, clinicId }).sort({ date: -1, time: -1 });
    const history = await MedicalHistory.findOne({ patientId });

    res.json({
      success: true,
      data: {
        patient,
        history,
        visits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 15. MASTER DATA API ENDPOINTS
// =========================================================

app.get(['/api/masters/all', '/api/master/all'], async (req, res) => {
  try {
    const types = ['dietary', 'complaints', 'investigations', 'areas', 'medicines', 'allergies', 'relations', 'societies', 'navigation'];
    const result = {};

    for (const t of types) {
      let doc = await MasterData.findOne({ type: t });
      result[t] = doc ? doc.items : [];
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get(['/api/masters/:type', '/api/master/:type'], async (req, res) => {
  try {
    const { type } = req.params;
    let doc = await MasterData.findOne({ type });
    const items = doc ? doc.items : [];
    res.json({ success: true, count: Array.isArray(items) ? items.length : 0, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(['/api/masters/:type', '/api/master/:type'], async (req, res) => {
  try {
    const { type } = req.params;
    let { items, item } = req.body;

    let doc = await MasterData.findOne({ type });
    let existingItems = doc && Array.isArray(doc.items) ? [...doc.items] : [];

    if (Array.isArray(items)) {
      existingItems = items;
    } else if (item) {
      const idx = existingItems.findIndex(i => i.id === item.id);
      if (idx >= 0) existingItems[idx] = item;
      else existingItems.push(item);
    } else if (req.body.name || req.body.code || req.body.eat) {
      const newItem = {
        id: `${type}_${Date.now()}`,
        code: req.body.code ? String(req.body.code).trim().toUpperCase() : undefined,
        name: req.body.name ? String(req.body.name).trim() : (req.body.eat || ''),
        eat: req.body.eat ? String(req.body.eat).trim() : undefined,
        notEat: req.body.notEat ? String(req.body.notEat).trim() : undefined,
        city: req.body.city ? String(req.body.city).trim() : undefined,
        area: req.body.area ? String(req.body.area).trim() : undefined,
        createdAt: new Date().toLocaleDateString('en-GB'),
      };
      existingItems.push(newItem);
    }

    const updated = await MasterData.findOneAndUpdate(
      { type },
      { clinicId: 'shared', type, items: existingItems },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: `Master collection "${type}" saved to MongoDB`, data: updated.items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================
// 16. FEEDBACK & SUPPORT TICKETS API ENDPOINTS
// =========================================================

app.post(['/api/feedback', '/api/support'], authMiddleware, async (req, res, next) => {
  try {
    const { category, categoryLabel, priority, subject, message, metaDetails, doctorName, clinicName } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message description are required' });
    }

    const doctorId = req.user?.id || req.user?._id || 'demo-doc';
    const activeDoctorName = doctorName || req.user?.name || 'Dr. Chirag Paghdal';
    const activeClinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const activeClinicName = clinicName || 'Dhyey Clinic & Hospital';

    const year = new Date().getFullYear();
    const count = await Feedback.countDocuments();
    const ticketNo = `TKT-${year}-${String(count + 1).padStart(4, '0')}`;

    const categoryMap = {
      feature_request: 'Feature Request / Enhancement',
      bug_report: 'Technical Issue / Bug Report',
      general_feedback: 'General Feedback / Support',
    };

    const feedback = new Feedback({
      ticketNo,
      doctorId,
      doctorName: activeDoctorName,
      clinicId: activeClinicId,
      clinicName: activeClinicName,
      category: category || 'general_feedback',
      categoryLabel: categoryLabel || categoryMap[category] || 'General Feedback',
      priority: priority || 'Normal',
      subject: subject.trim(),
      message: message.trim(),
      metaDetails: metaDetails || {},
      status: 'Pending',
      replies: [],
    });

    await feedback.save();

    res.status(201).json({
      success: true,
      message: 'Support request submitted successfully.',
      data: feedback,
    });
  } catch (err) {
    next(err);
  }
});

app.get(['/api/feedback/my-tickets', '/api/support/my-tickets'], authMiddleware, async (req, res, next) => {
  try {
    const doctorId = req.user?.id || req.user?._id;
    const { status, category, search } = req.query;

    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (search) {
      filter.$or = [
        { ticketNo: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const tickets = await Feedback.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (err) {
    next(err);
  }
});

app.get(['/api/feedback/:id', '/api/support/:id'], authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await Feedback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketNo: id }],
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Feedback ticket not found' });
    }

    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
});

app.post(['/api/feedback/:id/reply', '/api/support/:id/reply'], authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, status } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Reply message text is required' });
    }

    const ticket = await Feedback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketNo: id }],
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Feedback ticket not found' });
    }

    const name = req.user?.name || 'Dr. Chirag Paghdal';
    ticket.replies.push({
      senderRole: 'doctor',
      senderName: name,
      message: message.trim(),
      createdAt: new Date(),
    });

    ticket.lastReplyAt = new Date();
    if (status) ticket.status = status;

    await ticket.save();
    res.json({ success: true, message: 'Reply sent successfully', data: ticket });
  } catch (err) {
    next(err);
  }
});

app.patch(['/api/feedback/:id/status', '/api/support/:id/status'], authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const ticket = await Feedback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketNo: id }],
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.status = status;
    await ticket.save();

    res.json({ success: true, message: `Ticket status updated to ${status}`, data: ticket });
  } catch (err) {
    next(err);
  }
});

// =========================================================
// 17. REPORTS & ANALYTICS API ENDPOINT
// =========================================================

app.get('/api/reports/stats', authMiddleware, async (req, res, next) => {
  try {
    const clinicId = req.headers['x-clinic-id'] || req.user?.activeClinicId || 'demo';
    const { date } = req.query;
    const stats = await aggregateClinicStats(clinicId, date);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// =========================================================
// 18. STATIC ROUTES & SPA FALLBACK
// =========================================================

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const distIndex = path.join(__dirname, '../frontend/dist/index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 handler for unknown API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `The API endpoint "${req.method} ${req.path}" does not exist. Please check the URL and try again.`,
    });
  }
  next();
});

// Global Error Handler
app.use(errorMiddleware);

// Server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Doctor Clinic API Server running on port ${PORT}`);
  console.log(` Connected to MongoDB: ${process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dhyey_clinic_db'}`);
  console.log(` Doctor Workspace: http://localhost:${PORT}/`);
  console.log(` Login Page:       http://localhost:${PORT}/pages/login.html`);
  console.log(`=========================================`);
});
