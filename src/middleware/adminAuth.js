// src/middleware/adminAuth.js
//
// Mirrors src/middleware/doctorAuth.js exactly, one-for-one, just
// for an admin's JWT payload ({ adminId, role: 'admin' }) instead of
// a doctor's. Kept separate so the existing patient/doctor
// middleware are never touched by this addition.
const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../services/tokenBlacklistService');

async function adminAuthMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.adminId || decoded.role !== 'admin') {
      return res.status(401).json({ error: 'Token payload missing adminId' });
    }

    if (await isTokenRevoked(token)) {
      return res.status(401).json({ error: 'Token has been logged out, please log in again' });
    }

    req.admin = { adminId: decoded.adminId, email: decoded.email };
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = adminAuthMiddleware;
