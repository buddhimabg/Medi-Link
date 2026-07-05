// src/models/VideoSession.js
const mongoose = require('mongoose');

const videoSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    patientId: {
      type: String,
      default: null,
    },
    roomId: {
      type:     String,
      required: true,
    },
    status: {
      type:    String,
      enum:    ['waiting', 'active', 'ended', 'cancelled'],
      default: 'waiting',
    },
    startedAt: {
      type:    Date,
      default: null,
    },
    endedAt: {
      type:    Date,
      default: null,
    },
    duration: {           // in seconds
      type:    Number,
      default: 0,
    },
    sessionNotes: {
      type:    String,
      default: '',
    },
    callMetadata: {       // ZegoCloud / SDK details
      appId:      { type: Number, default: 0 },
      doctorUserId: { type: String, default: '' },
      patientUserId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VideoSession', videoSessionSchema);