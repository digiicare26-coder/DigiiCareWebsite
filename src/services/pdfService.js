// ============================================
// BE-4: PDF Service - Auto-save + Print-Ready PDF
// ============================================

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { clinicalPrisma } = require('../../db'); // ✅ db.js se import

class PDFService {
    constructor() {
        // Ensure PDF directory exists
        this.pdfDir = path.join(__dirname, '../../uploads/pdfs');
        if (!fs.existsSync(this.pdfDir)) {
            fs.mkdirSync(this.pdfDir, { recursive: true });
        }
    }

    /**
     * Generate a print-ready PDF from scan images
     * @param {string} scanId - The scan ID
     * @param {Array} images - Array of image paths or buffers
     * @returns {Promise<Object>} - { pdfPath, pdfBytes }
     */
    async generatePrintPDF(scanId, images) {
        try {
            const pdfDoc = await PDFDocument.create();

            for (const image of images) {
                let imageBytes;
                
                if (typeof image === 'string') {
                    imageBytes = fs.readFileSync(image);
                } else if (Buffer.isBuffer(image)) {
                    imageBytes = image;
                } else if (image.buffer) {
                    imageBytes = image.buffer;
                } else {
                    console.warn('Unknown image format:', image);
                    continue;
                }

                let embedImage;
                try {
                    embedImage = await pdfDoc.embedPng(imageBytes);
                } catch (pngError) {
                    try {
                        embedImage = await pdfDoc.embedJpg(imageBytes);
                    } catch (jpgError) {
                        console.error('Failed to embed image:', jpgError);
                        continue;
                    }
                }

                const page = pdfDoc.addPage([
                    embedImage.width,
                    embedImage.height
                ]);

                page.drawImage(embedImage, {
                    x: 0,
                    y: 0,
                    width: embedImage.width,
                    height: embedImage.height
                });
            }

            if (images.length === 0) {
                const page = pdfDoc.addPage([595, 842]);
                const { width, height } = page.getSize();
                page.drawText('No images found for this scan', {
                    x: 50,
                    y: height / 2,
                    size: 20,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const pdfPath = await this.savePDF(pdfBytes, scanId);

            return {
                pdfPath,
                pdfBytes
            };

        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }

    /**
     * Save PDF to disk and update database
     */
    async savePDF(pdfBytes, scanId) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `scan_${scanId}_${timestamp}.pdf`;
            const filePath = path.join(this.pdfDir, fileName);

            fs.writeFileSync(filePath, pdfBytes);

            // ✅ clinicalPrisma use karein
            await clinicalPrisma.scan.update({
                where: { scanId: scanId },
                data: {
                    printedPdfPath: filePath,
                    printedAt: new Date()
                }
            });

            await clinicalPrisma.printJob.create({
                data: {
                    scanId: scanId,
                    pdfPath: filePath
                }
            });

            console.log(`PDF saved successfully: ${filePath}`);
            return filePath;

        } catch (error) {
            console.error('Save PDF Error:', error);
            throw new Error(`Failed to save PDF: ${error.message}`);
        }
    }

    /**
     * Get the PDF path for a scan
     */
    async getPDFPath(scanId) {
        try {
            // ✅ clinicalPrisma use karein
            const scan = await clinicalPrisma.scan.findUnique({
                where: { scanId: scanId },
                select: {
                    printedPdfPath: true,
                    printedAt: true
                }
            });

            if (!scan || !scan.printedPdfPath) {
                return null;
            }

            if (!fs.existsSync(scan.printedPdfPath)) {
                console.warn(`PDF file not found: ${scan.printedPdfPath}`);
                return null;
            }

            return scan.printedPdfPath;

        } catch (error) {
            console.error('Get PDF Path Error:', error);
            return null;
        }
    }

    /**
     * Get print history for a scan
     */
    async getPrintHistory(scanId) {
        try {
            // ✅ clinicalPrisma use karein
            const printJobs = await clinicalPrisma.printJob.findMany({
                where: { scanId: scanId },
                orderBy: { createdAt: 'desc' }
            });
            return printJobs;
        } catch (error) {
            console.error('Get Print History Error:', error);
            return [];
        }
    }

    /**
     * Delete a PDF file
     */
    async deletePDF(pdfPath) {
        try {
            if (fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete PDF Error:', error);
            return false;
        }
    }
}

module.exports = new PDFService();