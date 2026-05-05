const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor ID is required'],
    index: true
  },

  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required'],
    index: true
  },

  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },

  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format']
  },

  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format']
  },

  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
    index: true
  },

  consultationType: {
    type: String,
    enum: ['in-person', 'video', 'phone'],
    default: 'in-person'
  },

  reason: {
    type: String,
    trim: true,
    required: false
  },

  symptoms: [
    {
      symptom: String,
      duration: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      }
    }
  ],

  notes: {
    type: String,
    trim: true
  },

  diagnosis: {
    type: String,
    trim: true
  },

  treatment: {
    type: String,
    trim: true
  },

  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },

  attachments: [
    {
      filename: String,
      fileUrl: String,
      uploadDate: Date
    }
  ],

  reminders: {
    emailSent: {
      type: Boolean,
      default: false
    },
    smsSent: {
      type: Boolean,
      default: false
    },
    reminderTime: Date
  },

  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },

  review: {
    type: String,
    trim: true
  },

  followUpRequired: {
    type: Boolean,
    default: false
  },

  followUpDate: {
    type: Date,
    default: null
  },

  cancelledBy: {
    type: String,
    enum: ['doctor', 'patient', 'system']
  },

  cancellationReason: {
    type: String,
    trim: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for checking slot availability
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);