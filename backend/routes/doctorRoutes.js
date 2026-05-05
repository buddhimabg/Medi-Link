const express = require('express');
const router = express.Router();
const Doctor = require('../models/doctor');  

router.get('/search', async (req, res) => {
  try {
    const { name, specialization, hospital } = req.query;
    
     
    let dbQuery = {};
    
    // $regex and $options: 'i' means it searches for partial words and ignores uppercase/lowercase
    if (name) dbQuery.name = { $regex: name, $options: 'i' };
    if (specialization) dbQuery.specialty = { $regex: specialization, $options: 'i' };
    if (hospital) dbQuery.hospital = { $regex: hospital, $options: 'i' };

    // Find doctors that match the search
    const doctors = await Doctor.find(dbQuery);
    res.status(200).json(doctors);

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Error searching for doctors" });
  }
});

module.exports = router;