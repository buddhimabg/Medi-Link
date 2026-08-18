const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  // Booking-flow fields (patient-facing directory/scheduling) — required by
  // the existing doctor search, booking, and appointment flow.
  name: { type: String, required: true },
  gender: { type: String, default: "Not Specified" },
  specialty: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  licenseNumber: { type: String },
  yearsOfExperience: { type: Number, default: 0 },
  qualifications: [{ type: String }],
  languages: [{ type: String }],
  bio: { type: String },
  photo: { type: String }, // Matches your DB screenshot
  imageUrl: { type: String }, // Legacy fallback
  rating: { type: Number, default: 4.5 },
  availableHospitals: [{ type: String }],
  hospital: { type: String }, // Legacy fallback
  availableModes: [{ type: String }],
  virtualPrice: { type: Number, required: true },
  physicalPrice: { type: Number, required: true },
  availableSlots: [{ type: String }],

  // Admin-dashboard fields (doctor management/approval workflow).
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    sparse: true
  },

  address: {
    type: String,
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

  consultationFee: {
    type: Number,
    default: 0,
    min: [0, 'Consultation fee cannot be negative']
  },

  availability: {
    monday: { start: String, end: String, available: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
    thursday: { start: String, end: String, available: { type: Boolean, default: true } },
    friday: { start: String, end: String, available: { type: Boolean, default: true } },
    saturday: { start: String, end: String, available: { type: Boolean, default: true } },
    sunday: { start: String, end: String, available: { type: Boolean, default: true } }
  },

  totalPatients: { type: Number, default: 0, min: 0 },
  totalAppointments: { type: Number, default: 0, min: 0 },
  completedAppointments: { type: Number, default: 0, min: 0 },
  cancelledAppointments: { type: Number, default: 0, min: 0 },
  totalReviews: { type: Number, default: 0, min: 0 },

  // Approval / verification workflow
  status: {
    type: String,
    enum: ['active', 'on-leave', 'inactive'],
    default: 'active'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationNotes: { type: String, trim: true },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String, trim: true },
  licenseDocument: { type: String, trim: true },

  certifications: [
    {
      name: String,
      issuer: String,
      issueDate: Date,
      expiryDate: Date
    }
  ],

  awards: [
    {
      title: String,
      year: Number,
      description: String
    }
  ]
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

doctorSchema.index({ userId: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ status: 1 });
doctorSchema.index({ isVerified: 1 });
doctorSchema.index({ rating: -1 });

// Guard against "OverwriteModelError" when this file is required more than
// once (e.g. nodemon hot-reload or multiple entry points).
module.exports = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
