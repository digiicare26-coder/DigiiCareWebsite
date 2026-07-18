// ============================================
// BE-4: Storage Routes - Complete (Versioning + Print)
// ============================================

const express = require('express');
const router = express.Router();
const {
  upload,
  uploadPrescription,
  uploadReport,
  getScans,
  getScan,
  deleteScan,
  // 🆕 BE-4 Versioning functions
  getScanHistory,
  getLatestVersion,
  getScanByVersion,
  // 🆕 BE-4 Print functions
  generatePrintPDF,
  downloadPDF,
  getPrintHistory
} = require('../controllers/uploadController');
const authMiddleware = require('../middleware/auth');
const deidentifyMiddleware = require('../middleware/deidentify');
const requireConsent = require('../middleware/requireConsent');

// ============================================================
// ALL ROUTES PROTECTED
// ============================================================

router.use(authMiddleware);
router.use(deidentifyMiddleware);

// ============================================================
// UPLOAD ROUTES
// ============================================================

router.post('/prescription', requireConsent, upload.single('file'), uploadPrescription);
router.post('/report', requireConsent, upload.single('file'), uploadReport);

// ============================================================
// SCAN RETRIEVAL ROUTES
// ============================================================

router.get('/scans', getScans);
router.get('/scans/:scanId', getScan);

// ============================================================
// 🆕 BE-4: VERSIONING ROUTES
// ============================================================

router.get('/scans/:scanId/history', getScanHistory);
router.get('/scans/:scanId/latest', getLatestVersion);
router.get('/scans/:scanId/version/:version', getScanByVersion);

// ============================================================
// 🆕 BE-4: PRINT ROUTES
// ============================================================

router.post('/scans/:scanId/print', generatePrintPDF);
router.get('/scans/:scanId/print/download', downloadPDF);
router.get('/scans/:scanId/print/history', getPrintHistory);

// ============================================================
// DELETE ROUTE
// ============================================================

router.delete('/scans/:scanId', deleteScan);

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = router;