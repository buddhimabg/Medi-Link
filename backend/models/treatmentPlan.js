const mongoose = require('mongoose');

const TreatmentGoalSchema = new mongoose.Schema(
    {
        text: { type: String, required: true },
        interventions: { type: [String], default: [] },
        startDate: { type: String, default: '' },
        targetDate: { type: String, default: '' },
        status: {
            type: String,
            enum: ['Not started', 'In progress', 'Achieved', 'Discontinued'],
            default: 'Not started',
        },
        note: { type: String, default: '' },
    },
    { _id: false }
);

const TreatmentPlanSchema = new mongoose.Schema(
    {
        patientId: { type: Number, required: true, unique: true },
        patientName: { type: String, default: '' },
        mrn: { type: String, default: '' },
        dateOfBirth: { type: String, default: '' },
        primaryDiagnosis: { type: String, default: '' },
        status: {
            type: String,
            enum: ['active', 'archived', 'completed'],
            default: 'active',
        },
        activePlan: { type: Boolean, default: true },
        goals: { type: [TreatmentGoalSchema], default: [] },
        updatedBy: { type: String, default: '' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('TreatmentPlan', TreatmentPlanSchema);