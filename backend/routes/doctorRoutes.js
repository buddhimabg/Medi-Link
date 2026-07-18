const express = require('express');
const router = express.Router();

const Doctor = require('../models/Doctor'); 
const DoctorSchedule = require('../models/doctorSchedule');

// GET /api/doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find({});
    const schedules = await DoctorSchedule.find({});

    const data = doctors.map(doc => {
      const docSchedules = schedules.filter(s => s.doctorId.toString() === doc._id.toString());
      docSchedules.sort((a, b) => a.date.localeCompare(b.date));

      const availableSlots = [];
      docSchedules.forEach(sched => {
        sched.slots.forEach(slot => {
          if (!slot.isBooked) {
            availableSlots.push(`${sched.date} ${slot.time}`);
          }
        });
      });

      return {
        ...doc.toObject(),
        schedules: docSchedules,
        availableSlots: availableSlots
      };
    });

    res.status(200).json({ 
      success: true, 
      count: data.length,
      data: data 
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
    
    const docSchedules = await DoctorSchedule.find({ doctorId: doctor._id });
    docSchedules.sort((a, b) => a.date.localeCompare(b.date));

    const availableSlots = [];
    docSchedules.forEach(sched => {
      sched.slots.forEach(slot => {
        if (!slot.isBooked) {
          availableSlots.push(`${sched.date} ${slot.time}`);
        }
      });
    });

    res.status(200).json({ 
      success: true, 
      data: {
        ...doctor.toObject(),
        schedules: docSchedules,
        availableSlots: availableSlots
      } 
    });
  } catch (error) {
    console.error("Error in doctorRoutes GET /:id :", error);
    res.status(500).json({ success: false, message: "Failed to fetch doctor details" });
  }
});

module.exports = router;