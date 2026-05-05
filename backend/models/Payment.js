const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    index: true
  },

  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },

  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },

  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },

  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'LKR']
  },

  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'insurance', 'cash', 'bank_transfer', 'digital_wallet'],
    required: true,
    index: true
  },

  paymentGateway: {
    type: String,
    enum: ['stripe', 'paypal', 'razorpay', 'square', 'manual'],
    default: 'stripe'
  },

  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
  },

  description: String,

  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  invoiceUrl: String,

  receiptUrl: String,

  cardDetails: {
    lastFourDigits: String,
    cardBrand: String,
    expiryDate: String
  },

  insuranceDetails: {
    provider: String,
    policyNumber: String,
    claimNumber: String
  },

  discounts: {
    code: String,
    percentage: Number,
    amount: Number
  },

  tax: {
    type: Number,
    default: 0,
    min: 0
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  refund: {
    status: {
      type: String,
      enum: ['none', 'pending', 'completed', 'failed'],
      default: 'none'
    },
    amount: {
      type: Number,
      default: 0
    },
    date: Date,
    reason: String
  },

  notes: String,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  completedAt: Date,

  failureReason: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.totalAmount);
});

// Index for performance
paymentSchema.index({ patientId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ appointmentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);