const express = require('express');
const router = express.Router();
const { registerPatient, loginUser ,googleLogin} = require('../controllers/authController');
const { requestOtp, resetPassword } = require('../controllers/passwordResetController');

router.post('/register', registerPatient);
router.post('/login', loginUser);

router.post('/google', googleLogin);

router.post('/forgot-password/request-otp', requestOtp);
router.post('/forgot-password/reset', resetPassword);

module.exports = router;