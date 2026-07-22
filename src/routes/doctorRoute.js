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
const adminAuthMiddleware = require('../middleware/adminAuth');
const deidentifyMiddleware = require('../middleware/deidentify');

// Doctor login ban chuka hai — yeh routes doctor ke apne JWT se protected hain.
router.post('/', doctorAuthMiddleware, deidentifyMiddleware, registerDoctor);
router.get('/', doctorAuthMiddleware, deidentifyMiddleware, getDoctor);
router.put('/', doctorAuthMiddleware, deidentifyMiddleware, updateDoctor);
router.get('/patients', doctorAuthMiddleware, deidentifyMiddleware, getDoctorPatients);

// Admin action — admin panel now exists (see adminRoute.js). Fixed
// same issue as rewardsRoute.js: this was previously reachable by
// anyone, no auth at all.
router.patch('/:doctorToken/approve', adminAuthMiddleware, approveDoctor);

module.exports = router;