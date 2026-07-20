// src/routes/doctorRoute.js
const express = require('express');
const router = express.Router();
const {
  registerDoctor,
  getDoctor,
  updateDoctor,
  getDoctorPatients,
  // 🆕 Admin panel - doctor uploads own verification documents
  documentUpload,
  uploadDocument,
  getMyDocuments,
} = require('../controllers/doctorController');
const doctorAuthMiddleware = require('../middleware/doctorAuth');
const deidentifyMiddleware = require('../middleware/deidentify');

// ✅ Doctor login ban chuka hai — ab yeh routes bhi protected hain,
// bilkul Patient Profile jaisa. doctorToken JWT se aata hai.
router.post('/', doctorAuthMiddleware, deidentifyMiddleware, registerDoctor);
router.get('/', doctorAuthMiddleware, deidentifyMiddleware, getDoctor);
router.put('/', doctorAuthMiddleware, deidentifyMiddleware, updateDoctor);
router.get('/patients', doctorAuthMiddleware, deidentifyMiddleware, getDoctorPatients);

// 🆕 Doctor uploads their own verification documents (license/degree/
// CNIC/etc). An admin reviews + approves via /api/admin/doctors/... —
// see src/routes/adminRoute.js.
router.post('/documents', doctorAuthMiddleware, documentUpload.single('file'), uploadDocument);
router.get('/documents', doctorAuthMiddleware, getMyDocuments);

// 🆕 The admin panel this was waiting for now exists — doctor
// approval moved to PATCH /api/admin/doctors/:doctorToken/approve
// (src/routes/adminRoute.js), which also enforces that at least one
// of the doctor's documents has been verified first. Removed from
// here so there isn't a second, weaker path to the same action.

module.exports = router;