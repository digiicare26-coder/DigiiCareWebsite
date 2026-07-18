// src/controllers/printController.js
const { clinicalPrisma } = require('../../db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ============================================
// GENERATE PRINT PDF
// ============================================
async function generatePrintPDF(req, res) {
    try {
        const { scanId } = req.params;
        const { linkToken } = req.user;

        // Check if scan exists
        const scan = await clinicalPrisma.scan.findFirst({
            where: {
                scanId: scanId,
                linkToken: linkToken,
                status: { not: 'DELETED' }
            }
        });

        if (!scan) {
            return res.status(404).json({
                success: false,
                error: 'Scan not found or access denied'
            });
        }

        // Create PDF
        const doc = new PDFDocument();
        const pdfPath = path.join(__dirname, '../../uploads/prints', `${scanId}.pdf`);
        
        // Ensure directory exists
        const dir = path.dirname(pdfPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write PDF to file
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        // Add content to PDF
        doc.fontSize(20).text('Medical Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Scan ID: ${scan.scanId}`);
        doc.text(`File Name: ${scan.fileName}`);
        doc.text(`Scan Type: ${scan.scanType}`);
        doc.text(`Uploaded At: ${scan.uploadedAt}`);
        
        if (scan.ocrText) {
            doc.moveDown();
            doc.fontSize(16).text('OCR Text:');
            doc.fontSize(12).text(scan.ocrText);
        }
        
        doc.end();

        // Wait for PDF to finish writing
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Update scan with PDF path
        await clinicalPrisma.scan.update({
            where: { scanId: scanId },
            data: {
                printedPdfPath: pdfPath,
                printedAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                scanId: scanId,
                message: 'PDF generated successfully',
                downloadUrl: `/api/print/${scanId}/download`
            }
        });

    } catch (err) {
        console.error('Generate PDF error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Failed to generate PDF'
        });
    }
}

// ============================================
// DOWNLOAD PDF
// ============================================
async function downloadPDF(req, res) {
    try {
        const { scanId } = req.params;
        const { linkToken } = req.user;

        const scan = await clinicalPrisma.scan.findFirst({
            where: {
                scanId: scanId,
                linkToken: linkToken,
                status: { not: 'DELETED' }
            }
        });

        if (!scan) {
            return res.status(404).json({
                success: false,
                error: 'Scan not found or access denied'
            });
        }

        if (!scan.printedPdfPath) {
            return res.status(404).json({
                success: false,
                error: 'PDF not generated yet. Please generate first.'
            });
        }

        // Check if file exists
        if (!fs.existsSync(scan.printedPdfPath)) {
            return res.status(404).json({
                success: false,
                error: 'PDF file not found on server'
            });
        }

        // Send file for download
        res.download(scan.printedPdfPath, `${scan.fileName}.pdf`);

    } catch (err) {
        console.error('Download PDF error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Failed to download PDF'
        });
    }
}

// ============================================
// GET PRINT HISTORY
// ============================================
async function getPrintHistory(req, res) {
    try {
        const { scanId } = req.params;
        const { linkToken } = req.user;

        const scan = await clinicalPrisma.scan.findFirst({
            where: {
                scanId: scanId,
                linkToken: linkToken
            }
        });

        if (!scan) {
            return res.status(404).json({
                success: false,
                error: 'Scan not found or access denied'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                scanId: scanId,
                printedPdfPath: scan.printedPdfPath,
                printedAt: scan.printedAt,
                message: 'Print history retrieved'
            }
        });

    } catch (err) {
        console.error('Print history error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Failed to fetch print history'
        });
    }
}

module.exports = {
    generatePrintPDF,
    downloadPDF,
    getPrintHistory
};