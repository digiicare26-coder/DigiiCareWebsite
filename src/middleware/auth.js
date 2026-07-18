// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../services/tokenBlacklistService');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.split(' ')[1];

  try {
    console.log('Token received:', token.substring(0, 20) + '...');
    console.log('JWT_SECRET used:', process.env.JWT_SECRET ? 'Set' : 'NOT SET');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    if (!decoded.linkToken) {
      return res.status(401).json({ error: 'Token payload missing linkToken' });
    }

    // 🔥 FIX: Agar linkToken object hai toh usme se linkToken string lo
    const linkToken = typeof decoded.linkToken === 'string' 
      ? decoded.linkToken 
      : decoded.linkToken?.linkToken || decoded.linkToken;

    req.user = { 
      linkToken: linkToken, 
      patientId: decoded.patientId 
    };
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth Error Details:', {
      name: err.name,
      message: err.message,
      token: token.substring(0, 20) + '...'
    });
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;