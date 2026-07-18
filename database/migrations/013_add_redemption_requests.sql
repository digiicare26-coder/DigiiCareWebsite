-- =============================================================
-- BE-2 Deliverable — Phase 3, Task 3 (24-25 Jul)
-- Rewards Redemption API
-- Owner: Wajeeha
--
-- Points are deducted the moment a redemption request is created
-- (so a patient can't spend the same points twice while a request
-- is pending). If an admin later rejects the request, the points
-- are refunded back to reward_accounts. See rewardsController.js
-- for the full create/approve/reject flow.
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS clinical_schema;

CREATE TABLE IF NOT EXISTS clinical_schema.redemption_requests (
    redemption_id    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    link_token       text NOT NULL,
    points_requested integer NOT NULL,
    status           text NOT NULL DEFAULT 'PENDING',
    reason           text,
    requested_at     timestamptz DEFAULT now(),
    reviewed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_redemption_requests_link_token
    ON clinical_schema.redemption_requests (link_token);

ALTER TABLE clinical_schema.redemption_requests DROP CONSTRAINT IF EXISTS chk_redemption_requests_status;
ALTER TABLE clinical_schema.redemption_requests
    ADD CONSTRAINT chk_redemption_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

ALTER TABLE clinical_schema.redemption_requests DROP CONSTRAINT IF EXISTS chk_redemption_requests_points_positive;
ALTER TABLE clinical_schema.redemption_requests
    ADD CONSTRAINT chk_redemption_requests_points_positive CHECK (points_requested > 0);

COMMENT ON TABLE clinical_schema.redemption_requests IS
    'A patient''s request to redeem points. Points are deducted on creation; a rejection refunds them.';
COMMENT ON COLUMN clinical_schema.redemption_requests.status IS
    'PENDING until an admin approves or rejects it. See rewardsController.js.';

COMMIT;