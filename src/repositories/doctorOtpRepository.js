// src/repositories/doctorOtpRepository.js
//
// Mirrors src/repositories/otpRepository.js exactly, one-for-one,
// just pointed at doctors/doctor_otp_verifications instead of
// patients/otp_verifications. Kept as a separate file (rather than
// parameterizing the patient one) so the existing patient OTP flow
// is never touched by this addition.
const { identityPrisma } = require('../../db');

async function invalidateActiveOtps(doctorId) {
  await identityPrisma.doctorOtpVerification.updateMany({
    where: { doctorId, consumed: false },
    data: { consumed: true },
  });
}

async function createOtp(doctorId, otpHash, expiresAt, purpose = 'LOGIN') {
  return identityPrisma.doctorOtpVerification.create({
    data: { doctorId, otpHash, expiresAt, purpose },
  });
}

async function getLatestActiveOtp(doctorId) {
  return identityPrisma.doctorOtpVerification.findFirst({
    where: { doctorId, consumed: false },
    orderBy: { createdAt: 'desc' },
  });
}

async function incrementAttempts(otpId) {
  return identityPrisma.doctorOtpVerification.update({
    where: { otpId },
    data: { attempts: { increment: 1 } },
  });
}

async function markConsumed(otpId) {
  return identityPrisma.doctorOtpVerification.update({
    where: { otpId },
    data: { consumed: true },
  });
}

module.exports = {
  invalidateActiveOtps,
  createOtp,
  getLatestActiveOtp,
  incrementAttempts,
  markConsumed,
};
