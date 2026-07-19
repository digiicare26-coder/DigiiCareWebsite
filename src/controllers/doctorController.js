// src/controllers/doctorController.js
const clinicalRepository = require('../repositories/clinicalRepository');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// ============================================================
// 🆕 ADMIN PANEL: DOCTOR DOCUMENT UPLOAD (doctor-side)
// ============================================================
// A doctor uploads verification documents (license, degree, CNIC,
// etc.) here. An admin later reviews each one (VERIFIED/REJECTED)
// via the admin panel — see adminController.js — before the doctor
// profile can be approved.
// ============================================================

const DOCUMENTS_BASE_PATH = path.join(process.env.STORAGE_PATH || './uploads', 'doctor-documents');

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF allowed.'));
    }
  },
});

const ALLOWED_DOC_TYPES = ['LICENSE', 'DEGREE', 'CNIC', 'OTHER'];

/**
 * POST /api/doctor/documents  (multipart/form-data, field "file")
 * body: { docType }
 */
async function uploadDocument(req, res) {
  try {
    const { doctorToken } = req.doctor;
    const file = req.file;
    const docType = (req.body.docType || '').toUpperCase();

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded (field name: file).' });
    }
    if (!ALLOWED_DOC_TYPES.includes(docType)) {
      return res.status(400).json({
        success: false,
        error: `docType must be one of: ${ALLOWED_DOC_TYPES.join(', ')}`,
      });
    }

    const shortToken = doctorToken.substring(0, 8);
    const folder = path.join(DOCUMENTS_BASE_PATH, shortToken);
    await fs.ensureDir(folder);

    const fileName = `${docType}_${Date.now()}${path.extname(file.originalname)}`;
    const relativeFilePath = path.join('doctor-documents', shortToken, fileName);
    await fs.writeFile(path.join(DOCUMENTS_BASE_PATH, shortToken, fileName), file.buffer);

    const document = await clinicalRepository.createDoctorDocument(doctorToken, {
      docType,
      fileName: file.originalname,
      filePath: relativeFilePath,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    res.status(201).json({ success: true, data: document, message: 'Document uploaded. Waiting for admin review.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/doctor/documents — a doctor viewing their own uploaded
 * documents and their review status.
 */
async function getMyDocuments(req, res) {
  try {
    const { doctorToken } = req.doctor;
    const documents = await clinicalRepository.getDocumentsByDoctorToken(doctorToken);
    res.status(200).json({ success: true, data: documents });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function registerDoctor(req, res) {
  try {
    const { doctorToken } = req.doctor; // ✅ ab login (JWT) se aata hai
    const { specialization, qualification, experience } = req.body;

    const doctorId = await clinicalRepository.registerDoctor(doctorToken, { specialization, qualification, experience });
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);

    res.status(201).json({ success: true, data: doctor, message: 'Registered. Waiting for admin approval.' });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Clinical profile already exists for this doctor.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getDoctor(req, res) {
  try {
    const { doctorToken } = req.doctor;
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Clinical profile not found. Please register first.' });
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function updateDoctor(req, res) {
  try {
    const { doctorToken } = req.doctor;
    const doctorId = await clinicalRepository.updateDoctor(doctorToken, req.body);

    if (!doctorId) {
      return res.status(404).json({ success: false, error: 'Clinical profile not found.' });
    }
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);
    res.status(200).json({ success: true, data: doctor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Admin-side action — stays URL-based on purpose, since this is not
// the doctor acting on themself. Will move under real admin auth
// once the admin panel exists.
async function approveDoctor(req, res) {
  try {
    const { doctorToken } = req.params;
    const doctorId = await clinicalRepository.approveDoctor(doctorToken);

    if (!doctorId) {
      return res.status(404).json({ success: false, error: 'Doctor not found.' });
    }
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);
    res.status(200).json({ success: true, data: doctor, message: 'Doctor approved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getDoctorPatients(req, res) {
  try {
    const { doctorToken } = req.doctor;
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Clinical profile not found.' });
    }
    const consultations = await clinicalRepository.getConsultationsByDoctorToken(doctorToken);
    res.status(200).json({ success: true, data: consultations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  registerDoctor,
  getDoctor,
  updateDoctor,
  approveDoctor,
  getDoctorPatients,
  // 🆕 Admin panel - doctor document upload (doctor-side)
  documentUpload,
  uploadDocument,
  getMyDocuments,
};