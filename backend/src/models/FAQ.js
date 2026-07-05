// src/models/FAQ.js
// Doctor හදන FAQ library — keyword matching + Claude fallback සඳහා
const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    doctorId: {
      type:     String,
      required: true,
      index:    true,
    },
    category: {
      type:    String,
      enum:    ['MEDICATION', 'APPOINTMENT', 'MENTAL_HEALTH', 'GENERAL'],
      default: 'GENERAL',
    },
    question: {
      type:     String,
      required: true,
      trim:     true,
    },
    answer: {
      type:     String,
      required: true,
      trim:     true,
    },
    // Auto-reply trigger keywords — patient message ලේ match check කරනවා
    // Example: ['sertraline', 'side effect', 'nausea']
    keywords: {
      type:    [String],
      default: [],
    },
    // Bot use කරද්දී auto-increment
    usageCount: {
      type:    Number,
      default: 0,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Keywords text search index
faqSchema.index({ keywords: 1 });
faqSchema.index({ doctorId: 1, isActive: 1 });

module.exports = mongoose.model('FAQ', faqSchema);