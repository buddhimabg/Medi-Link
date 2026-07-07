const mongoose = require("mongoose");

const moodSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true // Add index for faster queries by userId
    },
    mood: {
      type: String,
      enum: ["terrible", "sad", "okay", "good", "great"],
      default: "okay"
    },
    note: {
      type: String,
      default: ""
    },
    sleepLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    anxietyLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    energyLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    motivationLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    socialInteraction: {
      type: Number,
      min: 1,
      max: 10
    },
    stressLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    focusLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    shareWithDoctor: {
      type: Boolean,
      default: false
    },
    tags: {
      type: [String],
      default: []
    },
    mentalHealthScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 5,
      index: true // Index for efficient sorting/filtering by score
    },
    // Journal Analysis (Optional AI Fields)
    journalSentimentMood: { type: String },
    journalPrimaryEmotion: { type: String },
    journalEmotionalIntensity: { type: Number, min: 1, max: 10 },
    journalStressLevel: { type: Number, min: 1, max: 10 },
    journalTopics: [{ type: String }],
    journalCopingStrategies: [{ type: String }],
    journalAiSummary: { type: String },

    // Speech Analysis (Optional AI Fields)
    speechTranscript: { type: String },
    speechSentimentMood: { type: String },
    speechPrimaryEmotion: { type: String },
    speechEmotionalIntensity: { type: Number, min: 1, max: 10 },
    speechStressLevel: { type: Number, min: 1, max: 10 },
    speechTopics: [{ type: String }],
    speechCopingStrategies: [{ type: String }],
    speechAiSummary: { type: String },

    // Camera Analysis (Never used for scoring)
    cameraDetectedMood: { type: String },
    cameraConfidence: { type: Number, min: 0, max: 100 },

    // Aggregated / General Fields
    finalConfirmedMood: {
      sleepLevel: Number,
      anxietyLevel: Number,
      energyLevel: Number,
      motivationLevel: Number,
      socialInteraction: Number,
      stressLevel: Number,
      focusLevel: Number
    },
    overallWellbeingScore: { type: Number },
    emotionalRiskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] }
  },
  {
    timestamps: true // automatically creates createdAt and updatedAt
  }
);

// ==========================================
// IMPORTANT: COMPOUND INDEX FOR FAST QUERIES
// ==========================================
// This index makes dashboard and weekly queries 10-100x faster!
// It creates a compound index on userId (ascending) and createdAt (descending)
// because we always query by userId and sort by date
moodSchema.index({ userId: 1, createdAt: -1 });

// Optional: If you need to search by date ranges frequently, add this too
// moodSchema.index({ createdAt: -1 });

const Mood = mongoose.model("Mood", moodSchema);

module.exports = Mood;