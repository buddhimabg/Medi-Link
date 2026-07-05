// src/models/Prescription.js
const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true },
    dose:      { type: String, required: true },
    frequency: { type: String, default: '' },
    duration:  { type: String, default: '' },
    withFood:  { type: String, enum: ['Yes', 'No'], default: 'Yes' },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    sessionId: {
      type:     String,
      required: true,
      index:    true,
    },
    doctorId: {
      type:     String,
      required: true,
    },
    patientId: {
      type:    String,
      default: null,
    },
    medications: {
      type:    [medicationSchema],
      default: [],
    },
    notes: {
      type:    String,
      default: '',
    },
    issuedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);