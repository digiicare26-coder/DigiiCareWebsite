-- =============================================================
-- Notifications: generic in-app notifications table.
--
-- Nothing existing is touched — this only ADDS a new table:
--   - notifications   (one row per notification, for either a
--                      patient or a doctor)
--
-- recipient_type + recipient_id together point at the recipient:
--   - recipient_type = 'PATIENT' -> identity_schema.patients.patient_id
--   - recipient_type = 'DOCTOR'  -> identity_schema.doctors.doctor_id
--
-- Kept generic (one table, not two) so every existing action that
-- should notify someone (OTP verified, doctor document verified /
-- rejected, doctor approved, consultation booked, family member
-- linked, redemption request submitted / approved / rejected,
-- prescription / report uploaded, etc.) can create a row the same
-- way, without needing a new table per feature.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS identity_schema.notifications (
    notification_id   SERIAL PRIMARY KEY,
    recipient_type     text NOT NULL,               -- 'PATIENT' | 'DOCTOR'
    recipient_id       integer NOT NULL,             -- patient_id or doctor_id
    type               text NOT NULL,                -- e.g. 'OTP_VERIFIED', 'DOCTOR_APPROVED'
    title              text NOT NULL,
    message            text NOT NULL,
    data               jsonb,
    is_read            boolean NOT NULL DEFAULT false,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
    ON identity_schema.notifications (recipient_type, recipient_id, is_read);

COMMENT ON TABLE identity_schema.notifications IS
    'Generic in-app notifications for patients and doctors (OTP verified, document verified/rejected, doctor approved, consultation booked, family member linked, redemption reviewed, report/prescription uploaded, etc.).';

COMMIT;
