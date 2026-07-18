-- ============================================
-- BE-4: Report History/Versioning
-- Migration: 013_add_scan_versioning
-- ============================================

-- 1. Add versioning columns to scans table
ALTER TABLE clinical_schema.scans 
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

ALTER TABLE clinical_schema.scans 
ADD COLUMN IF NOT EXISTS parent_scan_id UUID;

ALTER TABLE clinical_schema.scans 
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE;

-- 2. Add foreign key constraint for parent_scan_id
ALTER TABLE clinical_schema.scans 
ADD CONSTRAINT fk_scans_parent_scan 
FOREIGN KEY (parent_scan_id) 
REFERENCES clinical_schema.scans(scan_id) 
ON DELETE SET NULL;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scans_link_token 
ON clinical_schema.scans(link_token);

CREATE INDEX IF NOT EXISTS idx_scans_parent_scan_id 
ON clinical_schema.scans(parent_scan_id);

CREATE INDEX IF NOT EXISTS idx_scans_is_latest 
ON clinical_schema.scans(is_latest);

-- 4. Add comments for documentation
COMMENT ON COLUMN clinical_schema.scans.version IS 'Version number of the scan report (starts at 1, increments on re-upload)';
COMMENT ON COLUMN clinical_schema.scans.parent_scan_id IS 'Reference to the original scan ID for version history tracking';
COMMENT ON COLUMN clinical_schema.scans.is_latest IS 'Flag indicating if this is the most recent version';