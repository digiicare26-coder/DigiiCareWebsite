-- =============================================================
-- Doctor auth (signup / request-otp / verify-otp) + logout for
-- both patients and doctors.
--
-- Nothing about the existing patients / otp_verifications /
-- link_tokens tables is touched — this only ADDS new tables:
--   - doctors                    (doctor identity, mirrors patients)
--   - doctor_otp_verifications   (mirrors otp_verifications)
--   - doctor_link_tokens         (mirrors link_tokens; column is
--                                 named doctor_token on purpose —
--                                 it's the same identifier
--                                 src/routes/doctorRoute.js already
--                                 expects for the clinical-side
--                                 doctor profile)
--   - revoked_tokens              (JWT blacklist, shared by both
--                                  patient and doctor logout)
--
-- Owner: BE-1
-- =============================================================

BEGIN;

-- ---------- Doctor UID sequence (separate from patients.uid) ----------
CREATE SEQUENCE IF NOT EXISTS identity_schema.doctor_uid_seq
    START WITH 1 INCREMENT BY 1;

-- ---------- doctors ----------
CREATE TABLE IF NOT EXISTS identity_schema.doctors (
    doctor_id      SERIAL PRIMARY KEY,
    full_name      text NOT NULL,
    email          text UNIQUE,
    license_number text UNIQUE,
    mobile_number  text UNIQUE,
    uid            text UNIQUE,
    password_hash  text
);

COMMENT ON TABLE identity_schema.doctors IS
    'Doctor identity/auth — mirrors patients (signup, OTP login). Distinct from clinical_schema.doctors, which holds the clinical profile (specialization, qualification, isApproved) keyed by doctor_token.';

-- ---------- doctor_otp_verifications ----------
CREATE TABLE IF NOT EXISTS identity_schema.doctor_otp_verifications (
    otp_id       SERIAL PRIMARY KEY,
    doctor_id    integer NOT NULL REFERENCES identity_schema.doctors(doctor_id),
    otp_hash     text NOT NULL,
    purpose      text NOT NULL DEFAULT 'LOGIN',
    attempts     integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 5,
    consumed     boolean NOT NULL DEFAULT false,
    expires_at   timestamptz NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_otp_doctor_consumed
    ON identity_schema.doctor_otp_verifications (doctor_id, consumed);

-- ---------- doctor_link_tokens ----------
CREATE TABLE IF NOT EXISTS identity_schema.doctor_link_tokens (
    doctor_token text PRIMARY KEY,
    doctor_id    integer NOT NULL UNIQUE REFERENCES identity_schema.doctors(doctor_id)
);

COMMENT ON TABLE identity_schema.doctor_link_tokens IS
    'doctor_token issued at doctor signup — the SAME identifier src/routes/doctorRoute.js (POST/GET/PUT /api/doctor/:doctorToken) already expects for the clinical doctor profile.';

-- ---------- revoked_tokens (logout, shared by patients + doctors) ----------
CREATE TABLE IF NOT EXISTS identity_schema.revoked_tokens (
    token      text PRIMARY KEY,
    revoked_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at
    ON identity_schema.revoked_tokens (expires_at);

COMMENT ON TABLE identity_schema.revoked_tokens IS
    'JWT blacklist. A row here means that exact token string is logged out and must be rejected even though it has not naturally expired yet. Safe to delete rows once expires_at is in the past.';

COMMIT;
