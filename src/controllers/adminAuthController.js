// src/controllers/adminAuthController.js
//
// Admin login is a plain email + password -> JWT flow (no OTP,
// unlike patients/doctors) since the admin panel is only ever used
// by trusted staff. Exactly one admin is meant to exist at first —
// created via the one-time bootstrap() below, which only works
// while zero admins exist. Every admin after that (including the
// bootstrap one) is created via createAdmin(), which requires an
// already-logged-in admin (adminAuthMiddleware).
const jwt = require('jsonwebtoken');
const {
  countAdmins,
  createAdmin: createAdminRow,
  findAdminByEmail,
} = require('../repositories/identityRepository');
const passwordService = require('../services/passwordService');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignupFields({ fullName, email, password }) {
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return 'fullName is required.';
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return 'A valid email is required.';
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return 'password is required and must be at least 8 characters.';
  }
  return null;
}

/**
 * POST /api/admin/bootstrap
 * body: { fullName, email, password }
 *
 * Creates the very first admin. Refuses if any admin already
 * exists — after that, new admins can only be created by an
 * existing admin via POST /api/admin/admins.
 */
async function bootstrap(req, res) {
  try {
    const existingAdminCount = await countAdmins();
    if (existingAdminCount > 0) {
      return res.status(403).json({
        success: false,
        error: 'An admin already exists. Ask an existing admin to create your account.',
      });
    }

    const validationError = validateSignupFields(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const { fullName, email, password } = req.body;
    const passwordHash = await passwordService.hashPassword(password);
    const admin = await createAdminRow(fullName.trim(), email.trim().toLowerCase(), passwordHash, null);

    return res.status(201).json({
      success: true,
      message: 'First admin account created successfully.',
      admin: { adminId: admin.adminId, fullName: admin.fullName, email: admin.email },
    });
  } catch (err) {
    const statusCode = err.statusCode || (err.message.includes('already exists') ? 409 : 500);
    return res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/admins
 * body: { fullName, email, password }
 * Requires an existing logged-in admin (adminAuthMiddleware). This
 * is the only way to create an admin once the first one exists.
 */
async function createAdmin(req, res) {
  try {
    const validationError = validateSignupFields(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const { fullName, email, password } = req.body;
    const passwordHash = await passwordService.hashPassword(password);
    const admin = await createAdminRow(
      fullName.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      req.admin.adminId
    );

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      admin: { adminId: admin.adminId, fullName: admin.fullName, email: admin.email },
    });
  } catch (err) {
    const statusCode = err.statusCode || (err.message.includes('already exists') ? 409 : 500);
    return res.status(statusCode).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/login
 * body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'email is required.' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'password is required.' });
    }

    const admin = await findAdminByEmail(email.trim().toLowerCase());

    const invalidCredentialsResponse = () =>
      res.status(401).json({ success: false, error: 'Invalid email or password.' });

    if (!admin) {
      return invalidCredentialsResponse();
    }

    const passwordMatches = await passwordService.comparePassword(password, admin.passwordHash);
    if (!passwordMatches) {
      return invalidCredentialsResponse();
    }

    const token = jwt.sign(
      { adminId: admin.adminId, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      token,
      admin: { adminId: admin.adminId, fullName: admin.fullName, email: admin.email },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

module.exports = { bootstrap, createAdmin, login };
