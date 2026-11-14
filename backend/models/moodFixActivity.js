const mongoose = require("mongoose");

const moodFixActivitySchema = new mongoose.Schema(
  {
    activityId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      default: ""
    },
    focusTag: {
      type: String,
      default: ""
    },
    benefit: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    moods: {
      type: [String],
      default: []
    },
    steps: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for activity browsing and syncing
moodFixActivitySchema.index({ isActive: 1, updatedAt: -1 });

const MoodFixActivity = mongoose.model("MoodFixActivity", moodFixActivitySchema);

module.exports = MoodFixActivity;
