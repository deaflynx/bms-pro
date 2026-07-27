import { describe, expect, it } from 'vitest';
import { PRICE_NOTE, formatPrice } from '../../src/lib/format';

const THIN = ' ';
const NBSP = ' ';

describe('formatPrice', () => {
  it('groups thousands and appends the hryvnia sign', () => {
    expect(formatPrice(24000)).toBe(`24${THIN}000${NBSP}₴`);
    expect(formatPrice(83000)).toBe(`83${THIN}000${NBSP}₴`);
  });

  it('handles values below a thousand', () => {
    expect(formatPrice(950)).toBe(`950${NBSP}₴`);
  });

  it('never uses a plain space, so a price cannot wrap mid-number', () => {
    expect(formatPrice(48000)).not.toContain(' ');
  });

  it('groups digits with U+202F and precedes the currency sign with U+00A0', () => {
    const out = formatPrice(48000);
    expect(out.indexOf(THIN)).toBe(2);
    expect(out.at(-2)).toBe(NBSP);
  });

  it('labels prices as approximate, per the spec', () => {
    expect(PRICE_NOTE).toBe('орієнтовна ціна');
  });
});
