-- =============================================================
-- BE-2 Deliverable — Phase 3, Task 2 (21-23 Jul)
-- Rewards Logic
-- Owner: Wajeeha
--
-- Two tables:
--   reward_accounts     — one row per patient, current balance
--   reward_transactions — append-only ledger, one row per earn/redeem
--
-- action_key has a UNIQUE constraint so the same action (e.g. a
-- given patient completing their profile) can never award points
-- twice, even if the request is retried/double-clicked.
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS clinical_schema;

CREATE TABLE IF NOT EXISTS clinical_schema.reward_accounts (
    link_token     text PRIMARY KEY,
    points_balance integer NOT NULL DEFAULT 0,
    updated_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical_schema.reward_transactions (
    transaction_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    link_token     text NOT NULL,
    points         integer NOT NULL,
    type           text NOT NULL,
    reason         text NOT NULL,
    action_key     text NOT NULL UNIQUE,
    created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_transactions_link_token
    ON clinical_schema.reward_transactions (link_token);

ALTER TABLE clinical_schema.reward_transactions DROP CONSTRAINT IF EXISTS chk_reward_transactions_type;
ALTER TABLE clinical_schema.reward_transactions
    ADD CONSTRAINT chk_reward_transactions_type CHECK (type IN ('EARNED', 'REDEEMED'));

ALTER TABLE clinical_schema.reward_accounts DROP CONSTRAINT IF EXISTS chk_reward_accounts_balance_non_negative;
ALTER TABLE clinical_schema.reward_accounts
    ADD CONSTRAINT chk_reward_accounts_balance_non_negative CHECK (points_balance >= 0);

COMMENT ON TABLE clinical_schema.reward_transactions IS
    'Append-only ledger. Every earn/redeem is a new row — never updated or deleted.';
COMMENT ON COLUMN clinical_schema.reward_transactions.action_key IS
    'Unique per action — prevents double-awarding points for the same event.';
COMMENT ON COLUMN clinical_schema.reward_accounts.points_balance IS
    'Must never go negative — enforced here at the DB level as a second line of defense on top of the app-level check.';

COMMIT;