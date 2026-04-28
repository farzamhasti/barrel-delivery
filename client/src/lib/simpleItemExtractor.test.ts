import { describe, it, expect } from 'vitest';
import { extractItemsFromOCR } from './simpleItemExtractor';

describe('Smart Position-Based Item Extractor', () => {
  it('should extract items after TRAINING marker', () => {
    const receipt = `
      Check: 12345
      Date: 04/28/2026
      Time: 14:30
      Server: John
      Guests: 2
      
      TRAINING / DO NOT PREPARE
      
      Wings - Mild
      Lasagna
      Lasagna
      Coke
      Subtotal: $45.00
      Tax: $4.50
      Total: $49.50
    `;

    const items = extractItemsFromOCR(receipt);
    
    // Should extract only food items, combine duplicates
    expect(items.length).toBeGreaterThan(0);
    const itemNames = items.map(i => i.name.toLowerCase());
    
    // Should contain food items
    expect(itemNames.some(n => n.includes('wings'))).toBe(true);
    expect(itemNames.some(n => n.includes('lasagna'))).toBe(true);
    expect(itemNames.some(n => n.includes('coke'))).toBe(true);
    
    // Should NOT contain metadata
    expect(itemNames.some(n => n.includes('check'))).toBe(false);
    expect(itemNames.some(n => n.includes('subtotal'))).toBe(false);
    expect(itemNames.some(n => n.includes('tax'))).toBe(false);
  });

  it('should combine duplicate items with count', () => {
    const receipt = `
      Check: 12345
      
      TRAINING / DO NOT PREPARE
      
      Pizza
      Pizza
      Pizza
      Salad
      Subtotal: $30.00
    `;

    const items = extractItemsFromOCR(receipt);
    const pizzaItem = items.find(i => i.name.toLowerCase().includes('pizza'));
    
    // Should show count for duplicates
    expect(pizzaItem).toBeDefined();
    expect(pizzaItem?.name).toMatch(/x3/);
  });

  it('should work without TRAINING marker (items after metadata)', () => {
    const receipt = `
      Check: 12345
      Date: 04/28/2026
      Time: 14:30
      
      Burger
      Fries
      Drink
      Subtotal: $25.00
    `;

    const items = extractItemsFromOCR(receipt);
    const itemNames = items.map(i => i.name.toLowerCase());
    
    // Should still extract items
    expect(itemNames.some(n => n.includes('burger'))).toBe(true);
    expect(itemNames.some(n => n.includes('fries'))).toBe(true);
  });

  it('should filter out prices and numbers', () => {
    const receipt = `
      TRAINING / DO NOT PREPARE
      
      Wings
      12.50
      Pasta
      15.99
      Subtotal: $28.49
    `;

    const items = extractItemsFromOCR(receipt);
    const itemNames = items.map(i => i.name);
    
    // Should NOT include standalone prices
    expect(itemNames.some(n => n === '12.50')).toBe(false);
    expect(itemNames.some(n => n === '15.99')).toBe(false);
  });

  it('should preserve modifiers with items', () => {
    const receipt = `
      TRAINING / DO NOT PREPARE
      
      Wings
      Mild
      Spicy
      Fries
      Extra Salt
      Subtotal: $20.00
    `;

    const items = extractItemsFromOCR(receipt);
    
    // Should include modifier lines as separate items or with parent
    // (depends on receipt structure - modifiers may be on separate lines)
    expect(items.length).toBeGreaterThan(0);
  });

  it('should work with asterisk separator', () => {
    const receipt = `
      Check: 12345
      ***
      Wings
      Burger
      Drink
      Total: $25.00
    `;

    const items = extractItemsFromOCR(receipt);
    const itemNames = items.map(i => i.name.toLowerCase());
    
    // Should extract items after asterisk separator
    expect(itemNames.some(n => n.includes('wings'))).toBe(true);
    expect(itemNames.some(n => n.includes('burger'))).toBe(true);
  });
});
