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

module.exports = router;