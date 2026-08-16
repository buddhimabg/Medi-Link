const mongoose = require('mongoose');

const VisitSchema = new mongoose.Schema({
    patientId: { type: Number, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    hospital: { type: String, required: true },
    visitType: { type: String, required: true },
    status: { type: String, required: true }
});

module.exports = mongoose.model('Visit', VisitSchema);
