const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true
    },
    templateId: {
      type: String,
      default: 'custom'
    },
    templateName: {
      type: String,
      default: 'Custom Notification'
    },
    category: {
      type: String,
      enum: ['announcement', 'appointment', 'medical_report', 'doctor_verification', 'urgent_alert', 'billing', 'custom'],
      default: 'announcement'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    targetType: {
      type: String,
      enum: ['all_patients', 'all_doctors', 'selected_doctors', 'selected_patients', 'custom', 'mixed'],
      required: true
    },
    recipients: [
      {
        email: { type: String, required: true },
        name: { type: String, default: 'Valued User' },
        role: { type: String, default: 'user' },
        status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
        error: { type: String, default: null }
      }
    ],
    recipientCount: {
      type: Number,
      default: 0
    },
    successCount: {
      type: Number,
      default: 0
    },
    failedCount: {
      type: Number,
      default: 0
    },
    title: {
      type: String,
      default: ''
    },
    messageBody: {
      type: String,
      required: true
    },
    highlightBox: {
      type: String,
      default: ''
    },
    buttonText: {
      type: String,
      default: ''
    },
    buttonUrl: {
      type: String,
      default: ''
    },
    sentByName: {
      type: String,
      default: 'MediLink Administrator'
    },
    status: {
      type: String,
      enum: ['sent', 'partially_failed', 'failed'],
      default: 'sent'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailLog', emailLogSchema);
