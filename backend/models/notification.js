const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["alert", "system"],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    reminderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reminder",
      index: true,
    },
    scheduledDate: {
      type: String,
      trim: true,
      index: true,
    },
    time: {
      type: String,
      trim: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:mm format'],
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;