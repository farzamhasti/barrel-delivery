import { describe, it, expect } from 'vitest';
import { parseReceiptText, formatParsedReceipt } from './tesseractReceiptParser';

describe('Tesseract Receipt Parser', () => {
  it('should extract check number from receipt text', () => {
    const receiptText = `
      Check: 12345
      Wings
      Mild
      Pizza
      Large
    `;
    
    const result = parseReceiptText(receiptText);
    expect(result.checkNumber).toBe('12345');
  });

  it('should extract food items only', () => {
    const receiptText = `
      Check: 001
      Wings
      Pizza
      Pasta
      Total: $25.00
    `;
    
    const result = parseReceiptText(receiptText);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some(item => item.name.includes('Wings'))).toBe(true);
    expect(result.items.some(item => item.name.includes('Pizza'))).toBe(true);
  });

  it('should extract modifiers (indented lines under items)', () => {
    const receiptText = `
      Check: 001
      Wings
        Mild
        Extra Sauce
      Pizza
        Large
    `;
    
    const result = parseReceiptText(receiptText);
    const wingsItem = result.items.find(item => item.name.includes('Wings'));
    expect(wingsItem).toBeDefined();
    expect(wingsItem?.modifiers.length).toBeGreaterThan(0);
  });

  it('should extract address after BAR line', () => {
    const receiptText = `
      Check: 001
      Items
      BAR
      123 Main Street
      Fort Erie, ON
    `;
    
    const result = parseReceiptText(receiptText);
    expect(result.address).toBe('123 Main Street');
  });

  it('should format parsed receipt correctly', () => {
    const receiptText = `
      Check: 001
      Wings
        Mild
      Pizza
      BAR
      123 Main Street
    `;
    
    const parsed = parseReceiptText(receiptText);
    const formatted = formatParsedReceipt(parsed);
    
    expect(formatted).toContain('Check: 001');
    expect(formatted).toContain('Items:');
    expect(formatted).toContain('Address: 123 Main Street');
  });

  it('should handle missing check number', () => {
    const receiptText = `
      Wings
      Pizza
    `;
    
    const result = parseReceiptText(receiptText);
    expect(result.checkNumber).toBeNull();
  });

  it('should handle missing address', () => {
    const receiptText = `
      Check: 001
      Wings
      Pizza
    `;
    
    const result = parseReceiptText(receiptText);
    expect(result.address).toBeNull();
  });

  it('should skip price lines and numbers', () => {
    const receiptText = `
      Check: 001
      Wings
      12.99
      Pizza
      15.50
    `;
    
    const result = parseReceiptText(receiptText);
    // Should not include price lines as items
    const priceItems = result.items.filter(item => item.name.match(/^\d+(\.\d{2})?$/));
    expect(priceItems.length).toBe(0);
  });

  it('should handle real-world receipt format', () => {
    const receiptText = `
Aloha POS Receipt
================
Check: 5001
Date: 04/28/2026
Time: 12:30 PM

Items:
Wings
  Mild
  Extra Sauce
Pizza
  Large
  Pepperoni
Pasta
  Alfredo

Subtotal: $45.00
Tax: $5.40
Total: $50.40

BAR
123 Main Street
Fort Erie, ON L2A 1A1

Thank you for your order!
    `;
    
    const result = parseReceiptText(receiptText);
    expect(result.checkNumber).toBe('5001');
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.address).toBe('123 Main Street');
  });
});
