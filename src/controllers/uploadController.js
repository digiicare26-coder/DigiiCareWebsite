// src/controllers/uploadController.js
const storageService = require('../services/storageService');
const ocrService = require('../services/ocrService');
const multer = require('multer');

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

async function uploadPrescription(req, res) {
  try {
    const { linkToken } = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await storageService.uploadFile(
      file,
      linkToken,
      'prescription',
      { category: req.body.category || 'general' },
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
        ocr: ocrResult || { status: 'pending' }
      },
      message: 'Prescription uploaded successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function uploadReport(req, res) {
  try {
    const { linkToken } = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

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
        ocr: ocrResult || { status: 'pending' }
      },
      message: 'Report uploaded successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function getScans(req, res) {
  try {
    const { linkToken } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await storageService.getUserScans(linkToken, page, limit);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function getScan(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId } = req.params;

    const scan = await storageService.getScan(scanId, linkToken);

    res.json({
      success: true,
      data: scan
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function deleteScan(req, res) {
  try {
    const { linkToken } = req.user;
    const { scanId } = req.params;

    const result = await storageService.deleteScan(scanId, linkToken, req);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  upload,
  uploadPrescription,
  uploadReport,
  getScans,
  getScan,
  deleteScan
};