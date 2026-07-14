// src/services/tokenBlacklistService.js
//
// JWTs are stateless by design — verifying a token's signature is
// not enough to know if the user has "logged out". This service is
// what makes a logout endpoint actually do something: it records
// the exact token string, and every protected request (patient or
// doctor) checks the token against this table before trusting it.
const jwt = require('jsonwebtoken');
const tokenBlacklistRepo = require('../repositories/tokenBlacklistRepository');

/**
 * Marks a token as logged-out. Reads the token's own `exp` claim so
 * the blacklist row can eventually be cleaned up once the token
 * would have expired naturally anyway.
 */
async function revokeToken(token) {
  const decoded = jwt.decode(token);
  const expiresAt = decoded && decoded.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback: 7 days out

  await tokenBlacklistRepo.revoke(token, expiresAt);
}

async function isTokenRevoked(token) {
  return tokenBlacklistRepo.isRevoked(token);
}

module.exports = { revokeToken, isTokenRevoked };
