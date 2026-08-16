const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
    patientId: { type: Number, required: true },
    name: { type: String, required: true },
    status: { type: String, required: true },
    dosage: { type: String, required: true },
    purpose: { type: String, required: true },
    started: { type: String, required: true }
});

module.exports = mongoose.model('Medication', MedicationSchema);
