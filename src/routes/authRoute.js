// src/routes/authRoute.js
const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const { logoutPatient } = require('../controllers/logoutController');

// Auth middleware — default export (a function), NOT { authenticateToken }
const authMiddleware = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES (no token needed yet)
// ============================================

// POST /api/auth/signup
// body: { fullName, email, cnic, mobileNumber, password }
router.post('/signup', authController.signup);

// POST /api/auth/request-otp
// body: { identifier, password }   -- step 1 of login: checks password, emails an OTP
router.post('/request-otp', authController.requestOtp);

// POST /api/auth/verify-otp
// body: { identifier, otp }        -- step 2 of login: verifies OTP, issues the JWT
router.post('/verify-otp', authController.verifyOtp);

// ============================================
// PROTECTED ROUTES (need a valid JWT)
// ============================================

// POST /api/auth/logout
router.post('/logout', authMiddleware, logoutPatient);

module.exports = router;