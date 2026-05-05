const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Report title is required'],
    trim: true,
    index: true
  },

  description: {
    type: String,
    trim: true
  },

  type: {
    type: String,
    enum: ['patient', 'doctor', 'appointment', 'revenue', 'system', 'performance'],
    required: true,
    index: true
  },

  filters: {
    startDate: Date,
    endDate: Date,
    doctorId: mongoose.Schema.Types.ObjectId,
    patientId: mongoose.Schema.Types.ObjectId,
    status: String,
    specialty: String,
    customFilters: mongoose.Schema.Types.Mixed
  },

  data: {
    summary: mongoose.Schema.Types.Mixed,
    details: mongoose.Schema.Types.Mixed,
    statistics: mongoose.Schema.Types.Mixed,
    charts: [
      {
        chartType: {
          type: String,
          enum: ['line', 'bar', 'pie', 'doughnut', 'radar']
        },
        title: String,
        data: mongoose.Schema.Types.Mixed
      }
    ]
  },

  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  format: {
    type: String,
    enum: ['pdf', 'csv', 'excel', 'json'],
    default: 'pdf'
  },

  fileUrl: String,

  fileName: String,

  isPublic: {
    type: Boolean,
    default: false
  },

  sharedWith: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      sharedDate: Date,
      permissions: {
        type: String,
        enum: ['view', 'download', 'edit'],
        default: 'view'
      }
    }
  ],

  status: {
    type: String,
    enum: ['draft', 'completed', 'archived'],
    default: 'draft'
  },

  tags: [String],

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

  exportedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for performance
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ tags: 1 });

module.exports = mongoose.model('Report', reportSchema);