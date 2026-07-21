-- =============================================================
-- BE-3 Deliverable — Recommender Refinement (21-23 Jul)
-- Search performance index for medicine name/uses lookups
-- (Re-added as 019 — the original 016 was lost during a merge;
--  016/017 are now taken by admin_table / doctor_documents_table)
-- =============================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_medicine_name_trgm
    ON clinical_schema.medicines USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_medicine_uses_trgm
    ON clinical_schema.medicines USING GIN (uses gin_trgm_ops);

COMMIT;