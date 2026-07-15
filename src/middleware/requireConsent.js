// src/middleware/requireConsent.js
//
// Blocks any request from a patient who hasn't given consent on the
// CURRENT disclaimer version. Must run AFTER authMiddleware — it
// reads req.user.linkToken, which authMiddleware sets from the JWT.
//
// Usage (in another team member's route file):
//   const requireConsent = require('../middleware/requireConsent');
//   router.use(authMiddleware, requireConsent);
//
// Owner: BE-2

const clinicalRepository = require('../repositories/clinicalRepository');
const { CURRENT_CONSENT_VERSION } = require('../config/consentConfig');

async function requireConsent(req, res, next) {
  try {
    const { linkToken } = req.user;

    const latest = await clinicalRepository.getLatestConsent(linkToken);

    const hasValidConsent =
      latest && latest.consentGiven && latest.consentVersion === CURRENT_CONSENT_VERSION;

    if (!hasValidConsent) {
      return res.status(403).json({
        success: false,
        error: 'Consent required before this action. Please accept the data-use disclaimer first.',
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = requireConsent;