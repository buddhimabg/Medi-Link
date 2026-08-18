// src/models/CallTranscript.js
const mongoose = require('mongoose');

// One chunk = one recognized utterance coming back from ZegoCloud Cloud ASR
// (or, in mock mode, the single placeholder chunk generated at endCall).
const chunkSchema = new mongoose.Schema(
  {
    speaker:   { type: String, default: 'unknown' }, // e.g. 'doctor' / 'patient' — depends on what ASR callback sends
    text:      { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const callTranscriptSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    roundKey:  { type: String, required: true, index: true },
    patientId: { type: String, default: null },
    doctorId:  { type: String, default: null },
    taskId:    { type: String, default: '' }, // ZegoCloud ASR TaskId, once a real task is started
    status: {
      type: String,
      enum: ['listening', 'completed', 'failed', 'disabled', 'mock'],
      default: 'listening',
    },
    chunks:  { type: [chunkSchema], default: [] },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CallTranscript', callTranscriptSchema);