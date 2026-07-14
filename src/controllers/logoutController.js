// src/controllers/logoutController.js
const { revokeToken } = require('../services/tokenBlacklistService');

/**
 * POST /api/auth/logout   (protected by src/middleware/auth.js)
 * Blacklists the exact token that was used to authenticate this
 * request — every future request with that same token will now be
 * rejected by authMiddleware, even though the JWT itself is still
 * validly signed and not yet expired.
 */
async function logoutPatient(req, res) {
  try {
    await revokeToken(req.token);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/doctor-auth/logout   (protected by src/middleware/doctorAuth.js)
 */
async function logoutDoctor(req, res) {
  try {
    await revokeToken(req.token);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { logoutPatient, logoutDoctor };
