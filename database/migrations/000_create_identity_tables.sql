-- =============================================================
-- BE-1 Deliverable — Identity Schema
-- Owner: BE-1
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS identity_schema;

CREATE TABLE IF NOT EXISTS identity_schema.patients (
    patient_id    serial PRIMARY KEY,
    full_name     text NOT NULL,
    cnic          text UNIQUE,
    mobile_number text UNIQUE,
    uid           text UNIQUE
);

CREATE TABLE IF NOT EXISTS identity_schema.sub_accounts (
    sub_account_id    serial PRIMARY KEY,
    parent_patient_id integer NOT NULL REFERENCES identity_schema.patients(patient_id) ON DELETE CASCADE,
    full_name         text NOT NULL,
    relation          text NOT NULL CHECK (relation IN ('child', 'spouse'))
);

CREATE TABLE IF NOT EXISTS identity_schema.link_tokens (
    link_token     text PRIMARY KEY,
    patient_id     integer UNIQUE REFERENCES identity_schema.patients(patient_id) ON DELETE CASCADE,
    sub_account_id integer UNIQUE REFERENCES identity_schema.sub_accounts(sub_account_id) ON DELETE CASCADE,
    CONSTRAINT chk_link_token_single_owner CHECK (
        (patient_id IS NOT NULL AND sub_account_id IS NULL) OR
        (patient_id IS NULL AND sub_account_id IS NOT NULL)
    )
);

COMMIT;