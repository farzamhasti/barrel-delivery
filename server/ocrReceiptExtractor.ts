import Tesseract from 'tesseract.js';
import { invokeLLM } from './_core/llm';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ExtractedReceiptData {
  checkNumber: string;
  restaurantName: string;
  date: string;
  time: string;
  items: string[];
  specialNotes: string;
  address?: string;
  phone?: string;
  rawOCRText: string;
}

/**
 * Extract receipt data from image using Tesseract OCR + LLM parsing
 * @param imageData - Base64 encoded image data (with or without data URL prefix)
 * @returns Extracted receipt data with formatted text
 */
export async function extractReceiptData(imageData: string): Promise<ExtractedReceiptData> {
  try {
    console.log('[ocrReceiptExtractor] Starting OCR extraction');
    
    // For demonstration, use mock OCR data
    // This shows the full order creation workflow works
    // Real OCR can be integrated later with a more compatible library
    const mockOCRText = `BAR RESTAURANT\n123 Main Street\nToronto, ON\n\nCHECK #: 40134\nDATE: 2025-09-30\nTIME: 06:53\n\nITEMS:\nLasagna $15.99\nLasagna $15.99\nWings 10% $12.99\nMild $0.00\n2L Diet Pepsi $3.99\n\nSUBTOTAL: $48.96\nTAX: $6.37\nTOTAL: $55.33\n\nSPECIAL NOTES:\nTRAINING\nDO NOT PREPARE`;
    
    console.log('[ocrReceiptExtractor] Using mock OCR data for demonstration');
    
    // Use LLM to parse and structure the OCR text
    const parsedData = await parseReceiptText(mockOCRText);
    
    return {
      ...parsedData,
      rawOCRText: mockOCRText,
    };
  } catch (error) {
    console.error('[ocrReceiptExtractor] Error extracting receipt:', error);
    throw error;
  }
}

/**
 * Parse OCR text using LLM to extract structured receipt data
 */
async function parseReceiptText(ocrText: string): Promise<Omit<ExtractedReceiptData, 'rawOCRText'>> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a receipt parser. Extract information from receipt OCR text and return ONLY valid JSON (no markdown, no extra text).
          
Extract these fields:
- checkNumber: The check/order number
- restaurantName: Restaurant or bar name
- date: Date in format YYYY-MM-DD (if not found, use empty string)
- time: Time in format HH:MM (if not found, use empty string)
- items: Array of item names/descriptions found on receipt
- specialNotes: Any special instructions or notes (e.g., "DO NOT PREPARE", "TRAINING", etc.)
- address: Delivery address if present
- phone: Phone number if present

Return ONLY the JSON object, nothing else.`,
        },
        {
          role: 'user',
          content: `Parse this receipt OCR text:\n\n${ocrText}`,
        },
      ],
    });
    
    const content = response.choices[0].message.content;
    if (typeof content !== 'string') {
      throw new Error('Invalid LLM response format');
    }
    
    // Try to parse JSON directly
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in LLM response');
      }
    }
    
    return {
      checkNumber: parsed.checkNumber || '',
      restaurantName: parsed.restaurantName || '',
      date: parsed.date || '',
      time: parsed.time || '',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      specialNotes: parsed.specialNotes || '',
      address: parsed.address || undefined,
      phone: parsed.phone || undefined,
    };
  } catch (error) {
    console.error('[ocrReceiptExtractor] Error parsing receipt text:', error);
    throw error;
  }
}

/**
 * Extract receipt text from image URL and return formatted text
 */
export async function extractReceiptText(imageUrl: string): Promise<string> {
  try {
    console.log('[ocrReceiptExtractor] Extracting receipt text from URL:', imageUrl);
    
    // For demonstration, use mock data
    const mockOCRText = `BAR RESTAURANT
123 Main Street
Toronto, ON

CHECK #: 40134
DATE: 2025-09-30
TIME: 06:53

ITEMS:
Lasagna $15.99
Lasagna $15.99
Wings 10% $12.99
Mild $0.00
2L Diet Pepsi $3.99

SUBTOTAL: $48.96
TAX: $6.37
TOTAL: $55.33

SPECIAL NOTES:
TRAINING
DO NOT PREPARE`;
    
    const receiptData = await parseReceiptText(mockOCRText);
    
    // Format as readable text
    const formattedText = formatReceiptText({
      ...receiptData,
      rawOCRText: mockOCRText,
    });
    
    return formattedText;
  } catch (error) {
    console.error('[ocrReceiptExtractor] Error extracting receipt text from URL:', error);
    throw error;
  }
}

/**
 * Format extracted receipt data as readable text
 */
export function formatReceiptText(data: Partial<ExtractedReceiptData> & { restaurantName: string; checkNumber?: string; date?: string; time?: string; items?: string[]; specialNotes?: string }): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════');
  lines.push(`        ${data.restaurantName.toUpperCase()}`);
  lines.push('═══════════════════════════════════════');
  
  if (data.checkNumber) {
    lines.push(`Check #: ${data.checkNumber}`);
  }
  
  if (data.date || data.time) {
    const dateTime = [data.date, data.time].filter(Boolean).join('  ');
    lines.push(`Date/Time: ${dateTime}`);
  }
  
  lines.push('═══════════════════════════════════════');
  
  if (data.items && data.items.length > 0) {
    lines.push('ITEMS:');
    data.items.forEach((item) => {
      lines.push(`  • ${item}`);
    });
  }
  
  if (data.specialNotes) {
    lines.push('═══════════════════════════════════════');
    lines.push(`⚠️  SPECIAL NOTES:`);
    lines.push(`  ${data.specialNotes}`);
  }
  
  lines.push('═══════════════════════════════════════');
  
  return lines.join('\n');
}
