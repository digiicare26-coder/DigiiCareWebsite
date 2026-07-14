// src/routes/storageRoutes.js
const express = require('express');
const router = express.Router();
const {
  upload,
  uploadPrescription,
  uploadReport,
  getScans,      // 🔥 ADD
  getScan,       // 🔥 ADD
  deleteScan     // 🔥 ADD
} = require('../controllers/uploadController');
const authMiddleware = require('../middleware/auth');

// 🔥 All routes protected
router.use(authMiddleware);

// Upload routes
router.post('/prescription', upload.single('file'), uploadPrescription);
router.post('/report', upload.single('file'), uploadReport);

// Get routes
router.get('/scans', getScans);              // 🔥 ADD
router.get('/scans/:scanId', getScan);       // 🔥 ADD

// Delete route
router.delete('/scans/:scanId', deleteScan); // 🔥 ADD

module.exports = router;