const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  activityType: {
    type: String,
    enum: [
      'user_registered',
      'user_login',
      'user_logout',
      'user_profile_updated',
      'user_password_changed',
      'patient_registered',
      'patient_updated',
      'patient_deleted',
      'doctor_profile_added',
      'doctor_updated',
      'doctor_deleted',
      'appointment_scheduled',
      'appointment_completed',
      'appointment_cancelled',
      'appointment_rescheduled',
      'prescription_issued',
      'prescription_filled',
      'report_generated',
      'report_exported',
      'settings_changed',
      'admin_action',
      'system_error',
      'security_event'
    ],
    required: true,
    index: true
  },

  description: {
    type: String,
    required: true,
    trim: true
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  ipAddress: String,

  userAgent: String,

  resourceType: {
    type: String,
    enum: ['User', 'Doctor', 'Patient', 'Appointment', 'Session', 'Prescription', 'Report', 'System']
  },

  resourceId: mongoose.Schema.Types.ObjectId,

  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  },

  errorMessage: String,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expire: 2592000 // Auto-delete after 30 days
  }
}, {
  timestamps: false
});

// Compound index for efficient queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ activityType: 1, createdAt: -1 });
activitySchema.index({ resourceType: 1, resourceId: 1 });

module.exports = mongoose.model('SystemActivity', activitySchema);