const mongoose = require('mongoose');

// Points at the same `patients` collection the admin/booking system uses
// (dev-nawodya's demo/seed data was written directly into it, keyed by a
// numeric `id` field alongside the real ObjectId-based patient records).
// autoIndex is off and no fields are required/unique/enum-restricted here
// so loading this model never tries to alter that collection's existing
// indexes or reject real documents that don't match her exact casing.
const TreatmentPatientProfileSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String },
    age: { type: Number },
    gender: { type: String },
    lastVisit: { type: String },
    sessionId: { type: Number },
    condition: { type: String, default: 'mild' },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    emergencyContact: { type: String },
    bloodGroup: { type: String },
    diagnosis: { type: String },
    symptoms: { type: [String] },
    notes: { type: String }
}, { autoIndex: false, strict: false });

module.exports = mongoose.model('TreatmentPatientProfile', TreatmentPatientProfileSchema, 'patients');
