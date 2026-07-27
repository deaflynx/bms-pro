import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('dist/index.html', 'utf8');

function meta(re: RegExp): string | undefined {
  return html.match(re)?.[1];
}

describe('canonical and Open Graph URLs', () => {
  const canonical = meta(/<link rel="canonical" href="([^"]+)"/);
  const ogUrl = meta(/property="og:url" content="([^"]+)"/);
  const ogImage = meta(/property="og:image" content="([^"]+)"/);

  it('emits a canonical URL', () => {
    expect(canonical).toBeDefined();
  });

  it('includes the base path — Astro.site alone omits it', () => {
    expect(canonical).toBe('https://deaflynx.github.io/bms-pro/');
  });

  it('keeps og:url identical to the canonical', () => {
    expect(ogUrl).toBe(canonical);
  });

  it('makes og:image absolute and base-prefixed, since scrapers ignore relative ones', () => {
    expect(ogImage).toMatch(/^https:\/\//);
    expect(ogImage).toBe('https://deaflynx.github.io/bms-pro/og/default.png');
  });

  it('declares the Ukrainian locale', () => {
    expect(meta(/property="og:locale" content="([^"]+)"/)).toBe('uk_UA');
  });

  it('uses a large summary card', () => {
    expect(meta(/name="twitter:card" content="([^"]+)"/)).toBe('summary_large_image');
  });
});

describe('sitewide JSON-LD', () => {
  it('emits Organization schema naming the canonical legal entity', () => {
    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].map((m) => JSON.parse(m[1]));
    const org = blocks.find((b) => b['@type'] === 'Organization');
    expect(org).toBeDefined();
    expect(org.legalName).toBe('ТОВ «УКРСИСТЕМС»');
  });
});
