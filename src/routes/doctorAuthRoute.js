// src/routes/doctorAuthRoute.js
const express = require('express');
const router = express.Router();
const { signup, requestOtp, verifyOtp } = require('../controllers/doctorAuthController');
const { logoutDoctor } = require('../controllers/logoutController');
const doctorAuthMiddleware = require('../middleware/doctorAuth');

// No doctorAuthMiddleware here on purpose — same reasoning as
// authRoute.js: you can't have a token yet.
router.post('/signup', signup);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);

router.post('/logout', doctorAuthMiddleware, logoutDoctor);

module.exports = router;
