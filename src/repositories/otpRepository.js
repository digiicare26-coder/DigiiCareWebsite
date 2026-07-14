// src/repositories/otpRepository.js
const { identityPrisma } = require('../../db');

/**
 * Invalidate any still-active OTPs for this patient before issuing a
 * new one. Without this, a patient could end up with two "valid"
 * codes at once and it becomes ambiguous which one verify-otp should
 * accept — always exactly one active OTP per patient.
 */
async function invalidateActiveOtps(patientId) {
  await identityPrisma.otpVerification.updateMany({
    where: { patientId, consumed: false },
    data: { consumed: true },
  });
}

async function createOtp(patientId, otpHash, expiresAt, purpose = 'LOGIN') {
  return identityPrisma.otpVerification.create({
    data: { patientId, otpHash, expiresAt, purpose },
  });
}

/**
 * The single OTP that a verify-otp call should check against —
 * most recent, not consumed. There should only ever be one
 * (see invalidateActiveOtps), but "most recent" is the safe tiebreaker.
 */
async function getLatestActiveOtp(patientId) {
  return identityPrisma.otpVerification.findFirst({
    where: { patientId, consumed: false },
    orderBy: { createdAt: 'desc' },
  });
}

async function incrementAttempts(otpId) {
  return identityPrisma.otpVerification.update({
    where: { otpId },
    data: { attempts: { increment: 1 } },
  });
}

async function markConsumed(otpId) {
  return identityPrisma.otpVerification.update({
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
