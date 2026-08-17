const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    sparse: true
  },

  // Direct fields for flat document structure (medilink_db)
  id: {
    type: Number,
    unique: true,
    sparse: true
  },

  name: {
    type: String,
    trim: true
  },

  email: {
    type: String,
    trim: true
  },

  phone: {
    type: String,
    trim: true
  },

  address: {
    type: String,
    trim: true
  },

  specialty: {
    type: String,
    trim: true
  },

  photo: {
    type: String,
    trim: true
  },

  licenseNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  nic: {
    type: String,
    trim: true
  },

  specialization: {
    type: String,
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
      'Counselor',
      'Consultant Psychiatrist',
      'Clinical Psychologist',
      'Counseling Psychologist',
      'Child & Adolescent Psychiatrist',
      'Neuropsychiatrist',
      'Addiction Specialist',
      'Geriatric Psychiatrist',
      'Psychotherapist',
      'Behavioral Therapist'
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

  verificationNotes: {
    type: String,
    trim: true
  },

  verifiedAt: {
    type: Date
  },

  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  rejectionReason: {
    type: String,
    trim: true
  },

  licenseDocument: {
    type: String,
    trim: true
  },

  yearsOfExperience: {
    type: Number,
    default: 0
  },

  availableSlots: [String],

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

// Auto-assign sequential id if missing
doctorSchema.pre('save', async function(next) {
  if (!this.id) {
    try {
      const lastDoctor = await this.constructor.findOne().sort({ id: -1 }).select('id');
      this.id = (lastDoctor && lastDoctor.id) ? Number(lastDoctor.id) + 1 : 1;
    } catch (err) {
      // Continue if search fails
    }
  }
  next();
});

// Index for performance
doctorSchema.index({ userId: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ status: 1 });
doctorSchema.index({ isVerified: 1 });
doctorSchema.index({ rating: -1 });
doctorSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Doctor', doctorSchema);