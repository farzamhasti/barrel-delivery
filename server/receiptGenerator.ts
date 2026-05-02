import sharp from "sharp";

export interface ReceiptItem {
  name: string;
  quantity: number;
}

export interface FormattedReceiptInput {
  checkNumber: string;
  items: ReceiptItem[];
}

/**
 * Generate a formatted delivery receipt image as PNG buffer
 * Pure function with no side effects or external dependencies
 */
export async function generateFormattedReceipt(
  input: FormattedReceiptInput
): Promise<Buffer> {
  const svg = createReceiptSVG(input);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return pngBuffer;
}

/**
 * Create SVG template for receipt
 * Pure function that returns SVG string
 */
function createReceiptSVG(input: FormattedReceiptInput): string {
  const { checkNumber, items } = input;
  const itemHeight = 30;
  const baseHeight = 300;
  const totalHeight = baseHeight + items.length * itemHeight;

  const itemsHTML = items
    .map(
      (item, index) => `
    <text x="40" y="${210 + index * itemHeight}" font-size="14" font-family="Arial">
      - ${item.name}
    </text>
    <text x="760" y="${210 + index * itemHeight}" font-size="14" font-family="Arial" text-anchor="end">
      x${item.quantity}
    </text>
  `
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <!-- White background -->
  <rect width="800" height="${totalHeight}" fill="white"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="760" height="${totalHeight - 40}" fill="none" stroke="black" stroke-width="2"/>
  
  <!-- Header -->
  <text x="400" y="60" font-size="28" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">
    BARREL DELIVERY
  </text>
  <text x="400" y="95" font-size="14" font-family="Arial, sans-serif" text-anchor="middle" fill="#666666">
    DELIVERY RECEIPT
  </text>
  
  <!-- Top divider -->
  <line x1="40" y1="110" x2="760" y2="110" stroke="black" stroke-width="1"/>
  
  <!-- Check Number -->
  <text x="40" y="145" font-size="13" font-family="Arial, sans-serif" font-weight="bold">
    Check #:
  </text>
  <text x="760" y="145" font-size="13" font-family="Arial, sans-serif" text-anchor="end" font-weight="bold">
    ${checkNumber}
  </text>
  
  <!-- Items Header -->
  <text x="40" y="175" font-size="13" font-family="Arial, sans-serif" font-weight="bold">
    ORDER ITEMS:
  </text>
  
  <!-- Items -->
  ${itemsHTML}
  
  <!-- Bottom divider -->
  <line x1="40" y1="${215 + items.length * itemHeight}" x2="760" y2="${215 + items.length * itemHeight}" stroke="black" stroke-width="1"/>
  
  <!-- Footer -->
  <text x="400" y="${250 + items.length * itemHeight}" font-size="12" font-family="Arial, sans-serif" text-anchor="middle" fill="#666666">
    Thank you for your order!
  </text>
</svg>`;
}
