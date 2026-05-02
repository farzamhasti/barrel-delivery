import { describe, it, expect, vi } from 'vitest';
import { geocodeAddress } from './_core/map';

describe('Geocoding', () => {
  it('should geocode a valid address', async () => {
    // Test with Fort Erie, Ontario (where the restaurant is located)
    const result = await geocodeAddress('224 Garrison Rd, Fort Erie, ON L2A 1M7');
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('lat');
    expect(result).toHaveProperty('lng');
    expect(typeof result?.lat).toBe('number');
    expect(typeof result?.lng).toBe('number');
    
    // Fort Erie coordinates should be around 42.9, -78.9
    expect(result?.lat).toBeGreaterThan(42);
    expect(result?.lat).toBeLessThan(43);
    expect(result?.lng).toBeGreaterThan(-79);
    expect(result?.lng).toBeLessThan(-78);
  });

  it('should return null for invalid address', async () => {
    const result = await geocodeAddress('xyzabc123notarealaddress');
    expect(result).toBeNull();
  });

  it('should handle empty address', async () => {
    const result = await geocodeAddress('');
    expect(result).toBeNull();
  });
});
