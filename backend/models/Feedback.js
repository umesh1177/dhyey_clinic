const mongoose = require('mongoose');

const FeedbackReplySchema = new mongoose.Schema({
  senderRole: {
    type: String,
    enum: ['doctor', 'support'],
    default: 'doctor',
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const FeedbackSchema = new mongoose.Schema(
  {
    ticketNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    doctorId: {
      type: String,
      default: 'demo',
      trim: true,
    },
    doctorName: {
      type: String,
      default: 'Doctor',
      trim: true,
    },
    clinicId: {
      type: String,
      default: 'demo',
      trim: true,
    },
    clinicName: {
      type: String,
      default: 'Dhyey Clinic & Hospital',
      trim: true,
    },
    category: {
      type: String,
      enum: ['clinic_request', 'feature_request', 'bug_report', 'general_feedback'],
      default: 'general_feedback',
    },
    categoryLabel: {
      type: String,
      default: 'General Feedback',
    },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Urgent'],
      default: 'Normal',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    metaDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Closed'],
      default: 'Pending',
    },
    replies: [FeedbackReplySchema],
    lastReplyAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', FeedbackSchema);
