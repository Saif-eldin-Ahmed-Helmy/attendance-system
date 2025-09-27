const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const AppError = require('../utils/AppError');

/**
 * OCR Service
 * Handles optical character recognition for student ID detection
 */
class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize Tesseract worker
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.worker = await createWorker('eng', 1, {
        logger: process.env.NODE_ENV === 'development' ? console.log : () => {}
      });

      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '8'
      });

      this.isInitialized = true;
      console.log('OCR Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OCR Service:', error);
      throw new AppError('OCR initialization failed', 500, 'OCR_INIT_ERROR');
    }
  }

  /**
   * Process image for student ID recognition
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} OCR result with confidence and student ID
   */
  async processImage(imageBuffer, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      enhanceImage = true,
      minConfidence = 70,
      expectedLength = 8
    } = options;

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(imageBuffer, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Preprocess image for better OCR accuracy
      let processedImage = imageBuffer;
      if (enhanceImage) {
        processedImage = await this.preprocessImage(imageBuffer);
      }

      // Perform OCR
      const { data } = await this.worker.recognize(processedImage);

      // Extract and validate student ID
      const result = this.extractStudentId(data, { minConfidence, expectedLength });

      // Cache result
      this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new AppError('Failed to process image', 500, 'OCR_PROCESSING_ERROR');
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Buffer>} Preprocessed image buffer
   */
  async preprocessImage(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .greyscale()
        .normalize()
        .sharpen()
        .threshold(128)
        .png()
        .toBuffer();
    } catch (error) {
      console.error('Image preprocessing error:', error);
      // Return original image if preprocessing fails
      return imageBuffer;
    }
  }

  /**
   * Extract student ID from OCR data
   * @param {Object} ocrData - Tesseract OCR result data
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted student ID with confidence
   */
  extractStudentId(ocrData, options = {}) {
    const { minConfidence = 70, expectedLength = 8 } = options;

    if (!ocrData.text || ocrData.confidence < minConfidence) {
      return {
        success: false,
        studentId: null,
        confidence: ocrData.confidence || 0,
        error: 'Low confidence or no text detected'
      };
    }

    // Clean and extract numeric sequences
    const cleanText = ocrData.text.replace(/\s+/g, '').replace(/[^\d]/g, '');
    const numericSequences = cleanText.match(/\d{6,}/g) || [];

    // Find best matching student ID
    let bestMatch = null;
    let bestScore = 0;

    for (const sequence of numericSequences) {
      const score = this.calculateIdScore(sequence, expectedLength);
      if (score > bestScore && score >= 0.7) {
        bestMatch = sequence;
        bestScore = score;
      }
    }

    if (bestMatch) {
      return {
        success: true,
        studentId: bestMatch,
        confidence: Math.min(ocrData.confidence, bestScore * 100),
        rawText: ocrData.text,
        alternatives: numericSequences.filter(seq => seq !== bestMatch)
      };
    }

    return {
      success: false,
      studentId: null,
      confidence: ocrData.confidence,
      error: 'No valid student ID pattern found',
      rawText: ocrData.text,
      detectedSequences: numericSequences
    };
  }

  /**
   * Calculate score for potential student ID
   * @param {string} sequence - Numeric sequence
   * @param {number} expectedLength - Expected ID length
   * @returns {number} Score between 0 and 1
   */
  calculateIdScore(sequence, expectedLength) {
    if (!sequence || sequence.length < 6) return 0;

    let score = 0;

    // Length score (prefer expected length)
    if (sequence.length === expectedLength) {
      score += 0.4;
    } else {
      const lengthDiff = Math.abs(sequence.length - expectedLength);
      score += Math.max(0, 0.4 - (lengthDiff * 0.1));
    }

    // Pattern score (check for realistic student ID patterns)
    if (this.isRealisticStudentId(sequence)) {
      score += 0.3;
    }

    // Uniqueness score (avoid repeated digits)
    const uniqueDigits = new Set(sequence).size;
    score += (uniqueDigits / sequence.length) * 0.3;

    return Math.min(score, 1);
  }

  /**
   * Check if sequence matches realistic student ID patterns
   * @param {string} sequence - Numeric sequence
   * @returns {boolean} Whether sequence is realistic
   */
  isRealisticStudentId(sequence) {
    // Avoid sequences with too many repeated digits
    const repeatedPattern = /(\d)\1{4,}/;
    if (repeatedPattern.test(sequence)) return false;

    // Check for year-like patterns in first 4 digits
    const firstFour = sequence.substring(0, 4);
    const year = parseInt(firstFour);
    const currentYear = new Date().getFullYear();

    // Student IDs often start with year within reasonable range
    return year >= (currentYear - 10) && year <= (currentYear + 1);
  }

  /**
   * Generate cache key for image and options
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} options - Processing options
   * @returns {string} Cache key
   */
  generateCacheKey(imageBuffer, options) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    hash.update(imageBuffer);
    hash.update(JSON.stringify(options));
    return hash.digest('hex');
  }

  /**
   * Get result from cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cached result or null
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Set result in cache
   * @param {string} key - Cache key
   * @param {Object} result - Result to cache
   */
  setCache(key, result) {
    // Clean old cache entries periodically
    if (this.cache.size > 100) {
      this.cleanCache();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }

    this.cache.clear();
    console.log('OCR Service cleaned up');
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      cacheSize: this.cache.size,
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = new OCRService();
