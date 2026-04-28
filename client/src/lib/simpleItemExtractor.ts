/**
 * Simple Item Extractor
 * Extracts food/drink items from OCR text without AI
 * Just finds non-empty lines that look like items
 */

export interface ExtractedItem {
  id: string;
  name: string;
}

/**
 * Extract items from OCR text
 * Simple approach: non-empty lines that aren't headers/footers
 */
export function extractItemsFromOCR(text: string): ExtractedItem[] {
  const lines = text.split('\n');
  const items: ExtractedItem[] = [];
  let itemId = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip common headers/footers
    if (
      trimmed.match(
        /^(Check|Total|Subtotal|Tax|Amount|Date|Time|Thank|Welcome|BAR|Address|Items|Aloha|POS|Receipt|=|Date:|Time:|Subtotal:|Tax:|Total:|Tip:|Grand|Phone|Call|Order)/i
      )
    ) {
      continue;
    }

    // Skip lines that are just numbers or prices
    if (trimmed.match(/^\d+(\.\d{2})?$/) || trimmed.match(/^-?\$?\d+(\.\d{2})?$/)) {
      continue;
    }

    // Skip very short lines (likely not items)
    if (trimmed.length < 2) continue;

    // Add as item
    items.push({
      id: `item-${itemId++}`,
      name: trimmed
    });
  }

  return items;
}

/**
 * Add a new item
 */
export function addItem(items: ExtractedItem[], name: string): ExtractedItem[] {
  const newId = `item-${Math.max(...items.map(i => parseInt(i.id.split('-')[1]) || 0), -1) + 1}`;
  return [...items, { id: newId, name }];
}

/**
 * Remove an item by id
 */
export function removeItem(items: ExtractedItem[], id: string): ExtractedItem[] {
  return items.filter(item => item.id !== id);
}

/**
 * Update an item
 */
export function updateItem(items: ExtractedItem[], id: string, name: string): ExtractedItem[] {
  return items.map(item => (item.id === id ? { ...item, name } : item));
}
