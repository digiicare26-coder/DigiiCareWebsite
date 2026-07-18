// ============================================
// BE-4: Print Controller - Auto-save + Print-Ready PDF
// ============================================

const pdfService = require('../services/pdfService');
const { clinicalPrisma } = require('../../db');
const fs = require('fs');

/**
 * Generate a print-ready PDF for a scan
 * POST /api/print/:scanId/generate
 */
const generatePrintPDF = async (req, res) => {
    try {
        const { scanId } = req.params;

        // 1. Validate scan exists and user has access
        const scan = await clinicalPrisma.scan.findUnique({
            where: { scanId: scanId }
        });

        if (!scan) {
            return res.status(404).json({
                success: false,
                error: 'Scan not found'
            });
        }

        // 2. Check if user has access (linkToken validation)
        const userLinkToken = req.user?.linkToken;
        if (userLinkToken && scan.linkToken !== userLinkToken) {
            return res.status(403).json({
                success: false,
                error: 'You do not have access to this scan'
            });
        }

        // 3. Get images for the scan
        const imagePaths = await getImagePathsForScan(scanId);

        if (imagePaths.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No images found for this scan'
            });
        }

        // 4. Generate PDF
        const result = await pdfService.generatePrintPDF(scanId, imagePaths);

        // 5. Get updated scan with print info
        const updatedScan = await clinicalPrisma.scan.findUnique({
            where: { scanId: scanId }
        });

        res.status(200).json({
            success: true,
            message: 'Print-ready PDF generated successfully',
            data: {
                scanId: scanId,
                pdfPath: result.pdfPath,
                printedAt: updatedScan?.printedAt,
                pdfUrl: `/api/print/${scanId}/download`
            }
        });

    } catch (error) {
        console.error('Generate PDF Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Download the generated PDF
 * GET /api/print/:scanId/download
 */
const downloadPDF = async (req, res) => {
    try {
        const { scanId } = req.params;

        // 1. Get PDF path
        const pdfPath = await pdfService.getPDFPath(scanId);

        if (!pdfPath) {
            return res.status(404).json({
                success: false,
                error: 'PDF not found. Please generate it first.'
            });
        }

        // 2. Check if file exists
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({
                success: false,
                error: 'PDF file not found on server'
            });
        }

        // 3. Get scan info for filename
        const scan = await clinicalPrisma.scan.findUnique({
            where: { scanId: scanId }
        });

        const fileName = scan ? `scan_${scan.scanId}.pdf` : 'document.pdf';

        // 4. Send file
        res.download(pdfPath, fileName, (err) => {
            if (err) {
                console.error('Download Error:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to download PDF'
                    });
                }
            }
        });

    } catch (error) {
        console.error('Download PDF Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download PDF'
        });
    }
};

/**
 * Get print history for a scan
 * GET /api/print/:scanId/history
 */
const getPrintHistory = async (req, res) => {
    try {
        const { scanId } = req.params;

        const history = await pdfService.getPrintHistory(scanId);

        res.status(200).json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Get Print History Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get print history'
        });
    }
};

/**
 * Get scan images helper function
 */
const getImagePathsForScan = async (scanId) => {
    try {
        const scan = await clinicalPrisma.scan.findUnique({
            where: { scanId: scanId }
        });

        if (scan && scan.filePath) {
            return [scan.filePath];
        }

        return [];

    } catch (error) {
        console.error('Get Images Error:', error);
        return [];
    }
};

// ============================================
// MODULE EXPORTS - ✅ INDUSTRY STANDARD
// ============================================
module.exports = {
    generatePrintPDF,
    downloadPDF,
    getPrintHistory,
    getImagePathsForScan
};