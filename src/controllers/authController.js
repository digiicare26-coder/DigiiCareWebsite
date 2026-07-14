// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const { createPatientForSignup, findPatientByIdentifier } = require('../repositories/identityRepository');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const passwordService = require('../services/passwordService');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

// Very small sanity checks — just enough to catch obviously wrong
// input before it reaches the database. Real format validation
// (CNIC digit count, PK mobile prefixes, etc.) can be tightened later.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/signup
 * body: { fullName, email, cnic, mobileNumber, password }
 *
 * Creates a new patient account. The UID is never taken from the
 * request — it is assigned automatically and sequentially (1, 2,
 * 3, ...) by identityRepository, in the order accounts are created.
 * The password is hashed before it ever reaches the database.
 */
async function signup(req, res) {
  try {
    const { fullName, email, cnic, mobileNumber, password } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ success: false, error: 'fullName is required.' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email is required.' });
    }

    if (!cnic || typeof cnic !== 'string' || !cnic.trim()) {
      return res.status(400).json({ success: false, error: 'cnic is required.' });
    }

    if (!mobileNumber || typeof mobileNumber !== 'string' || !mobileNumber.trim()) {
      return res.status(400).json({ success: false, error: 'mobileNumber is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'password is required and must be at least 8 characters.' });
    }

    const passwordHash = await passwordService.hashPassword(password);

    const { patientId, uid } = await createPatientForSignup(
      fullName.trim(),
      email.trim().toLowerCase(),
      cnic.trim(),
      mobileNumber.trim(),
      passwordHash
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      patient: { patientId, uid, fullName: fullName.trim() },
    });
  } catch (err) {
    // createPatientForSignup turns unique-constraint violations into a
    // plain Error with a user-facing message — treat that as a 409.
    const statusCode = err.statusCode || (err.message.includes('already exists') ? 409 : 500);
    return res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/auth/request-otp
 * body: { identifier, password }   // identifier: email, CNIC, or mobile number — user's choice
 *
 * Password is checked first — only after it matches do we issue an
 * OTP. The OTP itself is always emailed, never sent by SMS, no
 * matter which of the three identifiers the user logged in with.
 */
async function requestOtp(req, res) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({ success: false, error: 'identifier is required (email, CNIC, or mobile number).' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'password is required.' });
    }

    const patient = await findPatientByIdentifier(identifier.trim());

    // Deliberately generic on both "no such account" and "wrong
    // password" — do not reveal which one it was, that itself is
    // information a spoofer could use to enumerate valid accounts.
    const invalidCredentialsResponse = () =>
      res.status(401).json({ success: false, error: 'Invalid identifier or password.' });

    if (!patient) {
      return invalidCredentialsResponse();
    }

    const passwordMatches = await passwordService.comparePassword(password, patient.passwordHash);
    if (!passwordMatches) {
      return invalidCredentialsResponse();
    }

    if (!patient.email) {
      return res.status(400).json({
        success: false,
        error: 'This account has no email on file to receive an OTP. Please contact support.',
      });
    }

    const { code, expiresInSeconds } = await otpService.issueOtp(patient.patientId);
    await emailService.sendOtpEmail(patient.email, code, OTP_EXPIRY_MINUTES);

    const response = {
      success: true,
      message: 'OTP sent to the registered email address.',
      expiresInSeconds,
    };

    // Dev convenience only — never expose the code outside local dev.
    if (process.env.NODE_ENV !== 'production') {
      response.devOtp = code;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/auth/verify-otp
 * body: { identifier, otp }
 *
 * On success, issues the JWT that src/middleware/auth.js expects —
 * payload MUST contain linkToken, since that's the only thing every
 * other protected route (e.g. BE-4's upload routes) reads off req.user.
 */
async function verifyOtp(req, res) {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ success: false, error: 'identifier and otp are both required.' });
    }

    const patient = await findPatientByIdentifier(identifier.trim());

    if (!patient) {
      return res.status(404).json({ success: false, error: 'No account found for this identifier.' });
    }

    await otpService.verifyOtp(patient.patientId, String(otp).trim());

    if (!patient.linkToken) {
      // Shouldn't happen in practice — every patient gets a link_token
      // at signup — but fail loudly rather than issuing a token
      // that downstream services can't use.
      return res.status(500).json({ success: false, error: 'Account is missing a link token. Contact support.' });
    }

    const token = jwt.sign(
      { linkToken: patient.linkToken.linkToken, patientId: patient.patientId },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      token,
      patient: { patientId: patient.patientId, fullName: patient.fullName },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

module.exports = { signup, requestOtp, verifyOtp };
