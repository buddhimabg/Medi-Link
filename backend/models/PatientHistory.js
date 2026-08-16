// src/models/PatientHistory.js
const mongoose = require('mongoose');

const patientHistorySchema = new mongoose.Schema(
  {
    patientId: {
      type:     String,
      required: true,
      index:    true,
    },
    sessionId: {
      type:  String,
      index: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    // Snapshot of session data for history
    date: {
      type:    Date,
      default: Date.now,
    },
    duration: {          // seconds
      type:    Number,
      default: 0,
    },
    notes: {
      type:    String,
      default: '',
    },
    // The "Notes for Patient" text written on the e-Prescription during
    // this round — separate from `notes` above, which is the doctor's
    // private session/clinical notes.
    notesForPatient: {
      type:    String,
      default: '',
    },
    medications: {
      type:    Array,
      default: [],
    },
    moodLabel: {
      type:    String,
      default: 'Neutral',
    },
    moodColor: {
      type:    String,
      default: '#6B7280',
    },
    // ── Cloud recording link ──────────────────────────────────
    recordingStatus: { type: String, default: 'none' }, // none | recording | processing | completed | failed
    recordingUrl:    { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('PatientHistory', patientHistorySchema);