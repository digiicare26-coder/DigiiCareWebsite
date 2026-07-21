// ============================================
// BE-4: Upload Controller - Complete (Versioning + Print + Existing)
// ============================================

const storageService = require('../services/storageService');
const ocrService = require('../services/ocrService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import repositories for versioning
const clinicalRepository = require('../repositories/clinicalRepository');
const identityRepository = require('../repositories/identityRepository'); // 🆕 Notifications
const notificationService = require('../services/notificationService');   // 🆕 Notifications
const pdfService = require('../services/pdfService');

// ============================================================
// MULTER CONFIGURATION
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF allowed.'));
    }
  }
});

// ============================================================
// EXISTING UPLOAD FUNCTIONS (Modified for Versioning)
// ============================================================

/**
 * Upload Prescription (with versioning support)
 * POST /api/storage/upload-prescription
 */
async function uploadPrescription(req, res) {
  try {
    const { linkToken } = req.user;
    const file = req.file;
    const { isReupload, originalScanId } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if this is a re-upload (new version)
    if (isReupload === 'true' && originalScanId) {
      // Create a new version using repository
      const scanData = {
        scanType: 'prescription',
        fileName: file.originalname,
        filePath: file.path || `uploads/${Date.now()}_${file.originalname}`,
        thumbnailPath: null,
        fileSize: file.size,
        mimeType: file.mimetype,
        metadata: { category: req.body.category || 'general' }
      };

      const newVersion = await clinicalRepository.createNewVersion(originalScanId, scanData);

      // Log audit
      await clinicalRepository.logAudit({
        linkToken,
        action: 'RE_UPLOAD_PRESCRIPTION',
        scanId: newVersion.scanId,
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(201).json({
        success: true,
        data: {
          scanId: newVersion.scanId,
          version: newVersion.version,
          isLatest: newVersion.isLatest,
          parentScanId: newVersion.parentScanId,
          scanType: 'prescription'
        },
        message: `Prescription version ${newVersion.version} uploaded successfully`
      });
    }

    // Regular upload (first version)
    const result = await storageService.uploadFile(
      file,
      linkToken,
      'prescription',
      { category: req.body.category || 'general' },
      req
    );

    // OCR Processing
    let ocrResult = null;
    try {
      const extractedText = await ocrService.extractText(
        result.filePath,
        file.mimetype,
        'eng'
      );
      
      if (extractedText) {
        await storageService.updateScanOCR(result.scanId, extractedText);
        ocrResult = {
          text: extractedText,
          language: 'eng',
          medicineCount: ocrService.extractMedicineNames(extractedText).length
        };
      }
    } catch (ocrError) {
      console.error('OCR Error:', ocrError.message);
    }

    res.status(201).json({
      success: true,
      data: {
        ...result,
        version: 1,
        isLatest: true,
        ocr: ocrResult || { status: 'pending' }
      },
      message: 'Prescription uploaded successfully'
    });

    // 🆕 Notify patient: prescription uploaded & processed
    const patientForPrescription = await identityRepository.findPatientByLinkToken(linkToken);
    if (patientForPrescription) {
      notificationService.notifyScanUploaded(patientForPrescription.patientId, 'prescription');
    }

  } catch (error) {
    console.error('Upload Prescription Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Upload Report (with versioning support)
 * POST /api/storage/upload-report
 */
async function uploadReport(req, res) {
  try {
    const { linkToken } = req.user;
    const file = req.file;
    const { isReupload, originalScanId } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if this is a re-upload (new version)
    if (isReupload === 'true' && originalScanId) {
      const scanData = {
        scanType: 'report',
        fileName: file.originalname,
        filePath: file.path || `uploads/${Date.now()}_${file.originalname}`,
        thumbnailPath: null,
        fileSize: file.size,
        mimeType: file.mimetype,
        metadata: { reportType: req.body.reportType || 'general' }
      };

      const newVersion = await clinicalRepository.createNewVersion(originalScanId, scanData);

      await clinicalRepository.logAudit({
        linkToken,
        action: 'RE_UPLOAD_REPORT',
        scanId: newVersion.scanId,
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(201).json({
        success: true,
        data: {
          scanId: newVersion.scanId,
          version: newVersion.version,
          isLatest: newVersion.isLatest,
          parentScanId: newVersion.parentScanId,
          scanType: 'report'
        },
        message: `Report version ${newVersion.version} uploaded successfully`
      });
    }

    // Regular upload (first version)
    const result = await storageService.uploadFile(
      file,
      linkToken,
      'report',
      { reportType: req.body.reportType || 'general' },
      req
    );

    let ocrResult = null;
    try {
      const extractedText = await ocrService.extractText(
        result.filePath,
        file.mimetype,
        'eng'
      );
      
      if (extractedText) {
        await storageService.updateScanOCR(result.scanId, extractedText);
        ocrResult = {
          text: extractedText,
          language: 'eng'
        };
      }
    } catch (ocrError) {
      console.error('OCR Error:', ocrError.message);
    }

    res.status(201).json({
      success: true,
      data: {
        ...result,
        version: 1,
        isLatest: true,
        ocr: ocrResult || { status: 'pending' }
      },
      message: 'Report uploaded successfully'
    });

    // 🆕 Notify patient: report uploaded & processed
    const patientForReport = await identityRepository.findPatientByLinkToken(linkToken);
    if (patientForReport) {
      notificationService.notifyScanUploaded(patientForReport.patientId, 'report');
    }

  } catch (error) {
    console.error('Upload Report Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ============================================================
// EXISTING SCAN RETRIEVAL FUNCTIONS (Modified for Versioning)
// ============================================================

/**
 * Get all scans for a patient (only latest versions)
 * GET /api/storage/scans
 */
async function getScans(req, res) {
  try {
    const { linkToken } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Use repository to get only latest versions
    const result = await clinicalRepository.getScansByToken(linkToken, page, limit);

    res.json({
      success: true,
      data: result.scans,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });

  } catch (error) {
    console.error('Get Scans Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get scan by ID
 * GET /api/storage/scan/:scanId
 */
async function getScan(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId } = req.params;

    const scan = await clinicalRepository.getScanById(scanId, linkToken);

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }

    res.json({
      success: true,
      data: scan
    });

  } catch (error) {
    console.error('Get Scan Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Delete a scan (soft delete)
 * DELETE /api/storage/scan/:scanId
 */
async function deleteScan(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId } = req.params;

    const result = await clinicalRepository.deleteScan(scanId, linkToken);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found or already deleted'
      });
    }

    await clinicalRepository.logAudit({
      linkToken,
      action: 'DELETE_SCAN',
      scanId: scanId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Scan deleted successfully'
    });

  } catch (error) {
    console.error('Delete Scan Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ============================================================
// 🆕 BE-4: VERSIONING FUNCTIONS
// ============================================================

/**
 * Get scan history (all versions)
 * GET /api/storage/scan/:scanId/history
 */
async function getScanHistory(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId } = req.params;

    // Verify user has access
    const scan = await clinicalRepository.getScanById(scanId, linkToken);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found or access denied'
      });
    }

    const history = await clinicalRepository.getScanHistory(scanId);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Get Scan History Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get latest version of a scan
 * GET /api/storage/scan/:scanId/latest
 */
async function getLatestVersion(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId } = req.params;

    // Verify user has access
    const scan = await clinicalRepository.getScanById(scanId, linkToken);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found or access denied'
      });
    }

    const latest = await clinicalRepository.getLatestVersion(scanId);

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: 'No version found'
      });
    }

    res.json({
      success: true,
      data: latest
    });

  } catch (error) {
    console.error('Get Latest Version Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get specific version by version number
 * GET /api/storage/scan/:scanId/version/:version
 */
async function getScanByVersion(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId, version } = req.params;

    // Verify user has access
    const scan = await clinicalRepository.getScanById(scanId, linkToken);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found or access denied'
      });
    }

    const rootId = scan.parentScanId || scan.scanId;
    const versionScan = await clinicalRepository.getScanByVersion(rootId, parseInt(version));

    if (!versionScan) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      });
    }

    res.json({
      success: true,
      data: versionScan
    });

  } catch (error) {
    console.error('Get Scan By Version Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ============================================================
// 🆕 BE-4: PRINT FUNCTIONS
// ============================================================

/**
 * Generate a print-ready PDF for a scan
 * POST /api/storage/scan/:scanId/print
 */
async function generatePrintPDF(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId } = req.params;

    // Verify user has access
    const scan = await clinicalRepository.getScanById(scanId, linkToken);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found or access denied'
      });
    }

    // Get images for the scan
    const imagePaths = await getImagePathsForScan(scanId);

    if (imagePaths.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No images found for this scan'
      });
    }

    // Generate PDF
    const result = await pdfService.generatePrintPDF(scanId, imagePaths);

    // Update scan with print info
    await clinicalRepository.updateScanPrintInfo(scanId, result.pdfPath);

    // Create print job log
    await clinicalRepository.createPrintJob(scanId, result.pdfPath);

    // Log audit
    await clinicalRepository.logAudit({
      linkToken,
      action: 'GENERATE_PDF',
      scanId: scanId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Print-ready PDF generated successfully',
      data: {
        scanId: scanId,
        pdfPath: result.pdfPath,
        printedAt: new Date(),
        downloadUrl: `/api/storage/scan/${scanId}/print/download`
      }
    });

  } catch (error) {
    console.error('Generate PDF Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Download the generated PDF
 * GET /api/storage/scan/:scanId/print/download
 */
async function downloadPDF(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId } = req.params;

    // Verify user has access
    const scan = await clinicalRepository.getScanById(scanId, linkToken);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found or access denied'
      });
    }

    // Get PDF path
    const pdfPath = await pdfService.getPDFPath(scanId);

    if (!pdfPath) {
      return res.status(404).json({
        success: false,
        error: 'PDF not found. Please generate it first.'
      });
    }

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found on server'
      });
    }

    // Send file
    const fileName = `scan_${scanId}.pdf`;
    res.download(pdfPath, fileName, (err) => {
      if (err) {
        console.error('Download Error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to download PDF'
          });
        }
      }
    });

  } catch (error) {
    console.error('Download PDF Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get print history for a scan
 * GET /api/storage/scan/:scanId/print/history
 */
async function getPrintHistory(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId } = req.params;

    // Verify user has access
    const scan = await clinicalRepository.getScanById(scanId, linkToken);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found or access denied'
      });
    }

    const printJobs = await clinicalRepository.getPrintJobsByScanId(scanId);

    res.json({
      success: true,
      data: printJobs
    });

  } catch (error) {
    console.error('Get Print History Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get image paths for a scan
 */
async function getImagePathsForScan(scanId) {
  try {
    const scan = await clinicalRepository.getScanById(scanId, null);
    if (scan && scan.filePath) {
      // Check if file exists
      if (fs.existsSync(scan.filePath)) {
        return [scan.filePath];
      }
    }
    return [];
  } catch (error) {
    console.error('Get Images Error:', error);
    return [];
  }
}

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = {
  // Multer
  upload,

  // Existing upload functions (modified)
  uploadPrescription,
  uploadReport,

  // Existing retrieval functions (modified)
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
};