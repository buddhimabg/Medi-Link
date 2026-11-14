const express = require('express');
const router = express.Router();
const {
  payhereNotify,
  checkPaymentStatus,
  cancelAppointmentPayment,
  getPaymentHistory
} = require('../controllers/paymentController');

router.post('/payhere-notify', payhereNotify);
router.get('/history', getPaymentHistory);
router.get('/:id/status', checkPaymentStatus);
router.post('/:id/cancel', cancelAppointmentPayment);

module.exports = router;
