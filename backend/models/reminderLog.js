const mongoose = require("mongoose");

const reminderLogSchema = new mongoose.Schema(
  {
    reminderId: { type: mongoose.Schema.Types.ObjectId, ref: "Reminder", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, required: true },
    scheduledDate: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReminderLog", reminderLogSchema);