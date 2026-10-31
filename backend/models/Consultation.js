const mongoose = require('mongoose');

const TreatmentItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: String, default: '1' },
  cost: { type: Number, default: 0 },
});

const PrescriptionItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: String, default: '1' },
  mor: { type: String, default: '0' },
  noon: { type: String, default: '0' },
  eve: { type: String, default: '0' },
  ngt: { type: String, default: '0' },
  timing: { type: String, default: 'AF' }, // 'BF' or 'AF'
  notes: { type: String, default: '' },
});

const ConsultationSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, index: true },
    visitNum: { type: Number, default: 1 },
    patientId: { type: String, required: true, index: true },
    familyId: { type: String, required: true, index: true },
    clinicId: { type: String, default: 'demo', index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, default: '10:00' },
    weight: { type: String, default: '' },
    bp: { type: String, default: '' },
    sugar: { type: String, default: '' },
    pulse: { type: String, default: '' },
    other: { type: String, default: '' },
    reference: { type: String, default: 'Self' },
    complaint: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    investigation: { type: String, default: '' },
    dietary: { type: String, default: '' },
    labReport: { type: mongoose.Schema.Types.Mixed, default: null },
    labReportFile: { type: String, default: '' },
    treatment: [TreatmentItemSchema],
    prescription: [PrescriptionItemSchema],
    charge: { type: Number, default: 0 },
    received: { type: Number, default: 0 },
    due: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Consultation', ConsultationSchema);
