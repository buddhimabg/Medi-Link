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
      required: true,
      min: 1,
      max: 10
    },
    anxietyLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    energyLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    motivationLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    socialInteraction: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    stressLevel: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    focusLevel: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    shareWithDoctor: {
      type: Boolean,
      default: false
    },
    tags: {
      type: [String],
      default: []
    }
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