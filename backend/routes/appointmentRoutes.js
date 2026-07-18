const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  cancelAppointment,
  rescheduleAppointment,
  confirmPayment
} = require('../controllers/appointmentController');

router.post('/', createAppointment);
router.get('/', getAppointments);
router.post('/:id/cancel', cancelAppointment);
router.post('/:id/reschedule', rescheduleAppointment);
router.post('/:id/confirm-payment', confirmPayment);

module.exports = router;
