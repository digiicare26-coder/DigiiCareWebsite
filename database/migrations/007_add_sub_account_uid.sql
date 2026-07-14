-- =============================================================
-- Sub-ID linking API — FK relationship: wife/kids rows reference
-- the father/husband's user id.
--
-- sub_accounts.parent_patient_id already FK-links each wife/kid row
-- to the father/husband's patients.patient_id (see
-- 000_create_identity_tables.sql). This migration adds a human
-- readable sub-uid on top of that FK, derived from the parent's uid:
--
--   patients.uid = '1'   ->  sub_accounts.uid = '1_1', '1_2', '1_3', ...
--
-- The numeric suffix is assigned per-parent, in creation order, by
-- identityRepository.js -> createSubAccount (locks the parent row
-- with SELECT ... FOR UPDATE, then counts existing sub_accounts for
-- that parent, so concurrent requests for the same parent can never
-- collide on the same suffix).
-- Owner: BE-1
-- =============================================================

BEGIN;

ALTER TABLE identity_schema.sub_accounts
    ADD COLUMN IF NOT EXISTS uid text UNIQUE;

COMMENT ON COLUMN identity_schema.sub_accounts.uid IS
    'Sub-ID linked to parent via parent_patient_id, formatted as {parent_uid}_{n} (e.g. 1_1, 1_2, 1_3). Assigned once at creation in identityRepository.js -> createSubAccount.';

COMMIT;

-- =============================================================
-- Manual test cases (run AFTER the block above):
-- =============================================================

-- Given a patient with uid = '1', creating three sub-accounts for
-- them should produce sub_accounts.uid values '1_1', '1_2', '1_3'.

-- Should FAIL (duplicate sub uid) -> unique violation
-- INSERT INTO identity_schema.sub_accounts (parent_patient_id, full_name, relation, uid)
-- VALUES (1, 'Duplicate Test', 'child', '1_1');
