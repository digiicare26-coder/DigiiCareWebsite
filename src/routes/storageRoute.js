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

// ============================================================
// ALL ROUTES PROTECTED
// ============================================================

router.use(authMiddleware);
router.use(deidentifyMiddleware);

// ============================================================
// UPLOAD ROUTES
// ============================================================

/**
 * Upload Prescription
 * POST /api/storage/prescription
 * Body: file (multipart/form-data), isReupload, originalScanId
 */
router.post('/prescription', upload.single('file'), uploadPrescription);

/**
 * Upload Report
 * POST /api/storage/report
 * Body: file (multipart/form-data), isReupload, originalScanId
 */
router.post('/report', upload.single('file'), uploadReport);

// ============================================================
// SCAN RETRIEVAL ROUTES
// ============================================================

/**
 * Get all scans for a patient (only latest versions)
 * GET /api/storage/scans?page=1&limit=10
 */
router.get('/scans', getScans);

/**
 * Get scan by ID
 * GET /api/storage/scans/:scanId
 */
router.get('/scans/:scanId', getScan);

// ============================================================
// 🆕 BE-4: VERSIONING ROUTES
// ============================================================

/**
 * Get scan history (all versions)
 * GET /api/storage/scans/:scanId/history
 */
router.get('/scans/:scanId/history', getScanHistory);

/**
 * Get latest version of a scan
 * GET /api/storage/scans/:scanId/latest
 */
router.get('/scans/:scanId/latest', getLatestVersion);

/**
 * Get specific version by version number
 * GET /api/storage/scans/:scanId/version/:version
 */
router.get('/scans/:scanId/version/:version', getScanByVersion);

// ============================================================
// 🆕 BE-4: PRINT ROUTES
// ============================================================

/**
 * Generate a print-ready PDF for a scan
 * POST /api/storage/scans/:scanId/print
 */
router.post('/scans/:scanId/print', generatePrintPDF);

/**
 * Download the generated PDF
 * GET /api/storage/scans/:scanId/print/download
 */
router.get('/scans/:scanId/print/download', downloadPDF);

/**
 * Get print history for a scan
 * GET /api/storage/scans/:scanId/print/history
 */
router.get('/scans/:scanId/print/history', getPrintHistory);

// ============================================================
// DELETE ROUTE
// ============================================================

/**
 * Delete a scan (soft delete)
 * DELETE /api/storage/scans/:scanId
 */
router.delete('/scans/:scanId', deleteScan);

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = router;