// src/controllers/adminController.js
//
// Everything here requires an authenticated admin
// (src/middleware/adminAuth.js on every route in adminRoute.js).
const identityRepository = require('../repositories/identityRepository');
const clinicalRepository = require('../repositories/clinicalRepository');
const notificationService = require('../services/notificationService'); // 🆕 Notifications

// ============================================================
// DOCTORS: list, detail, document review, approval
// ============================================================

/**
 * GET /api/admin/doctors?status=pending|approved|all
 * Merges each doctor's identity row (name/email/license/mobile)
 * with their clinical profile (specialization/isApproved) and
 * uploaded documents, so the admin sees everything needed to
 * decide in one place.
 */
async function listDoctors(req, res) {
  try {
    const status = (req.query.status || 'all').toLowerCase();

    const doctors = await identityRepository.getAllDoctors();

    const merged = await Promise.all(
      doctors.map(async (doctor) => {
        const doctorToken = doctor.doctorToken?.doctorToken || null;
        const clinicalProfile = doctorToken ? await clinicalRepository.getDoctorByToken(doctorToken) : null;
        const documents = doctorToken ? await clinicalRepository.getDocumentsByDoctorToken(doctorToken) : [];

        return {
          doctorId: doctor.doctorId,
          fullName: doctor.fullName,
          email: doctor.email,
          licenseNumber: doctor.licenseNumber,
          mobileNumber: doctor.mobileNumber,
          uid: doctor.uid,
          doctorToken,
          clinicalProfile: clinicalProfile
            ? {
                specialization: clinicalProfile.specialization,
                qualification: clinicalProfile.qualification,
                experience: clinicalProfile.experience,
                isApproved: clinicalProfile.isApproved,
              }
            : null,
          documents: documents.map((d) => ({
            documentId: d.documentId,
            docType: d.docType,
            fileName: d.fileName,
            status: d.status,
            uploadedAt: d.uploadedAt,
          })),
        };
      })
    );

    const filtered = merged.filter((d) => {
      if (status === 'pending') return !d.clinicalProfile || !d.clinicalProfile.isApproved;
      if (status === 'approved') return d.clinicalProfile && d.clinicalProfile.isApproved;
      return true; // 'all'
    });

    res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/doctors/:doctorToken
 * Full detail for one doctor, including every uploaded document
 * (with file path so the admin can open/download and verify it).
 */
async function getDoctorDetail(req, res) {
  try {
    const { doctorToken } = req.params;

    const doctor = await identityRepository.findDoctorByToken(doctorToken);
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found.' });
    }

    const clinicalProfile = await clinicalRepository.getDoctorByToken(doctorToken);
    const documents = await clinicalRepository.getDocumentsByDoctorToken(doctorToken);

    res.status(200).json({
      success: true,
      data: {
        doctorId: doctor.doctorId,
        fullName: doctor.fullName,
        email: doctor.email,
        licenseNumber: doctor.licenseNumber,
        mobileNumber: doctor.mobileNumber,
        uid: doctor.uid,
        doctorToken,
        clinicalProfile: clinicalProfile
          ? {
              specialization: clinicalProfile.specialization,
              qualification: clinicalProfile.qualification,
              experience: clinicalProfile.experience,
              isApproved: clinicalProfile.isApproved,
            }
          : null,
        documents,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/admin/doctors/:doctorToken/documents/:documentId/review
 * body: { status: 'VERIFIED' | 'REJECTED', rejectionReason? }
 */
async function reviewDocument(req, res) {
  try {
    const { doctorToken, documentId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: "status must be 'VERIFIED' or 'REJECTED'." });
    }

    const existing = await clinicalRepository.getDoctorDocumentById(documentId);
    if (!existing || existing.doctorToken !== doctorToken) {
      return res.status(404).json({ success: false, error: 'Document not found for this doctor.' });
    }

    const updated = await clinicalRepository.reviewDoctorDocument(documentId, status, rejectionReason);

    // 🆕 Notify doctor: document verified/rejected
    const doctorForDoc = await identityRepository.findDoctorByToken(doctorToken);
    if (doctorForDoc) {
      notificationService.notifyDoctorDocumentReviewed(doctorForDoc.doctorId, {
        docType: existing.docType,
        status,
        rejectionReason,
      });
    }

    res.status(200).json({ success: true, data: updated, message: `Document marked ${status.toLowerCase()}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/admin/doctors/:doctorToken/approve
 * Requires at least one of the doctor's documents to already be
 * VERIFIED — approval without verifying documents first is refused.
 * Once approved, the doctor becomes visible/bookable to patients
 * (see consultationController.js's isApproved check).
 */
async function approveDoctor(req, res) {
  try {
    const { doctorToken } = req.params;

    const clinicalProfile = await clinicalRepository.getDoctorByToken(doctorToken);
    if (!clinicalProfile) {
      return res.status(404).json({ success: false, error: 'Doctor clinical profile not found.' });
    }

    const verified = await clinicalRepository.hasVerifiedDocument(doctorToken);
    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Verify at least one of this doctor\'s documents before approving.',
      });
    }

    const doctorId = await clinicalRepository.approveDoctor(doctorToken);
    if (!doctorId) {
      return res.status(404).json({ success: false, error: 'Doctor not found.' });
    }
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);

    // 🆕 Notify doctor: profile approved
    const doctorIdentity = await identityRepository.findDoctorByToken(doctorToken);
    if (doctorIdentity) {
      notificationService.notifyDoctorApproved(doctorIdentity.doctorId);
    }

    res.status(200).json({ success: true, data: doctor, message: 'Doctor approved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ============================================================
// PATIENTS: list, detail — identity + non-clinical profile ONLY.
// Vitals/Scans/Consultations/ConsentLogs are never queried here,
// so there is no path for clinical data to leak into these
// responses even by accident.
// ============================================================

/**
 * GET /api/admin/patients
 */
async function listPatients(req, res) {
  try {
    const patients = await identityRepository.getAllPatients();

    const merged = await Promise.all(
      patients.map(async (patient) => {
        const linkToken = patient.linkToken?.linkToken || null;
        const profile = linkToken ? await clinicalRepository.getPatientProfileByToken(linkToken) : null;

        return {
          patientId: patient.patientId,
          fullName: patient.fullName,
          email: patient.email,
          cnic: patient.cnic,
          mobileNumber: patient.mobileNumber,
          uid: patient.uid,
          familyMembersCount: patient.children?.length || 0,
          profile: profile
            ? { profilePicUrl: profile.profilePicUrl, preferredLanguage: profile.preferredLanguage }
            : null,
        };
      })
    );

    res.status(200).json({ success: true, data: merged });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/patients/:patientId
 */
async function getPatientDetail(req, res) {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    if (Number.isNaN(patientId)) {
      return res.status(400).json({ success: false, error: 'patientId must be a number.' });
    }

    const patient = await identityRepository.findPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found.' });
    }

    const linkToken = patient.linkToken?.linkToken || null;
    const profile = linkToken ? await clinicalRepository.getPatientProfileByToken(linkToken) : null;

    res.status(200).json({
      success: true,
      data: {
        patientId: patient.patientId,
        fullName: patient.fullName,
        email: patient.email,
        cnic: patient.cnic,
        mobileNumber: patient.mobileNumber,
        uid: patient.uid,
        familyMembers: (patient.children || []).map((c) => ({
          patientId: c.patientId,
          fullName: c.fullName,
          relation: c.relation,
          uid: c.uid,
        })),
        profile: profile
          ? { profilePicUrl: profile.profilePicUrl, preferredLanguage: profile.preferredLanguage }
          : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  listDoctors,
  getDoctorDetail,
  reviewDocument,
  approveDoctor,
  listPatients,
  getPatientDetail,
};
