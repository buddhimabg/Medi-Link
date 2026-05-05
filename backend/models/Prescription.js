const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },

  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    index: true
  },

  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },

  medications: [
    {
      name: {
        type: String,
        required: true,
        trim: true
      },
      dosage: {
        type: String,
        required: true,
        trim: true
      },
      frequency: {
        type: String,
        required: true,
        enum: ['Once a day', 'Twice a day', 'Three times a day', 'Four times a day', 'As needed'],
        trim: true
      },
      duration: {
        type: String,
        required: true,
        trim: true
      },
      instructions: {
        type: String,
        trim: true
      },
      sideEffects: String,
      contraindications: String
    }
  ],

  labTests: [
    {
      testName: String,
      frequency: String,
      priority: {
        type: String,
        enum: ['routine', 'urgent'],
        default: 'routine'
      }
    }
  ],

  diagnosis: {
    type: String,
    required: true,
    trim: true
  },

  notes: {
    type: String,
    trim: true
  },

  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    date: Date,
    notes: String
  },

  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'cancelled'],
    default: 'active'
  },

  issueDate: {
    type: Date,
    default: Date.now,
    index: true
  },

  expiryDate: {
    type: Date,
    required: true
  },

  refillsAllowed: {
    type: Number,
    default: 0,
    min: 0
  },

  refillsUsed: {
    type: Number,
    default: 0,
    min: 0
  },

  pharmacyNotes: String,

  patientAcknowledged: {
    type: Boolean,
    default: false
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

// Index for performance
prescriptionSchema.index({ patientId: 1, status: 1 });
prescriptionSchema.index({ doctorId: 1 });
prescriptionSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);