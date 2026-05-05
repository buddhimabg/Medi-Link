const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      enum: ['meditation', 'mood', 'activity', 'appointment'],
      required: [true, 'Category is required'],
    },
    time: {
      type: String,
      required: [true, 'Time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:mm format'],
    },
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'specific', 'custom'],
      required: [true, 'Frequency is required'],
    },
    date: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Please provide date in YYYY-MM-DD format'],
    },
    daysOfWeek: {
      type: [Number],
      validate: {
        validator: function(v) {
          return v.every(day => day >= 0 && day <= 6);
        },
        message: 'Days of week must be between 0 (Sunday) and 6 (Saturday)',
      },
    },
    customDates: {
      type: [Date],
    },
    specificDates: {
      type: [String],
      default: [],
    },
    disabledDates: {
      type: [String],
      default: [],
    },
    isDisabledToday: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdFrom: {
      type: String,
      enum: ['system', 'prescription', 'user'],
      required: [true, 'createdFrom is required'],
    },
    timezone: {
      type: String,
      default: 'Asia/Colombo',
    },
    lastTriggeredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Reminder = mongoose.model("Reminder", reminderSchema);

module.exports = Reminder;
