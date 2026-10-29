const mongoose = require('mongoose');

const ClinicSchema = new mongoose.Schema(
  {
    clinicId: { type: String, required: true, unique: true, index: true }, // e.g. "CLN-001" or "0001"
    name: { type: String, required: true, trim: true },
    city: { type: String, default: 'Ahmedabad', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    registration: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    days: { type: String, default: 'Monday - Saturday', trim: true },
    hours: { type: String, default: '09:00 AM - 08:00 PM', trim: true },
    specialties: { type: String, default: 'General Medicine', trim: true },
    facilities: { type: String, default: 'OPD, Pharmacy', trim: true },
    status: { type: String, enum: ['Active', 'Pending', 'Suspended'], default: 'Active' },
    services: {
      type: [String],
      default: ['digitalPrescription', 'certificates', 'billing'],
    },
    doctorsCount: { type: Number, default: 1 },
    verifiedDocuments: { type: Number, default: 0 },
  },
  { timestamps: true }  
);

module.exports = mongoose.model('Clinic', ClinicSchema);
