// src/routes/doctorRoute.js
const express = require('express');
const router = express.Router();
const {
  registerDoctor,
  getDoctor,
  updateDoctor,
  approveDoctor,
  getDoctorPatients,
} = require('../controllers/doctorController');
const doctorAuthMiddleware = require('../middleware/doctorAuth');
const deidentifyMiddleware = require('../middleware/deidentify');

// ✅ Doctor login ban chuka hai — ab yeh routes bhi protected hain,
// bilkul Patient Profile jaisa. doctorToken JWT se aata hai.
router.post('/', doctorAuthMiddleware, deidentifyMiddleware, registerDoctor);
router.get('/', doctorAuthMiddleware, deidentifyMiddleware, getDoctor);
router.put('/', doctorAuthMiddleware, deidentifyMiddleware, updateDoctor);
router.get('/patients', doctorAuthMiddleware, deidentifyMiddleware, getDoctorPatients);

// Admin action — no auth yet (admin panel not built), stays as-is.
router.patch('/:doctorToken/approve', approveDoctor);

module.exports = router;