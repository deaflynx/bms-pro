import { describe, expect, it } from 'vitest';
import { NAV, SITE, joinBase } from '../../src/lib/site';

describe('joinBase()', () => {
  it('prefixes a path with the GitHub Pages base', () => {
    expect(joinBase('/bms-pro/', '/products/')).toBe('/bms-pro/products/');
  });
  it('does not double the slash when the path has no leading one', () => {
    expect(joinBase('/bms-pro/', 'products/')).toBe('/bms-pro/products/');
  });
  it('adds the missing trailing slash to a base that lacks one', () => {
    expect(joinBase('/bms-pro', '/products/')).toBe('/bms-pro/products/');
  });
  it('returns the base itself for the root path', () => {
    expect(joinBase('/bms-pro/', '/')).toBe('/bms-pro/');
  });
  it('leaves paths untouched at the production root', () => {
    expect(joinBase('/', '/products/')).toBe('/products/');
    expect(joinBase('/', '/')).toBe('/');
  });
  it('handles nested document paths', () => {
    expect(joinBase('/bms-pro/', '/documents/bms-m/passport/')).toBe(
      '/bms-pro/documents/bms-m/passport/',
    );
  });
});

describe('SITE', () => {
  it('uses the canonical legal entity', () => {
    expect(SITE.legalName).toBe('ТОВ «УКРСИСТЕМС»');
  });
  it('exposes the primary phone in dialable and display form', () => {
    expect(SITE.phonePrimary).toBe('+380505460077');
    expect(SITE.phonePrimaryDisplay).toBe('+380 50 546 00 77');
  });
  it('keeps the dialable phone free of spaces and separators', () => {
    expect(SITE.phonePrimary).toMatch(/^\+\d+$/);
    expect(SITE.phoneSecondary).toMatch(/^\+\d+$/);
  });
  it('carries the registered declaration number and its ISO date', () => {
    expect(SITE.declaration).toBe('UA.TR.D.00159-25');
    expect(SITE.declarationDate).toBe('2025-07-24');
  });
  it('carries the formal TU designation', () => {
    expect(SITE.tu).toBe('ТУ У 27.9-2294811615-001:2025');
  });
  it('states plainly that the devices are not medical devices', () => {
    expect(SITE.disclaimer).toContain('не є медичними виробами');
  });
});

describe('NAV', () => {
  it('puts the products first, since selling devices is the point', () => {
    expect(NAV[0]).toEqual({ href: '/products/', label: 'Прилади' });
  });
  it('covers all five sections', () => {
    expect(NAV.map((n) => n.label)).toEqual([
      'Прилади',
      'Як це працює',
      'Технічна документація',
      'Про нас',
      'Контакти',
    ]);
  });
  it('uses trailing-slash hrefs to match the build config', () => {
    for (const item of NAV) expect(item.href).toMatch(/^\/.*\/$/);
  });
});
