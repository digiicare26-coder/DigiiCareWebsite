// src/routes/adminRoute.js
const express = require('express');
const router = express.Router();

const adminAuthController = require('../controllers/adminAuthController');
const adminController = require('../controllers/adminController');
const { logoutAdmin } = require('../controllers/logoutController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// ============================================================
// PUBLIC ROUTES
// ============================================================

// POST /api/admin/bootstrap
// body: { fullName, email, password }
// One-time only: works ONLY while zero admins exist. After the
// first admin is created this always returns 403 — use
// POST /api/admin/admins (below) instead.
router.post('/bootstrap', adminAuthController.bootstrap);

// POST /api/admin/login
// body: { email, password }
router.post('/login', adminAuthController.login);

// ============================================================
// PROTECTED ROUTES (require a valid admin JWT)
// ============================================================
router.use(adminAuthMiddleware);

// POST /api/admin/logout
router.post('/logout', logoutAdmin);

// POST /api/admin/admins
// body: { fullName, email, password }
// An existing admin creates another admin.
router.post('/admins', adminAuthController.createAdmin);

// --- Doctors: view profiles, verify documents, approve ---

// GET /api/admin/doctors?status=pending|approved|all
router.get('/doctors', adminController.listDoctors);

// GET /api/admin/doctors/:doctorToken
router.get('/doctors/:doctorToken', adminController.getDoctorDetail);

// PATCH /api/admin/doctors/:doctorToken/documents/:documentId/review
// body: { status: 'VERIFIED' | 'REJECTED', rejectionReason? }
router.patch('/doctors/:doctorToken/documents/:documentId/review', adminController.reviewDocument);

// PATCH /api/admin/doctors/:doctorToken/approve
// Requires at least one VERIFIED document for this doctor.
router.patch('/doctors/:doctorToken/approve', adminController.approveDoctor);

// --- Patients: view identity + non-clinical profile only ---
// (never vitals/scans/consultations — see adminController.js)

// GET /api/admin/patients
router.get('/patients', adminController.listPatients);

// GET /api/admin/patients/:patientId
router.get('/patients/:patientId', adminController.getPatientDetail);

module.exports = router;
