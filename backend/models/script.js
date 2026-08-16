const mongoose = require('mongoose');

const ScriptSchema = new mongoose.Schema({
    patientId: { type: Number, required: true },
    fileName: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, required: true },
    doctorName: { type: String, required: true },
    diagnosis: { type: String, required: true },
    severity: { type: String, required: true },
    medicationName: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    notes: { type: String, required: true }
});

module.exports = mongoose.model('Script', ScriptSchema);
