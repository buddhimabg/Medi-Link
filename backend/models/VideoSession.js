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
    // The Zego `sessionId`/roomId is PERMANENT per doctor (reused for every
    // patient round). currentRoundId is a fresh, unique key generated each
    // time a new patient is attached to the room — used to key that
    // specific round's PatientHistory/Prescription records so rounds never
    // overwrite each other.
    currentRoundId: {
      type:    String,
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
    // ── Recording consent — reset every time the room is reused for a new round ──
    doctorConsent:  { type: Boolean, default: false },
    patientConsent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VideoSession', videoSessionSchema);