const mongoose = require("mongoose");

const markerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: Number, default: null },
    unit: { type: String, default: "" },
    status: {
      type: String,
      enum: ["low", "normal", "high", "not-found", "unsupported"],
      default: "not-found",
    },
    score: { type: Number, default: null }, // Dynamic score based on distance from normal range
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    reviewNote: { type: String, default: "" },
    explanation: { type: String, default: "" },
    mentalHealthRelevance: { type: String, default: "" },
    normalMin: { type: Number, default: null },
    normalMax: { type: Number, default: null },
    normalRange: { type: String, default: "" },
    rangeSource: { type: String, default: "" },
  },
  { _id: false }
);

const recommendationsSchema = new mongoose.Schema(
  {
    immediateActions: { type: [String], default: [] },
    dailyPractices: { type: [String], default: [] },
  },
  { _id: false }
);

const dataQualitySchema = new mongoose.Schema(
  {
    detected: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const analysisCoverageSchema = new mongoose.Schema(
  {
    analyzed: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const keyIssueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["low", "high"],
      required: true,
    },
    value: { type: Number, default: null },
  },
  { _id: false }
);

const labReportSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      default: "",
    },
    extractedText: {
      type: String,
      default: "",
    },
    markers: {
      type: [markerSchema],
      default: [],
    },
    overallScore: {
      type: Number,
      default: 0,
    },
    confidence: {
      type: Number,
      default: 0, // Confidence score: detectedMarkers / totalMarkers
      min: 0,
      max: 1,
    },
    summary: {
      type: String,
      default: "",
    },
    dataQuality: {
      type: dataQualitySchema,
      default: () => ({ detected: 0, total: 0, percentage: 0 }),
    },
    analysisCoverage: {
      type: analysisCoverageSchema,
      default: () => ({ analyzed: 0, available: 0, percentage: 0 }),
    },
    reportBiomarkers: {
      type: [String],
      default: [],
    },
    keyIssues: {
      type: [keyIssueSchema],
      default: [],
    },
    recommendations: {
      type: recommendationsSchema,
      default: () => ({ immediateActions: [], dailyPractices: [] }),
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

labReportSchema.index({ userId: 1, createdAt: -1 });
labReportSchema.index({ userId: 1, overallScore: -1 });

const LabReport = mongoose.model("LabReport", labReportSchema);

module.exports = LabReport;
