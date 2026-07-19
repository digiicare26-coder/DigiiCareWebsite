-- =============================================================
-- Admin panel: doctor verification documents.
--
-- Nothing existing is touched — this only ADDS a new table:
--   - doctor_documents   (documents a doctor uploads for admin
--                         review — license, degree, CNIC, etc.)
--
-- doctor_token references identity_schema.doctor_link_tokens
-- (same identifier used everywhere else for a doctor's clinical
-- side). A doctor's clinical_schema.doctors.is_approved should only
-- be flipped to true by an admin after reviewing these documents.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS clinical_schema.doctor_documents (
    document_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_token      text NOT NULL,
    doc_type          text NOT NULL,
    file_name         text NOT NULL,
    file_path         text NOT NULL,
    file_size         integer,
    mime_type         text,
    status            text NOT NULL DEFAULT 'PENDING',
    rejection_reason  text,
    reviewed_at       timestamptz,
    uploaded_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_documents_doctor_token
    ON clinical_schema.doctor_documents (doctor_token);

COMMENT ON TABLE clinical_schema.doctor_documents IS
    'Doctor verification documents (license/degree/CNIC/etc) uploaded by the doctor, reviewed (VERIFIED/REJECTED) by an admin before the doctor profile can be approved.';

COMMIT;
