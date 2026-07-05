const express = require('express');
const router  = express.Router();
const { register, login, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);   // Patient/Doctor register
router.post('/login',    login);      // Login
router.get('/me',        protect, me); // Token verify

module.exports = router;