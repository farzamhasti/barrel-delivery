/**
 * Tesseract.js-based Receipt Parser
 * Extracts check number, items, modifiers, and address from receipt text
 * No external API calls - runs entirely in browser
 */

export interface ParsedReceipt {
  checkNumber: string | null;
  items: Array<{
    name: string;
    modifiers: string[];
  }>;
  address: string | null;
  rawText: string;
}

/**
 * Extract check number from receipt text
 */
function extractCheckNumber(text: string): string | null {
  const lines = text.split('\n');
  
  for (const line of lines) {
    const checkMatch = line.match(/Check[:\s]+(\d+)/i);
    if (checkMatch) {
      return checkMatch[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract food/drink items and their modifiers from receipt text
 */
function extractItems(text: string): Array<{ name: string; modifiers: string[] }> {
  const lines = text.split('\n');
  const items: Array<{ name: string; modifiers: string[] }> = [];
  
  let currentItem: { name: string; modifiers: string[] } | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) continue;
    
    if (trimmed.match(/^(Check|Total|Subtotal|Tax|Amount|Date|Time|Thank|Welcome|BAR|Address|Items|Aloha|POS|Receipt|=|Date:|Time:)/i)) {
      continue;
    }
    
    const leadingSpaces = line.match(/^(\s+)/)?.[1] || '';
    const isIndented = leadingSpaces.length > 0;
    
    if (isIndented) {
      if (currentItem) {
        currentItem.modifiers.push(trimmed);
      }
    } else {
      if (!trimmed.match(/^\d+(\.\d{2})?$/) && !trimmed.match(/^-?\$?\d+(\.\d{2})?$/) && trimmed.length > 0) {
        if (currentItem) {
          items.push(currentItem);
        }
        currentItem = {
          name: trimmed,
          modifiers: []
        };
      }
    }
  }
  
  if (currentItem) {
    items.push(currentItem);
  }
  
  return items;
}

/**
 * Extract delivery address from receipt text
 */
function extractAddress(text: string): string | null {
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    
    if (line.match(/^BAR$/i)) {
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine) {
          return nextLine;
        }
      }
    }
  }
  
  return null;
}

/**
 * Parse receipt text extracted by Tesseract.js
 */
export function parseReceiptText(text: string): ParsedReceipt {
  return {
    checkNumber: extractCheckNumber(text),
    items: extractItems(text),
    address: extractAddress(text),
    rawText: text
  };
}

/**
 * Format parsed receipt data for display
 */
export function formatParsedReceipt(parsed: ParsedReceipt): string {
  let formatted = '';
  
  if (parsed.checkNumber) {
    formatted += `Check: ${parsed.checkNumber}\n\n`;
  }
  
  if (parsed.items.length > 0) {
    formatted += 'Items:\n';
    parsed.items.forEach(item => {
      formatted += `- ${item.name}\n`;
      item.modifiers.forEach(mod => {
        formatted += `  • ${mod}\n`;
      });
    });
    formatted += '\n';
  }
  
  if (parsed.address) {
    formatted += `Address: ${parsed.address}\n`;
  }
  
  return formatted;
}
