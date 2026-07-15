const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    answers: {
      type: [Number],
      required: true
    },
    phq9Score: {
      type: Number,
      required: true
    },
    gad7Score: {
      type: Number,
      required: true
    },
    depressionSeverity: {
      type: String,
      required: true
    },
    anxietySeverity: {
      type: String,
      required: true
    },
    overallWellnessScore: {
      type: Number,
      required: true
    },
    summary: {
      type: String,
      default: ""
    },
    aiSummary: {
      type: String,
      default: ""
    },
    recommendations: {
      type: [String],
      default: []
    },
    lifestyleSuggestions: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast lookup of a user's assessments sorted by date
assessmentSchema.index({ userId: 1, createdAt: -1 });

const Assessment = mongoose.model("Assessment", assessmentSchema);

module.exports = Assessment;
