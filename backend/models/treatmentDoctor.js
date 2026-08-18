const mongoose = require('mongoose');

// Points at the same `doctors` collection the patient-facing booking system
// uses (dev-nawodya's demo/seed data was written directly into it, keyed by
// a numeric `id` field alongside the real ObjectId-based doctor records).
// autoIndex is off and no fields are required/unique here so loading this
// model never tries to alter that collection's existing indexes.
const TreatmentDoctorSchema = new mongoose.Schema({
    id: { type: String },
    name: { type: String },
    specialty: { type: String, default: 'Psychiatrist' },
    email: { type: String },
    phone: { type: String },
    hospital: { type: String },
    licenseNumber: { type: String },
    yearsOfExperience: { type: Number },
    qualifications: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    bio: { type: String, default: '' },
    photo: { type: String, default: '' },
    totalPatients: { type: Number, default: 0 },
    sessionsThisMonth: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8 },
    availableDays: { type: [String], default: [] }
}, { autoIndex: false, strict: false });

module.exports = mongoose.model('TreatmentDoctor', TreatmentDoctorSchema, 'doctors');
