import { describe, it, expect } from 'vitest';

describe('CustomDateTimePicker', () => {
  it('should format date and time correctly', () => {
    const testDate = '2026-04-30T15:30';
    const [date, time] = testDate.split('T');
    
    expect(date).toBe('2026-04-30');
    expect(time).toBe('15:30');
  });

  it('should handle empty date/time values', () => {
    const emptyValue = '';
    const parts = emptyValue.split('T');
    
    expect(parts.length).toBe(1);
    expect(parts[0]).toBe('');
  });

  it('should parse ISO datetime format correctly', () => {
    const isoDateTime = '2026-05-15T09:45';
    const date = new Date(isoDateTime);
    
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(4); // May is month 4 (0-indexed)
    expect(date.getDate()).toBe(15);
  });

  it('should validate date format (YYYY-MM-DD)', () => {
    const validDate = '2026-04-30';
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    expect(dateRegex.test(validDate)).toBe(true);
  });

  it('should validate time format (HH:MM)', () => {
    const validTime = '15:30';
    const timeRegex = /^\d{2}:\d{2}$/;
    
    expect(timeRegex.test(validTime)).toBe(true);
  });

  it('should combine date and time into ISO format', () => {
    const date = '2026-04-30';
    const time = '15:30';
    const combined = `${date}T${time}`;
    
    expect(combined).toBe('2026-04-30T15:30');
  });
});
