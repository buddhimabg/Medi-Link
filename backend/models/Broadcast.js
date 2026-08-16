// src/models/Broadcast.js
// Doctor ලා bulk message send කරන history
const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema(
  {
    doctorId: {
      type:     String,
      required: true,
      index:    true,
    },
    message: {
      type:     String,
      required: true,
    },
    // Target patient ids
    recipients: {
      type:    [String],
      default: [],
    },
    // Analytics
    deliveredCount: {
      type:    Number,
      default: 0,
    },
    readCount: {
      type:    Number,
      default: 0,
    },
    sentAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Broadcast', broadcastSchema);