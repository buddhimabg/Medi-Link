const mongoose = require("mongoose");

const biomarkerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    aliases: { type: [String], default: [] },
    unit: { type: String, required: true },

    category: {
      type: String,
      enum: ["vitamin", "hormone", "blood", "mineral"],
    },

    ranges: {
      normalMin: { type: Number, required: true },
      normalMax: { type: Number, required: true },
    },

    thresholds: {
      low: { type: Number, required: true },
      high: { type: Number, required: true },
    },

    weight: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1,
    },

    recommendations: {
      low: {
        immediate: { type: [String], default: [] },
        daily: { type: [String], default: [] },
      },
      high: {
        immediate: { type: [String], default: [] },
        daily: { type: [String], default: [] },
      },
      normal: {
        daily: { type: [String], default: [] },
      },
    },

    explanations: {
      low: String,
      normal: String,
      high: String,
      notFound: String,
    },

    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

biomarkerSchema.index({ aliases: 1 });

const Biomarker = mongoose.model("Biomarker", biomarkerSchema);

module.exports = Biomarker;
