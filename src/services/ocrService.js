// src/services/ocrService.js
const Tesseract = require('tesseract.js');
const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');

class OCRService {
  constructor() {
    this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    this.supportedLanguages = ['eng', 'urd'];
  }

  async extractText(filePath, mimeType, language = 'eng') {
    try {
      const fullPath = path.join(process.env.STORAGE_PATH || './uploads', filePath);
      
      if (mimeType === 'application/pdf') {
        return await this.extractFromPDF(fullPath);
      } else if (this.supportedImageTypes.includes(mimeType)) {
        return await this.extractFromImage(fullPath, language);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error('OCR Error:', error.message);
      return null;
    }
  }

  async extractFromImage(imagePath, language = 'eng') {
    try {
      console.log(`OCR: Processing image ${imagePath} with language ${language}`);
      
      const result = await Tesseract.recognize(imagePath, language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const text = result.data.text.trim();
      console.log(`OCR Complete: ${text.length} characters extracted`);
      
      return text;
    } catch (error) {
      console.error('Image OCR failed:', error.message);
      return null;
    }
  }

  async extractFromPDF(pdfPath) {
    try {
      console.log(`OCR: Processing PDF ${pdfPath}`);
      
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer);
      
      const text = data.text.trim();
      console.log(`PDF Text Extracted: ${text.length} characters`);
      
      return text;
    } catch (error) {
      console.error('PDF extraction failed:', error.message);
      return null;
    }
  }

  detectLanguage(text) {
    const urduPattern = /[\u0600-\u06FF]/;
    if (urduPattern.test(text)) {
      return 'urd';
    }
    return 'eng';
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

module.exports = new OCRService();