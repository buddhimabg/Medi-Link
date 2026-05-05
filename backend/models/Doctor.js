const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true
  },

  nic: {
    type: String,
    trim: true
  },

  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    enum: [
      'Cardiology',
      'Neurology',
      'Orthopedics',
      'Pediatrics',
      'General',
      'Psychiatry',
      'Dermatology',
      'Oncology',
      'Urology',
      'Counselor'
    ]
  },

  experience: {
    type: Number,
    default: 0,
    min: [0, 'Experience cannot be negative']
  },

  qualifications: [
    {
      type: String,
      trim: true
    }
  ],

  consultationFee: {
    type: Number,
    default: 0,
    min: [0, 'Consultation fee cannot be negative']
  },

  availability: {
    monday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    tuesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    wednesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    thursday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    friday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    saturday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    sunday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    }
  },

  totalPatients: {
    type: Number,
    default: 0,
    min: 0
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

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },

  status: {
    type: String,
    enum: ['active', 'on-leave', 'inactive'],
    default: 'active'
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },

  certifications: [
    {
      name: String,
      issuer: String,
      issueDate: Date,
      expiryDate: Date
    }
  ],

  languages: [String],

  awards: [
    {
      title: String,
      year: Number,
      description: String
    }
  ],

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

// Virtual for average rating
doctorSchema.virtual('averageRating').get(function() {
  return this.totalReviews > 0 ? (this.rating / this.totalReviews).toFixed(1) : 0;
});

// Virtual for completion rate
doctorSchema.virtual('completionRate').get(function() {
  const total = this.completedAppointments + this.cancelledAppointments;
  return total > 0 ? ((this.completedAppointments / total) * 100).toFixed(2) : 0;
});

// Index for performance
doctorSchema.index({ userId: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ status: 1 });
doctorSchema.index({ rating: -1 });
doctorSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Doctor', doctorSchema);