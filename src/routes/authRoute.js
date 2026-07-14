// src/routes/authRoute.js
const express = require('express');
const router = express.Router();
const { signup, requestOtp, verifyOtp } = require('../controllers/authController');
const { logoutPatient } = require('../controllers/logoutController');
const authMiddleware = require('../middleware/auth');

// No authMiddleware here on purpose — you can't have a token yet,
// that's the whole point of these routes.
router.post('/signup', signup);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);

// Logout DOES need a token — it blacklists the exact one you're
// currently holding.
router.post('/logout', authMiddleware, logoutPatient);

module.exports = router;
