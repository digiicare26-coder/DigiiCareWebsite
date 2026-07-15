// src/middleware/deidentify.js
//
// De-identification middleware — the app-layer half of this feature.
// The real enforcement is in Postgres now (see
// database/migrations/010_add_deidentification_constraints.sql):
//   - CHECK constraints mean clinical_schema physically cannot store
//     a raw name/CNIC/email/patient_id as link_token/doctor_token.
//   - identity_service / clinical_service DB roles mean a clinical
//     credential can't read identity_schema at all.
//
// This middleware is defense-in-depth on top of that, for the
// request/response path:
//   1. Strips the identity-schema internal IDs that ride along in the
//      JWT (req.user.patientId, req.doctor.doctorId) before any
//      clinical controller runs, so clinical code only ever sees the
//      opaque linkToken/doctorToken — never the identity row's own id.
//   2. Scrubs known PII field names from any outgoing JSON on the
//      route, in case a future change accidentally spreads identity
//      data into a clinical response.
//
// Mount AFTER authMiddleware / doctorAuthMiddleware, and ONLY on
// clinical-side routes (profile, storage, search, consultations,
// doctor, recommend). Do NOT mount on identity routes (auth,
// doctor-auth, family/subAccount) — those legitimately need
// patientId/doctorId.

const PII_KEYS = new Set([
  'fullName', 'full_name',
  'email',
  'cnic',
  'mobileNumber', 'mobile_number',
  'passwordHash', 'password_hash',
  'uid',
  'parentPatientId', 'parent_patient_id',
  'licenseNumber', 'license_number',
]);

function scrub(value) {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (PII_KEYS.has(key)) continue; // drop identity fields outright
      out[key] = scrub(val);
    }
    return out;
  }
  return value;
}

function deidentifyMiddleware(req, res, next) {
  // (1) Narrow the request context down to the opaque token only.
  if (req.user) {
    const { linkToken } = req.user;
    req.user = { linkToken };
  }
  if (req.doctor) {
    const { doctorToken } = req.doctor;
    req.doctor = { doctorToken };
  }

  // (2) Scrub any PII-shaped keys from this route's JSON responses.
  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(scrub(body));

  next();
}

module.exports = deidentifyMiddleware;