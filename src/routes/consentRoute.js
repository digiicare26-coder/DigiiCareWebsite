// src/routes/consentRoute.js
const express = require('express');
const router = express.Router();
const {
  createConsent,
  getConsentStatus,
  getConsentHistory,
} = require('../controllers/consentController');
const authMiddleware = require('../middleware/auth');

// All routes require patient login — linkToken comes from the JWT.
router.use(authMiddleware);

router.post('/', createConsent);
router.get('/status', getConsentStatus);
router.get('/history', getConsentHistory);

module.exports = router;