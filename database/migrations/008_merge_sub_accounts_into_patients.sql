-- =============================================================
-- Merge sub_accounts INTO patients (single table for everyone).
--
-- Before: two tables — patients (father/husband) + sub_accounts
-- (wife/kids), linked by sub_accounts.parent_patient_id.
--
-- After: ONE table — patients. Every row is a patient row.
--   - Independent (father/husband) account -> parent_patient_id IS NULL
--   - Linked (wife/kid) account           -> parent_patient_id = the
--                                            father/husband's patient_id
--
-- uid generation is unchanged: independent accounts still get "1",
-- "2", "3"... from uid_seq; linked accounts still get
-- "{parent_uid}_{n}" e.g. "1_1", "1_2" — see identityRepository.js.
--
-- Owner: BE-1
-- =============================================================

BEGIN;

-- ---------- 1. New columns on patients ----------
ALTER TABLE identity_schema.patients
    ADD COLUMN IF NOT EXISTS parent_patient_id integer
        REFERENCES identity_schema.patients(patient_id);

ALTER TABLE identity_schema.patients
    ADD COLUMN IF NOT EXISTS relation text;

ALTER TABLE identity_schema.patients
    DROP CONSTRAINT IF EXISTS chk_patients_relation;

ALTER TABLE identity_schema.patients
    ADD CONSTRAINT chk_patients_relation
        CHECK (relation IS NULL OR relation IN ('child', 'spouse'));

-- ---------- 2. Migrate existing sub_accounts rows into patients ----------
-- Old sub_account_id values change (patients has its own patient_id
-- sequence), so we track old -> new id to repoint link_tokens below.
CREATE TEMP TABLE sub_account_migration_map (
    old_sub_account_id integer,
    new_patient_id     integer
) ON COMMIT DROP;

DO $$
DECLARE
    r RECORD;
    new_id integer;
BEGIN
    FOR r IN SELECT * FROM identity_schema.sub_accounts LOOP
        INSERT INTO identity_schema.patients
            (full_name, uid, parent_patient_id, relation)
        VALUES
            (r.full_name, r.uid, r.parent_patient_id, r.relation)
        RETURNING patient_id INTO new_id;

        INSERT INTO sub_account_migration_map (old_sub_account_id, new_patient_id)
        VALUES (r.sub_account_id, new_id);
    END LOOP;
END $$;

-- ---------- 3. Repoint link_tokens that pointed at sub_accounts ----------
UPDATE identity_schema.link_tokens lt
SET patient_id     = m.new_patient_id,
    sub_account_id = NULL
FROM sub_account_migration_map m
WHERE lt.sub_account_id = m.old_sub_account_id;

-- ---------- 4. link_tokens no longer needs the sub_account_id column ----------
ALTER TABLE identity_schema.link_tokens
    DROP CONSTRAINT IF EXISTS chk_link_token_single_owner;

ALTER TABLE identity_schema.link_tokens
    DROP COLUMN IF EXISTS sub_account_id;

ALTER TABLE identity_schema.link_tokens
    ALTER COLUMN patient_id SET NOT NULL;

-- ---------- 5. Archive the old sub_accounts table (kept, not dropped) ----------
-- Renamed instead of DROPped so no historical data is lost. Nothing
-- in the application reads/writes this table anymore.
ALTER TABLE identity_schema.sub_accounts
    RENAME TO sub_accounts_archived_do_not_use;

-- ---------- 6. Comments ----------
COMMENT ON COLUMN identity_schema.patients.parent_patient_id IS
    'NULL for an independent father/husband account. Set to another patients.patient_id when this row is a linked spouse/child account. See identityRepository.js -> createSubAccount.';
COMMENT ON COLUMN identity_schema.patients.relation IS
    'NULL for an independent account. "child" or "spouse" for a linked account (parent_patient_id is set).';

COMMIT;

-- =============================================================
-- Manual verification (run AFTER the block above):
-- =============================================================

-- Every previously-existing sub-account should now be a patients row
-- with a non-null parent_patient_id and a matching uid like "1_1".
-- SELECT patient_id, uid, full_name, relation, parent_patient_id
-- FROM identity_schema.patients
-- WHERE parent_patient_id IS NOT NULL
-- ORDER BY parent_patient_id, patient_id;

-- Independent accounts should show parent_patient_id = NULL.
-- SELECT patient_id, uid, full_name, parent_patient_id
-- FROM identity_schema.patients
-- WHERE parent_patient_id IS NULL;

-- The archived table still has the old data for reference only.
-- SELECT * FROM identity_schema.sub_accounts_archived_do_not_use;
