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
const deidentifyMiddleware = require('../middleware/deidentify');

// 🔥 All routes protected — linkToken comes from the logged-in user's JWT
router.use(authMiddleware);
router.use(deidentifyMiddleware);

router.post('/', createProfile);
router.get('/', getProfile);
router.put('/', updateProfile);
router.delete('/', deleteProfile);

module.exports = router;