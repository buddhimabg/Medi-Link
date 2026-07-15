const express = require('express');
const router = express.Router();

// THE FIX: Notice the TWO dots '../' to step out of the 'routes' folder!
const Doctor = require('../models/Doctor'); 

// GET /api/doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find({});
    res.status(200).json({ 
      success: true, 
      count: doctors.length,
      data: doctors 
    });
  } catch (error) {
    console.error("Error in doctorRoutes GET / :", error);
    res.status(500).json({ success: false, message: "Failed to fetch doctors" });
  }
});

// GET /api/doctors/:id
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    console.error("Error in doctorRoutes GET /:id :", error);
    res.status(500).json({ success: false, message: "Failed to fetch doctor details" });
  }
});

module.exports = router;