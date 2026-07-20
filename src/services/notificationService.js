// src/services/notificationService.js
//
// 🆕 One small helper per event that should notify a patient or a
// doctor. Every existing controller only needs to call the matching
// helper right after its action succeeds — nothing else changes.
//
// IMPORTANT: notifications are a side-effect, never the main feature.
// Every helper swallows its own errors (logs + returns) so that a
// notification failure (e.g. DB hiccup) can NEVER break signup,
// login, OTP verification, doctor approval, uploads, etc.
const notificationRepository = require('../repositories/notificationRepository');

async function safeCreate(payload) {
  try {
    await notificationRepository.createNotification(payload);
  } catch (err) {
    console.error('⚠️ Notification create failed:', err.message);
  }
}

// ============================================================
// OTP
// ============================================================
function notifyPatientOtpVerified(patientId) {
  return safeCreate({
    recipientType: 'PATIENT',
    recipientId: patientId,
    type: 'OTP_VERIFIED',
    title: 'OTP Verified',
    message: 'Your OTP has been verified successfully. You are now logged in.',
  });
}

function notifyDoctorOtpVerified(doctorId) {
  return safeCreate({
    recipientType: 'DOCTOR',
    recipientId: doctorId,
    type: 'OTP_VERIFIED',
    title: 'OTP Verified',
    message: 'Your OTP has been verified successfully. You are now logged in.',
  });
}

// ============================================================
// DOCTOR DOCUMENT VERIFICATION (by admin)
// ============================================================
function notifyDoctorDocumentReviewed(doctorId, { docType, status, rejectionReason } = {}) {
  const isVerified = status === 'VERIFIED';
  return safeCreate({
    recipientType: 'DOCTOR',
    recipientId: doctorId,
    type: isVerified ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
    title: isVerified ? 'Document Verified' : 'Document Rejected',
    message: isVerified
      ? `Your ${docType || 'uploaded'} document has been verified by the admin.`
      : `Your ${docType || 'uploaded'} document was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
    data: { docType, status, rejectionReason: rejectionReason || null },
  });
}

// ============================================================
// DOCTOR APPROVAL (by admin)
// ============================================================
function notifyDoctorApproved(doctorId) {
  return safeCreate({
    recipientType: 'DOCTOR',
    recipientId: doctorId,
    type: 'DOCTOR_APPROVED',
    title: 'Profile Approved',
    message: 'Congratulations! Your doctor profile has been approved. You are now visible to patients.',
  });
}

// ============================================================
// CONSULTATION BOOKED
// ============================================================
function notifyConsultationBookedForPatient(patientId, doctorName) {
  return safeCreate({
    recipientType: 'PATIENT',
    recipientId: patientId,
    type: 'CONSULTATION_BOOKED',
    title: 'Consultation Booked',
    message: doctorName
      ? `Your consultation with Dr. ${doctorName} has been booked successfully.`
      : 'Your consultation has been booked successfully.',
  });
}

function notifyConsultationBookedForDoctor(doctorId, patientName) {
  return safeCreate({
    recipientType: 'DOCTOR',
    recipientId: doctorId,
    type: 'CONSULTATION_BOOKED',
    title: 'New Consultation',
    message: patientName
      ? `${patientName} has booked a consultation with you.`
      : 'A patient has booked a consultation with you.',
  });
}

// ============================================================
// FAMILY MEMBER LINKED
// ============================================================
function notifyFamilyMemberAdded(parentPatientId, memberName, relation) {
  return safeCreate({
    recipientType: 'PATIENT',
    recipientId: parentPatientId,
    type: 'FAMILY_MEMBER_ADDED',
    title: 'Family Member Added',
    message: `${memberName} (${relation}) has been linked to your account successfully.`,
  });
}

// ============================================================
// REWARDS / REDEMPTION
// ============================================================
function notifyRedemptionRequested(patientId, points) {
  return safeCreate({
    recipientType: 'PATIENT',
    recipientId: patientId,
    type: 'REDEMPTION_REQUESTED',
    title: 'Redemption Request Submitted',
    message: `Your request to redeem ${points} points has been submitted and is pending review.`,
  });
}

function notifyRedemptionApproved(patientId, points) {
  return safeCreate({
    recipientType: 'PATIENT',
    recipientId: patientId,
    type: 'REDEMPTION_APPROVED',
    title: 'Redemption Approved',
    message: `Your request to redeem ${points} points has been approved.`,
  });
}

function notifyRedemptionRejected(patientId, points) {
  return safeCreate({
    recipientType: 'PATIENT',
    recipientId: patientId,
    type: 'REDEMPTION_REJECTED',
    title: 'Redemption Rejected',
    message: `Your request to redeem ${points} points was rejected and the points have been refunded.`,
  });
}

// ============================================================
// UPLOADS (prescription / report)
// ============================================================
function notifyScanUploaded(patientId, scanType) {
  return safeCreate({
    recipientType: 'PATIENT',
    recipientId: patientId,
    type: 'SCAN_UPLOADED',
    title: scanType === 'report' ? 'Report Uploaded' : 'Prescription Uploaded',
    message:
      scanType === 'report'
        ? 'Your report has been uploaded and processed successfully.'
        : 'Your prescription has been uploaded and processed successfully.',
  });
}

module.exports = {
  notifyPatientOtpVerified,
  notifyDoctorOtpVerified,
  notifyDoctorDocumentReviewed,
  notifyDoctorApproved,
  notifyConsultationBookedForPatient,
  notifyConsultationBookedForDoctor,
  notifyFamilyMemberAdded,
  notifyRedemptionRequested,
  notifyRedemptionApproved,
  notifyRedemptionRejected,
  notifyScanUploaded,
};
