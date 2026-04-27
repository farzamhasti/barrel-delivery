import { invokeLLM } from './_core/llm';

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
 * Extract receipt data from image using LLM vision + parsing
 * @param imageData - Can be: S3 URL, data URL with base64, or presigned URL
 * @returns Extracted receipt data with formatted text
 */
export async function extractReceiptData(imageData: string): Promise<ExtractedReceiptData> {
  try {
    console.log('[ocrReceiptExtractor] Starting receipt analysis with LLM vision');
    
    // Determine the format and prepare for LLM
    let imageUrl = imageData;
    
    // If it's an S3 or HTTP URL, try to fetch it and convert to base64
    // This is more reliable for LLM vision processing
    if (imageData.startsWith('http')) {
      console.log('[ocrReceiptExtractor] Fetching image from URL for LLM processing...');
      try {
        const response = await fetch(imageData);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');
        imageUrl = `data:image/jpeg;base64,${base64Data}`;
        console.log('[ocrReceiptExtractor] Successfully converted URL to base64 for LLM');
      } catch (fetchError) {
        console.warn('[ocrReceiptExtractor] Failed to fetch URL, will try as-is:', fetchError);
        // Fall back to using the URL directly
        imageUrl = imageData;
      }
    } else if (imageData.startsWith('data:image')) {
      // Already a data URL, validate and normalize it
      const base64Match = imageData.match(/base64,(.+)$/);
      if (!base64Match) {
        throw new Error('Invalid data URL format');
      }
      let base64Data = base64Match[1];
      // Clean up the base64 data - remove any whitespace
      base64Data = base64Data.replace(/\s/g, '');
      // Try to decode to validate
      try {
        Buffer.from(base64Data, 'base64');
      } catch (e) {
        throw new Error('Invalid base64 data: ' + (e instanceof Error ? e.message : String(e)));
      }
      // Ensure proper data URL format
      imageUrl = `data:image/jpeg;base64,${base64Data}`;
      console.log('[ocrReceiptExtractor] Data URL validated and normalized');
    } else {
      // Assume it's base64 without prefix
      let base64Data = imageData.replace(/\s/g, ''); // Remove whitespace
      try {
        Buffer.from(base64Data, 'base64');
      } catch (e) {
        throw new Error('Invalid base64 data: ' + (e instanceof Error ? e.message : String(e)));
      }
      imageUrl = `data:image/jpeg;base64,${base64Data}`;
      console.log('[ocrReceiptExtractor] Base64 data validated and formatted');
    }
    
    // Use LLM with vision to analyze the receipt image
    console.log('[ocrReceiptExtractor] Sending image to LLM for analysis...');
    console.log('[ocrReceiptExtractor] Image URL format:', imageUrl.substring(0, 50) + '...');
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a receipt analyzer. Analyze the receipt image and extract information. Return ONLY valid JSON (no markdown, no extra text).

Extract these fields:
- checkNumber: The check/order/invoice number (string)
- restaurantName: Restaurant, store, or business name (string)
- date: Date in format YYYY-MM-DD (if not found, use empty string)
- time: Time in format HH:MM (if not found, use empty string)
- items: Array of item names/descriptions found on receipt (array of strings)
- specialNotes: Any special instructions or notes (string)
- address: Business address if present (string or empty)
- phone: Phone number if present (string or empty)

Return ONLY the JSON object, nothing else. Example:
{"checkNumber": "12345", "restaurantName": "Restaurant Name", "date": "2026-04-27", "time": "14:30", "items": ["Item 1", "Item 2"], "specialNotes": "", "address": "", "phone": ""}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this receipt image and extract the information in JSON format.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
    });
    
    // Log response (truncated to avoid huge logs)
    const responseStr = JSON.stringify(response);
    console.log('[ocrReceiptExtractor] Full LLM response:', responseStr.substring(0, 500) + (responseStr.length > 500 ? '...' : ''));
    
    if (!response || !response.choices || !response.choices[0]) {
      console.error('[ocrReceiptExtractor] Invalid LLM response:', JSON.stringify(response).substring(0, 300));
      throw new Error(`Invalid LLM response format: ${JSON.stringify(response)}`);
    }
    
    const content = response.choices[0].message.content;
    if (typeof content !== 'string') {
      console.error('[ocrReceiptExtractor] Invalid content format:', typeof content);
      throw new Error(`Invalid content format: ${JSON.stringify(content)}`);
    }
    
    console.log('[ocrReceiptExtractor] LLM vision response:', content.substring(0, 500));
    
    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error('[ocrReceiptExtractor] Failed to parse LLM response:', content);
        throw new Error('No valid JSON found in LLM response');
      }
    }
    
    // Ensure all fields are strings or arrays
    const receiptData = {
      checkNumber: String(parsed.checkNumber || '').trim(),
      restaurantName: String(parsed.restaurantName || 'Unknown Restaurant').trim(),
      date: String(parsed.date || '').trim(),
      time: String(parsed.time || '').trim(),
      items: Array.isArray(parsed.items) ? parsed.items.map((item: any) => String(item).trim()).filter(Boolean) : [],
      specialNotes: String(parsed.specialNotes || '').trim(),
      address: parsed.address ? String(parsed.address).trim() : undefined,
      phone: parsed.phone ? String(parsed.phone).trim() : undefined,
    };
    
    console.log('[ocrReceiptExtractor] Extracted receipt data:', JSON.stringify(receiptData, null, 2));
    
    return {
      ...receiptData,
      rawOCRText: content,
    };
  } catch (error) {
    console.error('[ocrReceiptExtractor] Error extracting receipt:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Extract receipt text from image URL and return formatted text
 */
export async function extractReceiptText(imageUrl: string): Promise<string> {
  try {
    console.log('[ocrReceiptExtractor] Extracting receipt text from image');
    
    // Extract the receipt data
    const receiptData = await extractReceiptData(imageUrl);
    
    // Format as readable text
    const formattedText = formatReceiptText(receiptData);
    
    return formattedText;
  } catch (error) {
    console.error('[ocrReceiptExtractor] Error extracting receipt text:', error);
    throw error;
  }
}

/**
 * Format extracted receipt data as readable text
 */
export function formatReceiptText(data: Partial<ExtractedReceiptData> & { restaurantName: string; checkNumber?: string; date?: string; time?: string; items?: (string | any)[]; specialNotes?: string }): string {
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
