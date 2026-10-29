const mongoose = require('mongoose');

const ClinicSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
});

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['doctor'], default: 'doctor' },
    name: { type: String, default: '' },
    email: { type: String, default: '', trim: true, lowercase: true },
    specialization: { type: String, default: 'General Physician' },
    degree: { type: String, default: 'M.B.B.S / B.H.M.S.' },
    regNo: { type: String, default: 'G-9035' },
    clinics: [ClinicSubSchema],
    activeClinicId: { type: String, default: 'demo' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
