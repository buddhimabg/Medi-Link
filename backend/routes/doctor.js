const express = require('express');
const router = express.Router();
const Doctor = require('../models/treatmentDoctor');

// Get doctor profile
router.get('/profile', async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ id: 1 });
        if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update doctor profile
router.put('/profile/:id', async (req, res) => {
    try {
        const doctorId = parseInt(req.params.id);
        const { phone, bio, photo } = req.body;

        // No upsert: this collection is shared with the patient-facing
        // doctor directory, so this endpoint must only ever update an
        // existing doctor's own profile fields, never create a new one.
        const doctor = await Doctor.findOneAndUpdate(
            { id: doctorId },
            { $set: { phone, bio, photo } },
            { new: true }
        );

        if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
