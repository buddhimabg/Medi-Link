const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    patientId: { type: Number, required: true },
    date: { type: String, required: true },
    hospital: { type: String, required: true },
    primaryDx: { type: String, required: true },
    severity: { type: String, required: true },
    status: { type: String, required: true }
});

module.exports = mongoose.model('Report', ReportSchema);
