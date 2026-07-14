// src/services/passwordService.js
//
// Small wrapper around bcrypt so the rest of the app never touches
// a plain text password or a raw bcrypt call directly.

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = parseInt(process.env.PASSWORD_SALT_ROUNDS || '10', 10);

/**
 * Hashes a plain text password for storage. Called once, at signup.
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares a plain text password (typed at login) against the
 * stored hash. Returns true/false, never throws on mismatch.
 */
async function comparePassword(plainPassword, passwordHash) {
  if (!passwordHash) {
    // Account has no password set (e.g. legacy row) — never let
    // bcrypt.compare receive an undefined hash, just fail closed.
    return false;
  }
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = { hashPassword, comparePassword };
