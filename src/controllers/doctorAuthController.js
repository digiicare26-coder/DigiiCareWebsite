// src/controllers/doctorAuthController.js
//
// Mirrors src/controllers/authController.js exactly, one-for-one,
// just for doctors instead of patients. The existing patient
// authController.js is not touched by this addition.
const jwt = require('jsonwebtoken');
const { createDoctorForSignup, findDoctorByIdentifier } = require('../repositories/identityRepository');
const doctorOtpService = require('../services/doctorOtpService');
const emailService = require('../services/emailService');
const passwordService = require('../services/passwordService');
const notificationService = require('../services/notificationService'); // 🆕 Notifications

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/doctor-auth/signup
 * body: { fullName, email, licenseNumber, mobileNumber, password }
 *
 * Creates a new doctor identity. uid is assigned automatically and
 * sequentially (1, 2, 3, ...) from doctor_uid_seq — a separate
 * sequence from patients' uid_seq. The doctorToken this returns is
 * the same identifier the existing POST /api/doctor endpoint
 * expects to register the clinical profile.
 */
async function signup(req, res) {
  try {
    const { fullName, email, licenseNumber, mobileNumber, password } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ success: false, error: 'fullName is required.' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email is required.' });
    }

    if (!licenseNumber || typeof licenseNumber !== 'string' || !licenseNumber.trim()) {
      return res.status(400).json({ success: false, error: 'licenseNumber is required.' });
    }

    if (!mobileNumber || typeof mobileNumber !== 'string' || !mobileNumber.trim()) {
      return res.status(400).json({ success: false, error: 'mobileNumber is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'password is required and must be at least 8 characters.' });
    }

    const passwordHash = await passwordService.hashPassword(password);

    const { doctorId, uid, doctorToken } = await createDoctorForSignup(
      fullName.trim(),
      email.trim().toLowerCase(),
      licenseNumber.trim(),
      mobileNumber.trim(),
      passwordHash
    );

    return res.status(201).json({
      success: true,
      message: 'Doctor account created successfully.',
      doctor: { doctorId, uid, fullName: fullName.trim(), doctorToken },
    });
  } catch (err) {
    const statusCode = err.statusCode || (err.message.includes('already exists') ? 409 : 500);
    return res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/doctor-auth/request-otp
 * body: { identifier, password }
 */
async function requestOtp(req, res) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({ success: false, error: 'identifier is required (email, license number, or mobile number).' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'password is required.' });
    }

    const doctor = await findDoctorByIdentifier(identifier.trim());

    const invalidCredentialsResponse = () =>
      res.status(401).json({ success: false, error: 'Invalid identifier or password.' });

    if (!doctor) {
      return invalidCredentialsResponse();
    }

    const passwordMatches = await passwordService.comparePassword(password, doctor.passwordHash);
    if (!passwordMatches) {
      return invalidCredentialsResponse();
    }

    if (!doctor.email) {
      return res.status(400).json({
        success: false,
        error: 'This account has no email on file to receive an OTP. Please contact support.',
      });
    }

    const { code, expiresInSeconds } = await doctorOtpService.issueOtp(doctor.doctorId);
    await emailService.sendOtpEmail(doctor.email, code, OTP_EXPIRY_MINUTES);

    const response = {
      success: true,
      message: 'OTP sent to the registered email address.',
      expiresInSeconds,
    };

    if (process.env.NODE_ENV !== 'production') {
      response.devOtp = code;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/doctor-auth/verify-otp
 * body: { identifier, otp }
 *
 * On success, issues a JWT with { doctorToken, doctorId, role: 'doctor' }
 * — src/middleware/doctorAuth.js expects exactly this shape.
 */
async function verifyOtp(req, res) {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ success: false, error: 'identifier and otp are both required.' });
    }

    const doctor = await findDoctorByIdentifier(identifier.trim());

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'No account found for this identifier.' });
    }

    await doctorOtpService.verifyOtp(doctor.doctorId, String(otp).trim());

    if (!doctor.doctorToken) {
      return res.status(500).json({ success: false, error: 'Account is missing a doctor token. Contact support.' });
    }

    const token = jwt.sign(
      { doctorToken: doctor.doctorToken.doctorToken, doctorId: doctor.doctorId, role: 'doctor' },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 🆕 Notify doctor: OTP verified successfully
    notificationService.notifyDoctorOtpVerified(doctor.doctorId);

    return res.status(200).json({
      success: true,
      token,
      doctor: { doctorId: doctor.doctorId, fullName: doctor.fullName, doctorToken: doctor.doctorToken.doctorToken },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

module.exports = { signup, requestOtp, verifyOtp };
