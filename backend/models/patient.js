const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['Male','Female'], required: true },
    lastVisit: { type: String, required: true },
    sessionId: { type: Number, required: true },
    condition: { type: String, enum: ['mild','critical'], default: 'mild' },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    emergencyContact: { type: String },
    bloodGroup: { type: String },
    diagnosis: { type: String },
    symptoms: { type: [String] },
    notes: { type: String }
});

module.exports = mongoose.model('Patient', PatientSchema);
