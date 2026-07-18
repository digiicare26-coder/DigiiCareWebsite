-- ============================================
-- BE-4: Auto-save + Print-Ready PDF
-- Migration: 012_add_print_fields
-- ============================================

-- Add PDF print fields to scans table
ALTER TABLE clinical_schema.scans 
ADD COLUMN IF NOT EXISTS printed_pdf_path VARCHAR(255);

ALTER TABLE clinical_schema.scans 
ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP;

-- Create PrintJob table for tracking PDF generations
CREATE TABLE IF NOT EXISTS clinical_schema.print_jobs (
    id SERIAL PRIMARY KEY,
    scan_id UUID NOT NULL REFERENCES clinical_schema.scans(scan_id) ON DELETE CASCADE,
    pdf_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_print_jobs_scan_id 
ON clinical_schema.print_jobs(scan_id);

-- Comment for documentation
COMMENT ON TABLE clinical_schema.print_jobs IS 'Tracks every PDF generation for scan print-ready exports';
COMMENT ON COLUMN clinical_schema.scans.printed_pdf_path IS 'Path to the generated print-ready PDF file';
COMMENT ON COLUMN clinical_schema.scans.printed_at IS 'Timestamp when the print-ready PDF was generated';