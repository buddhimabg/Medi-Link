const mongoose = require("mongoose");

const FactorMetaSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String },
  researchBasis: { type: String },
  worsenedInsight: { type: String },
  positiveInsight: { type: String },
  threshold: { type: Number },
  recommendation: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("FactorMeta", FactorMetaSchema);
