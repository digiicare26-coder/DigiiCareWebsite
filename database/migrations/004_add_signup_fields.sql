-- =============================================================
-- BE-1 Deliverable — Signup API
-- Adds email + password to patients, and a dedicated sequence
-- for generating sequential UIDs (1, 2, 3, ...) at signup time.
-- Owner: BE-1 (Aap)
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS identity_schema;

-- ---------- 1. New columns on patients ----------
ALTER TABLE identity_schema.patients
    ADD COLUMN IF NOT EXISTS email text UNIQUE;

ALTER TABLE identity_schema.patients
    ADD COLUMN IF NOT EXISTS password_hash text;

-- ---------- 2. Sequential UID generator ----------
-- A dedicated sequence, not a per-row COUNT(*), so UID assignment
-- stays correct and race-free even with concurrent signups.
CREATE SEQUENCE IF NOT EXISTS identity_schema.uid_seq
    START WITH 1
    INCREMENT BY 1;

-- If some patients already have a numeric uid from before this
-- migration, make sure the sequence continues after the highest
-- one instead of colliding with it.
SELECT setval(
    'identity_schema.uid_seq',
    COALESCE((
        SELECT MAX(uid::bigint)
        FROM identity_schema.patients
        WHERE uid ~ '^[0-9]+$'
    ), 0) + 1,
    false
);

-- ---------- 3. Comments ----------
COMMENT ON COLUMN identity_schema.patients.email IS
    'Used for signup + as a login identifier. OTP codes are sent here, never to the mobile number.';
COMMENT ON COLUMN identity_schema.patients.password_hash IS
    'Bcrypt hash set at signup. Never store the plain text password. See src/services/passwordService.js.';
COMMENT ON SEQUENCE identity_schema.uid_seq IS
    'Backs the sequential UID (1, 2, 3, ...) assigned to each patient at signup. See identityRepository.js -> createPatient.';

COMMIT;

-- =============================================================
-- Manual test cases (run AFTER the block above):
-- =============================================================

-- Should return 1 the first time it is called on a fresh sequence
-- SELECT nextval('identity_schema.uid_seq');

-- Should SUCCEED
-- INSERT INTO identity_schema.patients (full_name, email, cnic, mobile_number, uid, password_hash)
-- VALUES ('Ali Raza', 'ali@example.com', '35201-1234567-1', '03001234567', nextval('identity_schema.uid_seq')::text, 'placeholder-hash');

-- Should FAIL (duplicate email) -> unique violation
-- INSERT INTO identity_schema.patients (full_name, email, uid, password_hash)
-- VALUES ('Second Ali', 'ali@example.com', nextval('identity_schema.uid_seq')::text, 'placeholder-hash');