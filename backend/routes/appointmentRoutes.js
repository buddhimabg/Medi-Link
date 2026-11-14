const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  cancelAppointment,
  getInvoice,
  rescheduleAppointment,
  confirmPayment,
  getDoctorQueue,
  getDoctorQueueEnriched,
  getTodaysCompletedSessions
} = require('../controllers/appointmentController');
const { protect, requireRole } = require('../middlewares/auth');

// GET /api/appointments/doctor/queue — enriched queue with patient names
// Must be defined BEFORE '/' and any other GET routes below it.
router.get('/doctor/queue', protect, requireRole('doctor'), getDoctorQueueEnriched);

// GET /api/appointments/doctor — raw appointments list for the doctor
router.get('/doctor', protect, requireRole('doctor'), getDoctorQueue);

// GET /api/appointments/today-summary — today's completed video-call sessions
router.get('/today-summary', protect, requireRole('doctor'), getTodaysCompletedSessions);

router.post('/', createAppointment);
router.get('/', getAppointments);
router.post('/:id/cancel', cancelAppointment);
router.get('/:id/invoice', getInvoice);
router.post('/:id/reschedule', rescheduleAppointment);
router.post('/:id/confirm-payment', confirmPayment);

module.exports = router;