import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

export interface ReceiptData {
  checkNumber: string | null;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  rawText: string;
}

/**
 * Extract text from receipt image using Tesseract OCR
 */
export async function extractReceiptText(imagePath: string): Promise<string> {
  try {
    // Tesseract requires the image to be in a supported format
    // Convert to PNG if needed for better OCR results
    const tempDir = path.join("/tmp", `receipt-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const processedImagePath = path.join(tempDir, "processed.png");

    // Enhance image for better OCR: increase contrast, resize
    await sharp(imagePath)
      .resize(2400, 3200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .grayscale()
      .normalize()
      .png()
      .toFile(processedImagePath);

    // Run Tesseract OCR
    const textOutputPath = path.join(tempDir, "output");
    const command = `tesseract "${processedImagePath}" "${textOutputPath}" --psm 6 -l eng`;

    try {
      execSync(command, { encoding: "utf-8" });
    } catch (error) {
      // Tesseract exits with code 0 even on success, so we ignore errors
    }

    const textPath = `${textOutputPath}.txt`;
    if (!fs.existsSync(textPath)) {
      throw new Error("OCR failed to generate text output");
    }

    const text = fs.readFileSync(textPath, "utf-8");

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });

    return text;
  } catch (error) {
    console.error("OCR extraction error:", error);
    throw new Error(`Failed to extract text from receipt: ${error}`);
  }
}

/**
 * Parse receipt text to extract check number and items
 */
export function parseReceiptText(text: string): ReceiptData {
  const lines = text.split("\n").map((line) => line.trim());

  // Extract check number - look for patterns like "Check: 40134" or "40134"
  let checkNumber: string | null = null;
  const checkPatterns = [
    /Check\s*[:#]?\s*(\d+)/i,
    /Check\s*(\d+)/i,
    /^(\d{5})$/m, // 5-digit number on its own line
  ];

  for (const pattern of checkPatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        checkNumber = match[1];
        break;
      }
    }
    if (checkNumber) break;
  }

  // Extract items - look for patterns like "- Item Name" or "Item Name x2"
  const items: Array<{ name: string; quantity: number }> = [];
  const itemPatterns = [
    /^-\s+(.+?)\s+x(\d+)$/i, // "- Item Name x2"
    /^-\s+(.+)$/i, // "- Item Name"
    /^(.+?)\s+x(\d+)$/i, // "Item Name x2"
  ];

  for (const line of lines) {
    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match) {
        const itemName = match[1].trim();
        const quantity = match[2] ? parseInt(match[2]) : 1;

        // Skip common non-item lines
        if (
          !itemName.match(
            /^(check|date|time|total|subtotal|tax|thank|guest|bar|training|do not)/i
          ) &&
          itemName.length > 2
        ) {
          items.push({ name: itemName, quantity });
        }
        break;
      }
    }
  }

  return {
    checkNumber,
    items,
    rawText: text,
  };
}

/**
 * Extract receipt data from image
 */
export async function analyzeReceipt(imagePath: string): Promise<ReceiptData> {
  const text = await extractReceiptText(imagePath);
  return parseReceiptText(text);
}
