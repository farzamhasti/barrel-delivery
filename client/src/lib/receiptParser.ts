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
 * Looks for line containing "Check:" and extracts the number after it
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
 * Items are lines that are not indented
 * Modifiers are indented lines that follow an item
 */
function extractItems(text: string): Array<{ name: string; modifiers: string[] }> {
  const lines = text.split('\n');
  const items: Array<{ name: string; modifiers: string[] }> = [];
  
  let currentItem: { name: string; modifiers: string[] } | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Skip lines that are clearly headers or footers
    if (trimmed.match(/^(Check|Total|Subtotal|Tax|Amount|Date|Time|Thank|Welcome|BAR|Address)/i)) {
      continue;
    }
    
    // Check if line is indented (modifier)
    const isIndented = line.startsWith(' ') || line.startsWith('\t');
    
    if (isIndented) {
      // This is a modifier - add to current item if exists
      if (currentItem) {
        currentItem.modifiers.push(trimmed);
      }
    } else {
      // This is a new item
      // Only add if it looks like a food/drink item (not a number or price)
      if (!trimmed.match(/^\d+(\.\d{2})?$/) && !trimmed.match(/^-?\$?\d+(\.\d{2})?$/)) {
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
  
  // Add last item if exists
  if (currentItem) {
    items.push(currentItem);
  }
  
  return items;
}

/**
 * Extract delivery address from receipt text
 * Address should be on the line immediately after "BAR"
 */
function extractAddress(text: string): string | null {
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    
    // Look for "BAR" line
    if (line.match(/^BAR$/i)) {
      // Get next non-empty line as address
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
 * Returns structured data with check number, items, modifiers, and address
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
