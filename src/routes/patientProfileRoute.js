// src/routes/patientProfileRoute.js
const express = require('express');
const router = express.Router();
const {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
} = require('../controllers/patientProfileController');
const authMiddleware = require('../middleware/auth');

// 🔥 All routes protected — linkToken comes from the logged-in user's JWT
router.use(authMiddleware);
const requireConsent = require('../middleware/requireConsent'); // TEMP - testing only
router.use(requireConsent); // TEMP - testing only

router.post('/', createProfile);
router.get('/', getProfile);
router.put('/', updateProfile);
router.delete('/', deleteProfile);

module.exports = router;