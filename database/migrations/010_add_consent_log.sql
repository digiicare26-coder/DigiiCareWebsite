-- =============================================================
-- BE-2 Deliverable — Phase 3, Task 1 (18-20 Jul)
-- Consent Logging API
-- Owner: Wajeeha
--
-- Append-only audit log. No UPDATE or DELETE ever happens on this
-- table from the application — every accept/decline is a brand new
-- row. This is what proves, later, what a patient agreed to and
-- when. See consentController.js for where that rule is enforced
-- in code (the DB itself doesn't forbid updates, the app just never
-- issues one).
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS clinical_schema;

CREATE TABLE IF NOT EXISTS clinical_schema.consent_logs (
    consent_id      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    link_token      text NOT NULL,
    consent_given   boolean NOT NULL,
    consent_version text NOT NULL,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_link_token
    ON clinical_schema.consent_logs (link_token);

COMMENT ON TABLE clinical_schema.consent_logs IS
    'Append-only. Every consent accept/decline is a new row — never updated or deleted.';
COMMENT ON COLUMN clinical_schema.consent_logs.link_token IS
    'Hashed token linking to identity_schema.patients. Not a foreign key, by design.';
COMMENT ON COLUMN clinical_schema.consent_logs.consent_version IS
    'Disclaimer text version this consent was given against — see CURRENT_CONSENT_VERSION in consentController.js.';

COMMIT;