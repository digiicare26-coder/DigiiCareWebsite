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
// src/middleware/auth.js
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.split(' ')[1];

  try {
    // 🔥 ADD THIS LOG
    console.log('Token received:', token.substring(0, 20) + '...');
    console.log('JWT_SECRET used:', process.env.JWT_SECRET ? 'Set' : 'NOT SET');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded); // 🔥 ADD THIS

    if (!decoded.linkToken) {
      return res.status(401).json({ error: 'Token payload missing linkToken' });
    }

    req.user = { linkToken: decoded.linkToken, patientId: decoded.patientId };
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth Error Details:', {
      name: err.name,
      message: err.message,
      token: token.substring(0, 20) + '...'
    }); // 🔥 ADD THIS
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
