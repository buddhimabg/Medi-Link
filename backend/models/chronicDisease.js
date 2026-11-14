const mongoose = require('mongoose');

const ChronicDiseaseSchema = new mongoose.Schema({
    patientId: { type: Number, required: true },
    name: { type: String, required: true },
    status: { type: String, required: true },
    diagnosed: { type: String, required: true },
    lastResult: { type: String, required: true }
});

module.exports = mongoose.model('ChronicDisease', ChronicDiseaseSchema);
