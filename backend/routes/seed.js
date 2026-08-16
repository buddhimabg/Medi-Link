const express = require('express');
const router = express.Router();

const Patient = require('../models/patient');
const TreatmentPlan = require('../models/treatmentPlan');
const { demoTreatmentPlans } = require('../data/treatmentPlanSeeds');

router.post('/', async (req, res) => {
    try {
        const patients = await Patient.find().sort({ id: 1 }).limit(5);

        if (!patients.length) {
            return res.status(404).json({ error: 'No patients available to seed treatment plans' });
        }

        const seededPlans = [];

        for (let index = 0; index < patients.length; index += 1) {
            const patient = patients[index];
            const demoPlan = demoTreatmentPlans[index] || demoTreatmentPlans[demoTreatmentPlans.length - 1];

            const treatmentPlan = await TreatmentPlan.findOneAndUpdate(
                { patientId: patient.id },
                {
                    $set: {
                        patientId: patient.id,
                        goals: demoPlan.goals,
                        interventions: demoPlan.interventions,
                        followUpDate: demoPlan.followUpDate,
                        doctorNotes: demoPlan.doctorNotes,
                        updatedBy: 'Seed Data',
                    },
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            seededPlans.push({
                patientId: patient.id,
                patientName: patient.name,
                treatmentPlanId: treatmentPlan._id,
            });
        }

        res.json({
            success: true,
            message: 'Demo treatment plans seeded successfully',
            seededCount: seededPlans.length,
            plans: seededPlans,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;