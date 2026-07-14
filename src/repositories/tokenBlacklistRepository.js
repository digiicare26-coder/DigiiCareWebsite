// src/repositories/tokenBlacklistRepository.js
const { identityPrisma } = require('../../db');

async function revoke(token, expiresAt) {
  // upsert — a duplicate logout call for the same still-valid token
  // should not blow up with a unique-constraint error.
  return identityPrisma.revokedToken.upsert({
    where: { token },
    update: {},
    create: { token, expiresAt },
  });
}

async function isRevoked(token) {
  const row = await identityPrisma.revokedToken.findUnique({ where: { token } });
  return !!row;
}

module.exports = { revoke, isRevoked };
