-- =============================================================
-- BE-1 Deliverable — Login API + OTP
-- OTP verification table schema + constraints
-- Owner: BE-1
-- Schema: identity_schema
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS identity_schema;

-- ---------- 1. OTP verifications table ----------
CREATE TABLE IF NOT EXISTS identity_schema.otp_verifications (
    otp_id       serial PRIMARY KEY,
    patient_id   integer NOT NULL REFERENCES identity_schema.patients(patient_id) ON DELETE CASCADE,
    otp_hash     text NOT NULL,             -- HMAC hash, never store the raw code
    purpose      text NOT NULL DEFAULT 'LOGIN',
    attempts     integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 5,
    consumed     boolean NOT NULL DEFAULT false,
    expires_at   timestamp NOT NULL,
    created_at   timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ---------- 2. Indexes ----------
-- Lookups are always "latest active OTP for this patient".
CREATE INDEX IF NOT EXISTS idx_otp_patient_consumed
    ON identity_schema.otp_verifications(patient_id, consumed);
CREATE INDEX IF NOT EXISTS idx_otp_created_at
    ON identity_schema.otp_verifications(created_at DESC);

-- ---------- 3. Comments ----------
COMMENT ON TABLE identity_schema.otp_verifications IS
    'One row per OTP sent for login. Raw code is never persisted, only an HMAC hash. Rows are not deleted after use so attempt history / abuse patterns stay auditable.';
COMMENT ON COLUMN identity_schema.otp_verifications.otp_hash IS
    'HMAC-SHA256(pepper, code) — see src/services/otpService.js. Never store the plaintext code.';
COMMENT ON COLUMN identity_schema.otp_verifications.consumed IS
    'Set true the moment an OTP is successfully verified. A consumed OTP can never be reused, even if not yet expired.';

COMMIT;

-- =============================================================
-- Manual test cases (run AFTER the block above):
-- =============================================================

-- Should FAIL (patient_id doesn't exist) -> FK violation
-- INSERT INTO identity_schema.otp_verifications (patient_id, otp_hash, expires_at) 
-- VALUES (999999, 'deadbeef', now() + interval '5 minutes');

-- Should SUCCEED
-- INSERT INTO identity_schema.otp_verifications (patient_id, otp_hash, expires_at) 
-- VALUES (1, 'deadbeef', now() + interval '5 minutes');