// src/services/patientRegistrationService.js
const { createPatient } = require('../repositories/identityRepository');  
const { saveVitals } = require('../repositories/clinicalRepository');      
/**
 * This is the "glue" that was missing before: identityService
 * creates the patient + link_token, and that SAME token is what
 * gets handed to clinicalService — it never sees patient_id.
 */
async function registerPatientWithVitals(fullName, cnic, mobile, uid, vitals) {
  const { patientId, linkToken } = await createPatient(fullName, cnic, mobile, uid);
  const vitalsId = await saveVitals(linkToken, vitals);
  return { patientId, linkToken, vitalsId };
}

module.exports = { registerPatientWithVitals };

// Example usage (uncomment to test manually against a real DB):
//
// registerPatientWithVitals(
//   'Ali Raza', '35201-1234567-1', '03001234567', null,
//   { age: 34, gender: 'male', height: 175, weight: 70, bp: '120/80', temperature: 98.6, bloodGroup: 'O+' }
// )
//   .then(console.log)
//   .catch(console.error);