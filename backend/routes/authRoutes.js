const express = require('express');
const router = express.Router();
const { registerPatient, loginUser } = require('../controllers/authController');

router.post('/register', registerPatient);
router.post('/login', loginUser);

module.exports = router;