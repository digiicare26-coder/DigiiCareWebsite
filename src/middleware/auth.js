// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../services/tokenBlacklistService');

/**
 * Expects: Authorization: Bearer <token>
 * The token is issued by BE-1's Login API after OTP verification.
 * Its payload MUST contain at least { linkToken }.
 *
 * Sync with BE-1: when they build the Login API, the JWT they sign
 * needs to include `linkToken` in the payload — that's the only
 * thing this middleware (and the rest of BE-4's upload code) reads.
 */
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.linkToken) {
      return res.status(401).json({ error: 'Token payload missing linkToken' });
    }

    // Logout support: a token that's been explicitly logged out is
    // rejected even though its signature/expiry are still valid.
    if (await isTokenRevoked(token)) {
      return res.status(401).json({ error: 'Token has been logged out, please log in again' });
    }

    req.user = { linkToken: decoded.linkToken, patientId: decoded.patientId };
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
