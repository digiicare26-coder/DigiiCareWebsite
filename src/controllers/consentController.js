// src/controllers/consentController.js
const clinicalRepository = require('../repositories/clinicalRepository');

// Yeh version disclaimer text ke sath match hona chahiye jo UI dikhati hai.
// Jab bhi disclaimer ka text badle, yahan version bhi badal dein
// (jaise "v1.0" -> "v2.0") — purane consents automatically "outdated" ho jayenge.
const { CURRENT_CONSENT_VERSION } = require('../config/consentConfig');

async function createConsent(req, res) {
  try {
    const { linkToken } = req.user;
    const { consentGiven } = req.body;

    if (typeof consentGiven !== 'boolean') {
      return res.status(400).json({ success: false, error: 'consentGiven must be true or false.' });
    }

    const consent = await clinicalRepository.createConsentLog(linkToken, consentGiven, CURRENT_CONSENT_VERSION);
    return res.status(201).json({ success: true, data: consent });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getConsentStatus(req, res) {
  try {
    const { linkToken } = req.user;
    const latest = await clinicalRepository.getLatestConsent(linkToken);

    if (!latest) {
      return res.status(200).json({
        success: true,
        data: { hasConsented: false, needsConsent: true, reason: 'No consent record found.' },
      });
    }

    const isCurrentVersion = latest.consentVersion === CURRENT_CONSENT_VERSION;
    const needsConsent = !latest.consentGiven || !isCurrentVersion;

    return res.status(200).json({
      success: true,
      data: {
        hasConsented: latest.consentGiven && isCurrentVersion,
        needsConsent,
        latestRecord: latest,
        reason: !latest.consentGiven
          ? 'Last response was a decline.'
          : !isCurrentVersion
          ? 'Consent was given on an older disclaimer version.'
          : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getConsentHistory(req, res) {
  try {
    const { linkToken } = req.user;
    const history = await clinicalRepository.getConsentHistory(linkToken);
    return res.status(200).json({ success: true, data: history });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { createConsent, getConsentStatus, getConsentHistory };