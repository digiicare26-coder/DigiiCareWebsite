-- =============================================================
-- BE-2 Deliverable — Vitals Table (Final)
-- Owner: Wajeeha
-- Schema: clinical_schema
-- =============================================================

BEGIN;

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS clinical_schema;

-- ---------- 1. Gender ENUM ----------
DO $$
BEGIN
    CREATE TYPE clinical_schema.gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ---------- 2. Vitals Table ----------
CREATE TABLE IF NOT EXISTS clinical_schema.vitals (
    record_id     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    link_token    text,
    age           integer,
    gender        clinical_schema.gender_enum,
    height        numeric,
    weight        numeric,
    bp            text,
    temperature   numeric,
    blood_group   text
);

-- ---------- 3. Constraints ----------
ALTER TABLE clinical_schema.vitals ALTER COLUMN gender SET NOT NULL;

ALTER TABLE clinical_schema.vitals DROP CONSTRAINT IF EXISTS chk_vitals_age_range;
ALTER TABLE clinical_schema.vitals
    ADD CONSTRAINT chk_vitals_age_range CHECK (age IS NULL OR (age > 0 AND age <= 130));

ALTER TABLE clinical_schema.vitals DROP CONSTRAINT IF EXISTS chk_vitals_height_range;
ALTER TABLE clinical_schema.vitals
    ADD CONSTRAINT chk_vitals_height_range CHECK (height IS NULL OR (height > 0 AND height <= 300));

ALTER TABLE clinical_schema.vitals DROP CONSTRAINT IF EXISTS chk_vitals_weight_range;
ALTER TABLE clinical_schema.vitals
    ADD CONSTRAINT chk_vitals_weight_range CHECK (weight IS NULL OR (weight > 0 AND weight <= 500));

-- ---------- 4. Comments ----------
COMMENT ON COLUMN clinical_schema.vitals.blood_group IS 'Optional field. Nullable by design per BE-2 requirements.';
COMMENT ON COLUMN clinical_schema.vitals.gender IS 'Mandatory. Restricted to MALE/FEMALE/OTHER enum.';
COMMENT ON COLUMN clinical_schema.vitals.link_token IS 'Hashed token (HMAC) linking to identity_schema. Not a foreign key, by design.';

COMMIT;

-- =============================================================
-- Test Cases (Uncomment to test)
-- =============================================================

-- Should FAIL (gender missing) -> not-null violation
-- INSERT INTO clinical_schema.vitals (link_token, age, height, weight, bp, temperature) 
-- VALUES ('testtoken1', 30, 170, 65, '120/80', 37.0);

-- Should FAIL (invalid enum) -> invalid input value
-- INSERT INTO clinical_schema.vitals (link_token, age, gender, height, weight, bp, temperature) 
-- VALUES ('testtoken2', 30, 'UNKNOWN', 170, 65, '120/80', 37.0);

-- Should FAIL (age out of range) -> check constraint
-- INSERT INTO clinical_schema.vitals (link_token, age, gender, height, weight, bp, temperature) 
-- VALUES ('testtoken3', 999, 'MALE', 170, 65, '120/80', 37.0);

-- Should SUCCEED (blood_group omitted -> proves nullable)
-- INSERT INTO clinical_schema.vitals (link_token, age, gender, height, weight, bp, temperature) 
-- VALUES ('testtoken4', 30, 'MALE', 170, 65, '120/80', 37.0);

-- Should SUCCEED (all fields present, valid)
-- INSERT INTO clinical_schema.vitals (link_token, age, gender, height, weight, bp, temperature, blood_group) 
-- VALUES ('testtoken5', 28, 'FEMALE', 162, 55, '110/70', 36.8, 'O+');