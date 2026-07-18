// ============================================
// BE-4: Print Routes - Auto-save + Print-Ready PDF
// ============================================

const express = require('express');
const router = express.Router();

// ✅ Controller import sahi se karein
const printController = require('../controllers/printController');

// ✅ FIX: auth.js default export karta hai (function directly),
// isliye curly braces { } use nahi karni — storageRoute.js jaisa hi pattern
const authMiddleware = require('../middleware/auth');

// ============================================
// All routes require authentication
// ============================================

/**
 * Generate a print-ready PDF
 * POST /api/print/:scanId/generate
 */
router.post(
    '/:scanId/generate',
    authMiddleware,
    printController.generatePrintPDF
);

/**
 * Download the generated PDF
 * GET /api/print/:scanId/download
 */
router.get(
    '/:scanId/download',
    authMiddleware,
    printController.downloadPDF
);

/**
 * Get print history for a scan
 * GET /api/print/:scanId/history
 */
router.get(
    '/:scanId/history',
    authMiddleware,
    printController.getPrintHistory
);

module.exports = router;