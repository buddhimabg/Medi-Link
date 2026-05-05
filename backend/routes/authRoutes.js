const express = require('express');
const router = express.Router();
const { registerPatient, loginUser ,googleLogin} = require('../controllers/authController');

router.post('/register', registerPatient);
router.post('/login', loginUser);

router.post('/google', googleLogin);

module.exports = router;