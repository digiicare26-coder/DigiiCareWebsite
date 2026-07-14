-- =============================================================
-- BE-2 Deliverable — Phase 2 (11-17 Jul)
-- Patient Profile CRUD + Doctor Portal APIs
-- Owner: Wajeeha
-- Lives inside clinical_schema. No identifying field is stored —
-- only the hashed link_token / doctor_token connects back to
-- identity_schema.
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS clinical_schema;

-- ---------- 0. Fix: age is mandatory per spec ----------
-- (PDF: "age, gender (mandatory)" — age was left nullable in
-- 001_create_vitals_table.sql, this closes that gap)
ALTER TABLE clinical_schema.vitals
    ALTER COLUMN age SET NOT NULL;

-- ---------- 1. Patient Profile table ----------
CREATE TABLE IF NOT EXISTS clinical_schema.patient_profiles (
    profile_id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    link_token         text NOT NULL UNIQUE,     -- hashed token, NOT a foreign key
    profile_pic_url    text,
    preferred_language text DEFAULT 'en',
    created_at         timestamptz DEFAULT now(),
    updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_link_token
    ON clinical_schema.patient_profiles (link_token);

COMMENT ON COLUMN clinical_schema.patient_profiles.link_token IS
    'Hashed token (HMAC) linking to identity_schema.patients / sub_accounts. Not a foreign key, by design.';

-- ---------- 2. Doctor table ----------
CREATE TABLE IF NOT EXISTS clinical_schema.doctors (
    doctor_id       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_token    text NOT NULL UNIQUE,        -- hashed token, NOT a foreign key
    specialization  text,
    qualification   text,
    experience      integer,
    is_approved     boolean NOT NULL DEFAULT false,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctors_doctor_token
    ON clinical_schema.doctors (doctor_token);

ALTER TABLE clinical_schema.doctors DROP CONSTRAINT IF EXISTS chk_doctors_experience_range;
ALTER TABLE clinical_schema.doctors
    ADD CONSTRAINT chk_doctors_experience_range CHECK (experience IS NULL OR (experience >= 0 AND experience <= 70));

COMMENT ON COLUMN clinical_schema.doctors.is_approved IS
    'Set by the admin panel only. Defaults to false until an admin approves the doctor.';

-- ---------- 3. Consultation table (doctor <-> patient link) ----------
CREATE TABLE IF NOT EXISTS clinical_schema.consultations (
    consultation_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_token    text NOT NULL,
    link_token      text NOT NULL,
    status          text NOT NULL DEFAULT 'ACTIVE',
    notes           text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_doctor_token
    ON clinical_schema.consultations (doctor_token);
CREATE INDEX IF NOT EXISTS idx_consultations_link_token
    ON clinical_schema.consultations (link_token);

ALTER TABLE clinical_schema.consultations DROP CONSTRAINT IF EXISTS chk_consultations_status;
ALTER TABLE clinical_schema.consultations
    ADD CONSTRAINT chk_consultations_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'));

COMMENT ON COLUMN clinical_schema.consultations.link_token IS
    'Patient side of the link — same hashed token used in vitals/patient_profiles.';
COMMENT ON COLUMN clinical_schema.consultations.doctor_token IS
    'Doctor side of the link — same hashed token used in doctors table.';

COMMIT;