const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: [
      'appointment_reminder',
      'appointment_cancelled',
      'appointment_rescheduled',
      'prescription_ready',
      'report_generated',
      'message',
      'system_alert',
      'billing',
      'security',
      'profile_update'
    ],
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  message: {
    type: String,
    required: true,
    trim: true
  },

  description: String,

  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  relatedTo: {
    resourceType: String,
    resourceId: mongoose.Schema.Types.ObjectId
  },

  actionUrl: String,

  actionButtons: [
    {
      label: String,
      url: String,
      action: String
    }
  ],

  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  },

  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: Date,

  isDismissed: {
    type: Boolean,
    default: false
  },

  dismissedAt: Date,

  expiresAt: Date,

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
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);