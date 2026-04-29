const mongoose = require("mongoose");

const reminderLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    reminderId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
      index: true,
    },
    status: {
      type: String,
      enum: ["completed", "skipped"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

reminderLogSchema.index({ userId: 1, reminderId: 1, date: 1 }, { unique: true });

const ReminderLog = mongoose.model("ReminderLog", reminderLogSchema);

module.exports = ReminderLog;