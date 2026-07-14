-- =============================================================
-- BE-3 Deliverable — Medicines Table
-- Owner: BE-3
-- Schema: clinical_schema
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS clinical_schema;

CREATE TABLE IF NOT EXISTS clinical_schema.medicines (
    id                serial PRIMARY KEY,
    name              text NOT NULL,
    composition       text,
    uses              text,
    side_effects      text,
    image_url         text,
    manufacturer      text,
    excellent_review  numeric,
    average_review    numeric,
    poor_review       numeric,
    created_at        timestamp DEFAULT now()
);

COMMIT;