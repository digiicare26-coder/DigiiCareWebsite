-- =============================================================
-- De-identification enforcement — Postgres layer
-- =============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_scans_link_token_format'
  ) THEN
    ALTER TABLE clinical_schema.scans
      ADD CONSTRAINT chk_scans_link_token_format
      CHECK (link_token ~ '^[a-f0-9]{64}$') NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_audit_logs_link_token_format'
  ) THEN
    ALTER TABLE clinical_schema.audit_logs
      ADD CONSTRAINT chk_audit_logs_link_token_format
      CHECK (link_token ~ '^[a-f0-9]{64}$') NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patient_profiles_link_token_format'
  ) THEN
    ALTER TABLE clinical_schema.patient_profiles
      ADD CONSTRAINT chk_patient_profiles_link_token_format
      CHECK (link_token ~ '^[a-f0-9]{64}$') NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_consultations_link_token_format'
  ) THEN
    ALTER TABLE clinical_schema.consultations
      ADD CONSTRAINT chk_consultations_link_token_format
      CHECK (link_token ~ '^[a-f0-9]{64}$') NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_consultations_doctor_token_format'
  ) THEN
    ALTER TABLE clinical_schema.consultations
      ADD CONSTRAINT chk_consultations_doctor_token_format
      CHECK (doctor_token ~ '^[a-f0-9]{64}$') NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_doctors_doctor_token_format'
  ) THEN
    ALTER TABLE clinical_schema.doctors
      ADD CONSTRAINT chk_doctors_doctor_token_format
      CHECK (doctor_token ~ '^[a-f0-9]{64}$') NOT VALID;
  END IF;
END $$;

ALTER TABLE clinical_schema.scans            VALIDATE CONSTRAINT chk_scans_link_token_format;
ALTER TABLE clinical_schema.audit_logs       VALIDATE CONSTRAINT chk_audit_logs_link_token_format;
ALTER TABLE clinical_schema.patient_profiles VALIDATE CONSTRAINT chk_patient_profiles_link_token_format;
ALTER TABLE clinical_schema.consultations    VALIDATE CONSTRAINT chk_consultations_link_token_format;
ALTER TABLE clinical_schema.consultations    VALIDATE CONSTRAINT chk_consultations_doctor_token_format;
ALTER TABLE clinical_schema.doctors          VALIDATE CONSTRAINT chk_doctors_doctor_token_format;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'identity_service') THEN
    CREATE ROLE identity_service LOGIN PASSWORD 'CHANGE_ME_identity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clinical_service') THEN
    CREATE ROLE clinical_service LOGIN PASSWORD 'CHANGE_ME_clinical';
  END IF;
END $$;

REVOKE ALL ON SCHEMA identity_schema FROM clinical_service;
REVOKE ALL ON SCHEMA clinical_schema FROM identity_service;
REVOKE ALL ON ALL TABLES IN SCHEMA identity_schema FROM clinical_service;
REVOKE ALL ON ALL TABLES IN SCHEMA clinical_schema FROM identity_service;

GRANT USAGE ON SCHEMA identity_schema TO identity_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity_schema TO identity_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity_schema TO identity_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity_schema
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO identity_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity_schema
  GRANT USAGE, SELECT ON SEQUENCES TO identity_service;

GRANT USAGE ON SCHEMA clinical_schema TO clinical_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA clinical_schema TO clinical_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA clinical_schema TO clinical_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA clinical_schema
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO clinical_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA clinical_schema
  GRANT USAGE, SELECT ON SEQUENCES TO clinical_service;

COMMIT;