// src/controllers/appointmentController.js
const Appointment = require('../models/appointment');
const User        = require('../models/User');

// GET /api/appointments/doctor
// Returns raw ongoing appointments for the logged-in doctor
exports.getDoctorQueue = async (req, res) => {
  try {
    const doctorId     = req.user?.id?.toString();
    const appointments = await Appointment.find({ doctorId, status: 'ongoing' }).sort({ date: 1 });
    return res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    console.error('getDoctorQueue error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// GET /api/appointments/doctor/queue
// Returns enriched queue — patientName & patientInitial resolved from User model
exports.getDoctorQueueEnriched = async (req, res) => {
  try {
    const doctorId = req.user?.id?.toString();

    // Log so you can verify what doctorId is coming from your JWT token
    console.log('[getDoctorQueueEnriched] doctorId from token:', doctorId);

    const appointments = await Appointment.find({ doctorId, status: 'ongoing' }).sort({ date: 1 });

    console.log('[getDoctorQueueEnriched] appointments found:', appointments.length);

    // Batch-fetch patient names from User collection
    const patientIds = [...new Set(appointments.map(a => a.patientId))];
    let userMap = {};
    try {
      const users = await User.find({ _id: { $in: patientIds } }, 'name');
      users.forEach(u => { userMap[u._id.toString()] = u.name; });
    } catch {
      // non-blocking fallback
    }

    const enriched = appointments.map(a => {
      const name    = userMap[a.patientId] || `Patient ${a.patientId}`;
      const initial = name.charAt(0).toUpperCase();
      return {
        _id:            a._id,
        patientId:      a.patientId,
        patientName:    name,
        patientInitial: initial,
        sessionId:      null,
        notes:          a.notes   || '',
        status:         a.status,
        date:           a.date,
      };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('getDoctorQueueEnriched error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// GET /api/appointments/debug-doctor-id
// ⚠️ TEMPORARY — visit once after login to find your real doctorId, then remove this
exports.debugDoctorId = async (req, res) => {
  try {
    const doctorId        = req.user?.id?.toString();
    const allAppointments = await Appointment.find({}).limit(10);
    return res.status(200).json({
      success: true,
      data: {
        yourDoctorIdFromToken: doctorId,
        hint: 'Copy this value and update your MongoDB appointments to use this as doctorId',
        sampleAppointmentsInDB: allAppointments.map(a => ({
          _id:       a._id,
          doctorId:  a.doctorId,
          patientId: a.patientId,
          status:    a.status,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};