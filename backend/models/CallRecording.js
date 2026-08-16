// src/models/CallRecording.js
const mongoose = require('mongoose');

const callRecordingSchema = new mongoose.Schema(
  {
    sessionId: {          // VideoSession.sessionId — the permanent room id
      type: String,
      required: true,
      index: true,
    },
    roundKey: {            // VideoSession.currentRoundId at the moment recording
      type: String,        // started — SAME key PatientHistory uses, so this
      required: true,      // recording ties to exactly one patient round.
      index: true,
    },
    patientId: { type: String, required: true },
    doctorId:  { type: String, required: true },
    taskId:    { type: String, default: '' },   // ZegoCloud's cloud-recording TaskId
    status: {
      type: String,
      enum: ['recording', 'processing', 'completed', 'failed', 'declined'],
      default: 'recording',
    },
    recordingUrl: { type: String, default: '' },
    duration:     { type: Number, default: 0 }, // seconds
    doctorConsent:  { type: Boolean, default: false },
    patientConsent: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    endedAt:   { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CallRecording', callRecordingSchema);