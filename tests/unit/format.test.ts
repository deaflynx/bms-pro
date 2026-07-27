import { describe, expect, it } from 'vitest';
import { PRICE_NOTE, formatPrice } from '../../src/lib/format';

describe('formatPrice', () => {
  it('groups thousands and appends the hryvnia sign', () => {
    expect(formatPrice(24000)).toBe('24 000 ₴');
    expect(formatPrice(83000)).toBe('83 000 ₴');
  });
  it('handles values below a thousand', () => {
    expect(formatPrice(950)).toBe('950 ₴');
  });
  it('uses a narrow no-break space so the number never wraps mid-digit', () => {
    expect(formatPrice(48000)).not.toContain(' ');
    expect(formatPrice(48000)).toContain(' ');
  });
  it('labels prices as approximate, per the spec', () => {
    expect(PRICE_NOTE).toBe('орієнтовна ціна');
  });
});
