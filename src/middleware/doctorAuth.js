// src/middleware/doctorAuth.js
//
// Mirrors src/middleware/auth.js exactly, one-for-one, just for a
// doctor's JWT payload ({ doctorToken, doctorId }) instead of a
// patient's ({ linkToken, patientId }). Kept separate so the
// existing patient middleware is never touched by this addition.
const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../services/tokenBlacklistService');

async function doctorAuthMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.doctorToken || decoded.role !== 'doctor') {
      return res.status(401).json({ error: 'Token payload missing doctorToken' });
    }

    if (await isTokenRevoked(token)) {
      return res.status(401).json({ error: 'Token has been logged out, please log in again' });
    }

    req.doctor = { doctorToken: decoded.doctorToken, doctorId: decoded.doctorId };
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = doctorAuthMiddleware;
