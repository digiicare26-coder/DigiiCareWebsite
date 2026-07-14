-- =============================================================
-- BE-4 Deliverable — Scans + Audit Logs Tables
-- Storage Architecture for Scans/Reports
-- Owner: BE-4 (Aap)
-- Schema: clinical_schema
-- =============================================================

BEGIN;

-- ---------- 1. Scans Table ----------
CREATE TABLE IF NOT EXISTS clinical_schema.scans (
    scan_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    link_token text NOT NULL,
    scan_type text NOT NULL CHECK (scan_type IN ('prescription', 'report')),
    file_name text NOT NULL,
    file_path text NOT NULL,
    thumbnail_path text,
    file_size integer,
    mime_type text,
    ocr_text text,
    ocr_confidence float,
    status text DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'PROCESSING', 'OCR_COMPLETE', 'FAILED', 'DELETED')),
    metadata jsonb,
    uploaded_at timestamp DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp
);

-- ---------- 2. Audit Logs Table ----------
CREATE TABLE IF NOT EXISTS clinical_schema.audit_logs (
    log_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    link_token text NOT NULL,
    action text NOT NULL CHECK (action IN ('UPLOAD', 'OCR_PROCESS', 'DELETE', 'VIEW', 'DOWNLOAD')),
    scan_id uuid REFERENCES clinical_schema.scans(scan_id) ON DELETE SET NULL,
    status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
    error_message text,
    ip_address text,
    user_agent text,
    timestamp timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ---------- 3. Indexes for Performance ----------
CREATE INDEX IF NOT EXISTS idx_scans_link_token ON clinical_schema.scans(link_token);
CREATE INDEX IF NOT EXISTS idx_scans_uploaded_at ON clinical_schema.scans(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_status ON clinical_schema.scans(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_link_token ON clinical_schema.audit_logs(link_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON clinical_schema.audit_logs(timestamp DESC);

-- ---------- 4. Comments ----------
COMMENT ON TABLE clinical_schema.scans IS 'Stores all uploaded prescriptions and reports. No PII stored - only link_token.';
COMMENT ON TABLE clinical_schema.audit_logs IS 'Audit trail for all file operations. Security and compliance.';
COMMENT ON COLUMN clinical_schema.scans.link_token IS 'HMAC hash linking to identity. Cannot be reversed.';
COMMENT ON COLUMN clinical_schema.scans.status IS 'UPLOADED → PROCESSING → OCR_COMPLETE | FAILED | DELETED';

COMMIT;