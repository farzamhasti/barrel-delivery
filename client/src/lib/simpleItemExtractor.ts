/**
 * Smart Position-Based Item Extractor for Aloha Receipts
 * Works for ANY Aloha receipt by finding items based on receipt structure
 * Items always appear AFTER TRAINING/DO NOT PREPARE sections
 */

export interface ExtractedItem {
  id: string;
  name: string;
}

/**
 * Extract items from Aloha receipt OCR text using position-based logic
 * This works for ANY Aloha receipt regardless of items ordered
 */
export function extractItemsFromOCR(text: string): ExtractedItem[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);

  // Step 1: Find the cutoff point
  // Items always appear AFTER these marker lines
  const cutoffPatterns = [
    /do not prepare/i,
    /training/i,
    /\*{3,}/,  // lines of 3+ asterisks
  ];

  let startIndex = 0;
  lines.forEach((line, index) => {
    if (cutoffPatterns.some(p => p.test(line))) {
      startIndex = index + 1;
    }
  });

  // Step 2: Take only lines AFTER the cutoff
  const itemLines = lines.slice(startIndex);

  // Step 3: Remove any remaining non-food lines
  const nonFoodPatterns = [
    /subtotal/i,
    /tax/i,
    /total/i,
    /balance/i,
    /^\$[\d.]+/,
    /^[\d.]+$/,
    /^[a-z]{1,3}$/i,
    /\d{1,2}\/\d{1,2}\/\d{4}/,
    /\d{1,2}:\d{2}/,
    /^(check|date|time|server|guest|table|aloha|pos|receipt|thank|welcome|bar|address|items|phone|call|order|subtotal|tax|total|tip|grand|amount)/i,
  ];

  const foodItems = itemLines.filter(line =>
    line.length > 2 &&
    !nonFoodPatterns.some(p => p.test(line))
  );

  // Step 4: Combine duplicates and preserve order
  const itemCounts = new Map<string, { original: string; count: number }>();
  
  foodItems.forEach(item => {
    const key = item.toLowerCase().trim();
    if (!itemCounts.has(key)) {
      itemCounts.set(key, { original: item, count: 0 });
    }
    const entry = itemCounts.get(key)!;
    entry.count++;
  });

  // Step 5: Format items with counts
  const items: ExtractedItem[] = [];
  let itemId = 0;

  itemCounts.forEach(({ original, count }) => {
    const displayName = count > 1 ? `${original} x${count}` : original;
    items.push({
      id: `item-${itemId++}`,
      name: displayName
    });
  });

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
