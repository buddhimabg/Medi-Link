const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    unique: true
  },

  name: {
    type: String,
    required: false
  },

  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },

  phone: {
    type: String,
    required: false
  },

  address: {
    type: String,
    required: false
  },

  city: {
    type: String,
    required: false
  },

  dateOfBirth: {
    type: Date,
    required: false
  },

  age: {
    type: Number,
    required: false
  },

  gender: {
    type: String,
    default: 'prefer-not-to-say'
  },

  bloodType: {
    type: String,
    default: null
  },

  medicalHistory: [
    {
      condition: String,
      diagnosisDate: Date,
      status: {
        type: String,
        enum: ['ongoing', 'resolved'],
        default: 'ongoing'
      },
      notes: String
    }
  ],

  allergies: [
    {
      allergen: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe'],
        default: 'mild'
      },
      reaction: String
    }
  ],

  medications: [
    {
      name: String,
      dosage: String,
      frequency: String,
      startDate: Date,
      endDate: Date
    }
  ],

  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
    address: String
  },

  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    expiryDate: Date,
    coverage: String
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },

  totalAppointments: {
    type: Number,
    default: 0,
    min: 0
  },

  completedAppointments: {
    type: Number,
    default: 0,
    min: 0
  },

  cancelledAppointments: {
    type: Number,
    default: 0,
    min: 0
  },

  lastAppointment: {
    type: Date,
    default: null
  },

  nextAppointment: {
    type: Date,
    default: null
  },

  preferredDoctors: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    }
  ],

  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    default: null
  },

  medicalRecords: [
    {
      filename: String,
      fileUrl: String,
      uploadDate: Date,
      type: {
        type: String,
        enum: ['report', 'prescription', 'test', 'other']
      }
    }
  ],

  notes: {
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
  strict: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// patientSchema.virtual('age').get(function() {
//   if (!this.dateOfBirth) return null;
//   const today = new Date();
//   let age = today.getFullYear() - this.dateOfBirth.getFullYear();
//   const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();
//   
//   if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())) {
//     age--;
//   }
//   
//   return age;
// });

// Virtual for completion rate
patientSchema.virtual('completionRate').get(function () {
  const total = this.completedAppointments + this.cancelledAppointments;
  return total > 0 ? ((this.completedAppointments / total) * 100).toFixed(2) : 0;
});

// Index for performance
patientSchema.index({ userId: 1 });
patientSchema.index({ status: 1 });
patientSchema.index({ createdAt: -1 });
patientSchema.index({ lastAppointment: -1 });

module.exports = mongoose.model('Patient', patientSchema);