// src/services/storageService.js
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');  // 🔥 ADDED
const clinicalRepo = require('../repositories/clinicalRepository');

class StorageService {
  constructor() {
    this.basePath = process.env.STORAGE_PATH || './uploads';
    this.maxFileSize = 10 * 1024 * 1024;
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = ['prescriptions', 'reports', 'temp', 'thumbnails'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.basePath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
    console.log('Upload directories ready');
  }

  generateFileName(linkToken, originalName, type) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const shortToken = linkToken.substring(0, 8);
    const extension = path.extname(originalName);
    return `${type}_${shortToken}_${timestamp}_${random}${extension}`;
  }

  getFolderPath(linkToken, type) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const shortToken = linkToken.substring(0, 8);
    return path.join(this.basePath, `${type}s`, shortToken, `${year}-${month}-${day}`);
  }

  async uploadFile(file, linkToken, scanType, metadata = {}, req = null) {
    try {
      this.validateFile(file);

      const fileName = this.generateFileName(linkToken, file.originalname, scanType);
      const folderPath = this.getFolderPath(linkToken, scanType);
      const relativeFilePath = path.join(
        `${scanType}s`,
        linkToken.substring(0, 8),
        path.basename(folderPath),
        fileName
      );
      const fullFilePath = path.join(this.basePath, relativeFilePath);

      await fs.ensureDir(folderPath);
      await fs.writeFile(fullFilePath, file.buffer);

      // 🔥 Thumbnail generation for images
      let thumbnailPath = null;
      if (file.mimetype.startsWith('image/')) {
        try {
          const thumbName = fileName.replace(/\.[^.]+$/, '_thumb.jpg');
          const thumbFolder = path.join(folderPath, 'thumbnails');
          await fs.ensureDir(thumbFolder);
          const thumbFullPath = path.join(thumbFolder, thumbName);

          await sharp(file.buffer)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 60 })
            .toFile(thumbFullPath);

          thumbnailPath = path.join(
            `${scanType}s`,
            linkToken.substring(0, 8),
            path.basename(folderPath),
            'thumbnails',
            thumbName
          );
          console.log('Thumbnail generated:', thumbnailPath);
        } catch (thumbError) {
          console.log('Thumbnail generation skipped:', thumbError.message);
        }
      }

      const scanId = await clinicalRepo.saveScan(linkToken, {
        scanType,
        fileName,
        filePath: relativeFilePath,
        thumbnailPath: thumbnailPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        metadata: {
          ...metadata,
          originalName: file.originalname,
          storageType: 'local'
        }
      });

      await clinicalRepo.logAudit({
        linkToken,
        action: 'UPLOAD',
        scanId,
        status: 'SUCCESS',
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent']
      });

      return {
        success: true,
        scanId,
        fileName,
        filePath: relativeFilePath,
        thumbnailPath: thumbnailPath,
        status: 'UPLOADED'
      };

    } catch (error) {
      await clinicalRepo.logAudit({
        linkToken,
        action: 'UPLOAD',
        status: 'FAILED',
        errorMessage: error.message,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent']
      });
      throw error;
    }
  }

  validateFile(file) {
    if (!file) throw new Error('No file provided');
    if (!file.buffer) throw new Error('Invalid file buffer');
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large. Max size: ${this.maxFileSize / 1024 / 1024}MB`);
    }
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed: ${this.allowedTypes.join(', ')}`);
    }
  }

  async getUserScans(linkToken, page = 1, limit = 10) {
    return await clinicalRepo.getScansByToken(linkToken, page, limit);
  }

  async getScan(scanId, linkToken) {
    const scan = await clinicalRepo.getScanById(scanId, linkToken);
    if (!scan) throw new Error('Scan not found');

    const filePath = scan.filePath ? scan.filePath.replace(/\\/g, '/') : null;
    const thumbnailPath = scan.thumbnailPath ? scan.thumbnailPath.replace(/\\/g, '/') : null;

    return {
      ...scan,
      url: filePath ? `/uploads/${filePath}` : null,
      thumbnailUrl: thumbnailPath ? `/uploads/${thumbnailPath}` : null
    };
  }

  async deleteScan(scanId, linkToken, req = null) {
    const scan = await clinicalRepo.getScanById(scanId, linkToken);
    if (!scan) throw new Error('Scan not found');

    if (scan.filePath) {
      const fullPath = path.join(this.basePath, scan.filePath);
      if (fs.existsSync(fullPath)) {
        await fs.remove(fullPath);
      }
    }

    if (scan.thumbnailPath) {
      const thumbPath = path.join(this.basePath, scan.thumbnailPath);
      if (fs.existsSync(thumbPath)) {
        await fs.remove(thumbPath);
      }
    }

    await clinicalRepo.deleteScan(scanId, linkToken);

    await clinicalRepo.logAudit({
      linkToken,
      action: 'DELETE',
      scanId,
      status: 'SUCCESS',
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });

    return { success: true, message: 'Scan deleted successfully' };
  }

  async updateScanOCR(scanId, extractedText) {
    try {
      await clinicalRepo.updateScanStatus(
        scanId,
        'OCR_COMPLETE',
        extractedText,
        null
      );

      const medicines = this.extractMedicineNames(extractedText);
      if (medicines.length > 0) {
        const scan = await clinicalRepo.getScanById(scanId, null);
        if (scan) {
          const metadata = scan.metadata || {};
          metadata.extractedMedicines = medicines;
          await clinicalRepo.updateScanMetadata(scanId, metadata);
        }
      }

      console.log(`OCR updated for scan ${scanId}`);
      return true;
    } catch (error) {
      console.error('Failed to update OCR:', error.message);
      return false;
    }
  }

  extractMedicineNames(text) {
    if (!text) return [];

    const patterns = [
      /([A-Za-z\u0600-\u06FF]+)\s*(\d+)?\s*(mg|ml|g|mcg|ملی گرام|ملی لیٹر)/gi,
      /([A-Za-z\u0600-\u06FF]+\s+[A-Za-z\u0600-\u06FF]+)\s*(\d+)?\s*(mg|ml|g|mcg)/gi,
      /([A-Za-z\u0600-\u06FF]+)\s*(tablet|capsule|syrup|injection|ointment|گولی|کیپسول|شربت)/gi
    ];

    const medicines = [];
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 2) {
          medicines.push(match[1].trim());
        }
      }
    }

    return [...new Set(medicines)];
  }
}

module.exports = new StorageService();