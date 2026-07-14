// src/services/linkingService.js
require('dotenv').config();
const crypto = require('crypto');

const PEPPER = process.env.LINK_TOKEN_SECRET;

if (!PEPPER) {
  throw new Error('LINK_TOKEN_SECRET is not set. Refusing to start.');
}

function generateLinkToken(identityId) {
  if (!identityId) {
    throw new Error('generateLinkToken: identityId is required');
  }
  return crypto
    .createHmac('sha256', PEPPER)
    .update(identityId)
    .digest('hex');
}

module.exports = { generateLinkToken };