const express = require('express');
const router = express.Router();

const Doctor = require('../models/doctor'); 
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

// GET /api/doctors/search?name=&specialization=&hospital=
// Public doctor search used by the landing page. Registered before
// GET /:id so "search" isn't swallowed as an :id value.
router.get('/search', async (req, res) => {
  try {
    const { name, specialization, hospital } = req.query;
    const query = { status: 'active' };

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (specialization) {
      query.$or = [
        { specialty: { $regex: specialization, $options: 'i' } },
        { specialization: { $regex: specialization, $options: 'i' } },
      ];
    }
    if (hospital) {
      const hospitalOr = [
        { hospital: { $regex: hospital, $options: 'i' } },
        { availableHospitals: { $regex: hospital, $options: 'i' } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: hospitalOr }];
        delete query.$or;
      } else {
        query.$or = hospitalOr;
      }
    }

    const doctors = await Doctor.find(query).limit(60);
    res.status(200).json(doctors);
  } catch (error) {
    console.error("Error in doctorRoutes GET /search :", error);
    res.status(500).json({ success: false, message: "Failed to search doctors" });
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