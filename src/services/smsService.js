// src/services/smsService.js
//
// STUB — the manual has "SMS/push notifications for OTP and reward
// alerts" as its own bolt-on module, not part of today's Login API
// task. This just gives authController a stable function to call
// now so it doesn't have to change when that module lands.
//
// Sync note for whoever builds the real SMS module: keep the
// function signature `sendOtpSms(mobileNumber, code, expiryMinutes)`
// the same, or update the one call site in authController.js.

async function sendOtpSms(mobileNumber, code, expiryMinutes) {
  // TODO: replace with real SMS gateway integration.
  console.log(
    `[SMS STUB] To: ${mobileNumber} | Your DigiCare OTP is ${code}. Valid for ${expiryMinutes} minute(s). Do not share this code.`
  );
  return { success: true, provider: 'stub' };
}

module.exports = { sendOtpSms };
