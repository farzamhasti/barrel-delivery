/**
 * Tesseract.js OCR Integration
 * Runs entirely in the browser - no external API calls
 */

import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

/**
 * Perform OCR on an image using Tesseract.js
 * Runs entirely in the browser
 */
export async function performOCR(imageSource: string | Blob | HTMLImageElement): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(
      imageSource,
      'eng',
      {
        logger: (m: any) => {
          // Log progress silently
          if (m.status === 'recognizing') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    throw new Error('Failed to perform OCR on image');
  }
}

/**
 * Extract receipt data from image using Tesseract.js
 */
export async function extractReceiptFromImage(imageSource: string | Blob | HTMLImageElement): Promise<string> {
  const result = await performOCR(imageSource);
  return result.text;
}
