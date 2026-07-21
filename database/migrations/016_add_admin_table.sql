-- =============================================================
-- Admin panel: admins table.
--
-- Nothing existing is touched — this only ADDS a new table:
--   - admins   (admin identity/login; mirrors doctors/patients
--               shape but password-only login, no OTP)
--
-- Exactly one admin is meant to exist at first, created through a
-- one-time bootstrap endpoint that only works while this table is
-- empty. Every admin after that (including the bootstrap one) can
-- create further admins through a protected, admin-only endpoint —
-- there is no public admin signup.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS identity_schema.admins (
    admin_id            SERIAL PRIMARY KEY,
    full_name           text NOT NULL,
    email               text NOT NULL UNIQUE,
    password_hash       text NOT NULL,
    created_by_admin_id integer REFERENCES identity_schema.admins(admin_id),
    created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE identity_schema.admins IS
    'Admin panel logins. First row is created via the one-time bootstrap endpoint (only allowed while this table is empty); every row after that is created by an existing admin via the protected create-admin endpoint.';

COMMIT;
