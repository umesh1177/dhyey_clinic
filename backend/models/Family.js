const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema(
  {
    famId: { type: String, required: true, index: true },
    headName: { type: String, required: true, trim: true },
    society: { type: String, default: '', trim: true },
    registeredBy: { type: String, default: 'Self', trim: true },
    area: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    year: { type: Number, default: () => new Date().getFullYear() },
    sequence: { type: Number, default: 1 },
    clinicId: { type: String, default: 'demo', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Family', FamilySchema);
