// src/config/consentConfig.js
// Single source of truth for the current disclaimer version.
// Update this ONE place whenever the disclaimer text changes —
// both consentController.js and requireConsent.js read from here,
// so they can never drift out of sync with each other.

const CURRENT_CONSENT_VERSION = 'v1.0';

module.exports = { CURRENT_CONSENT_VERSION };