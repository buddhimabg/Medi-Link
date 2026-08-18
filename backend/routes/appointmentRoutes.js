const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  cancelAppointment,
  getInvoice,
  rescheduleAppointment,
  confirmPayment
} = require('../controllers/appointmentController');

router.post('/', createAppointment);
router.get('/', getAppointments);
router.post('/:id/cancel', cancelAppointment);
router.get('/:id/invoice', getInvoice);
router.post('/:id/reschedule', rescheduleAppointment);
router.post('/:id/confirm-payment', confirmPayment);

module.exports = router;
