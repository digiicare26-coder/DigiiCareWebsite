// src/services/otpService.js
require('dotenv').config();
const crypto = require('crypto');
const otpRepo = require('../repositories/otpRepository');

const PEPPER = process.env.OTP_SECRET;
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);

if (!PEPPER) {
  throw new Error('OTP_SECRET is not set. Refusing to start.');
}

function generateOtpCode() {
  // Numeric only — this is what gets typed on a phone keypad / read
  // out in an SMS, not a general-purpose token.
  const max = 10 ** OTP_LENGTH;
  const code = crypto.randomInt(0, max).toString().padStart(OTP_LENGTH, '0');
  return code;
}

function hashOtp(code) {
  return crypto.createHmac('sha256', PEPPER).update(code).digest('hex');
}

/**
 * Creates a fresh OTP for a patient, invalidating any previous
 * still-active one first. Returns the plaintext code so the caller
 * (controller) can hand it to smsService — this function itself
 * never persists the plaintext, only the hash.
 */
async function issueOtp(patientId) {
  const recentOtp = await otpRepo.getLatestActiveOtp(patientId);
  if (recentOtp) {
    const secondsSinceLastSend = (Date.now() - new Date(recentOtp.createdAt).getTime()) / 1000;
    if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
      const err = new Error(`Please wait ${waitSeconds}s before requesting another OTP.`);
      err.statusCode = 429;
      throw err;
    }
  }

  await otpRepo.invalidateActiveOtps(patientId);

  const code = generateOtpCode();
  const otpHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await otpRepo.createOtp(patientId, otpHash, expiresAt);

  return { code, expiresInSeconds: OTP_EXPIRY_MINUTES * 60 };
}

/**
 * Verifies a submitted code against the patient's latest active OTP.
 * Throws with a statusCode set so the controller can map it straight
 * to an HTTP response without re-deriving what went wrong.
 */
async function verifyOtp(patientId, submittedCode) {
  const otpRecord = await otpRepo.getLatestActiveOtp(patientId);

  if (!otpRecord) {
    const err = new Error('No active OTP found. Please request a new one.');
    err.statusCode = 400;
    throw err;
  }

  if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
    const err = new Error('OTP has expired. Please request a new one.');
    err.statusCode = 400;
    throw err;
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    const err = new Error('Too many failed attempts. Please request a new OTP.');
    err.statusCode = 429;
    throw err;
  }

  const submittedHash = hashOtp(submittedCode);

  // Constant-time compare — avoids leaking hash info via timing.
  const isMatch =
    submittedHash.length === otpRecord.otpHash.length &&
    crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(otpRecord.otpHash));

  if (!isMatch) {
    await otpRepo.incrementAttempts(otpRecord.otpId);
    const attemptsLeft = otpRecord.maxAttempts - (otpRecord.attempts + 1);
    const err = new Error(
      attemptsLeft > 0 ? `Invalid OTP. ${attemptsLeft} attempt(s) left.` : 'Invalid OTP. No attempts left — request a new OTP.'
    );
    err.statusCode = 400;
    throw err;
  }

  await otpRepo.markConsumed(otpRecord.otpId);
  return true;
}

module.exports = { issueOtp, verifyOtp };
