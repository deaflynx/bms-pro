import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROUTES = [
  '',
  'products',
  'products/bms-m',
  'products/bms-pro',
  'products/bms-nexus',
  'products/bms-quadro',
  'how-it-works',
  'documents',
  'documents/bms-m/passport',
  'documents/bms-m/declaration',
  'documents/bms-m/technical-conditions',
  'about',
  'contacts',
  'faq',
  'privacy-policy',
];

/** HTML + CSS + JS per page. The current WordPress homepage is 689 948 B of HTML alone. */
const BUDGET = 60 * 1024;

function read(route: string): string {
  return readFileSync(`dist/${route ? `${route}/` : ''}index.html`, 'utf8');
}

function pageWeight(route: string): number {
  const html = read(route);
  let total = Buffer.byteLength(html);
  for (const m of new Set([...html.matchAll(/(?:href|src)="([^"]*\.(?:css|js))"/g)].map((x) => x[1]))) {
    const p = `dist/${m.replace(/^\/bms-pro\//, '')}`;
    if (existsSync(p)) total += statSync(p).size;
  }
  return total;
}

describe('page weight budget', () => {
  it.each(ROUTES)('/%s/ stays under 60 KB of HTML+CSS+JS', (route) => {
    const bytes = pageWeight(route);
    expect(bytes, `/${route}/ is ${(bytes / 1024).toFixed(1)} KB`).toBeLessThan(BUDGET);
  });

  it('beats the WordPress homepage by at least 10x', () => {
    expect(pageWeight('')).toBeLessThan(689948 / 10);
  });
});

describe('no eager third-party embeds', () => {
  it.each(ROUTES)('/%s/ ships no iframe', (route) => {
    expect(read(route)).not.toContain('<iframe');
  });

  // Astro splits CSS into a shared Base chunk plus one per-route chunk. That is a
  // win — the shared chunk caches across navigations — so bound requests and bytes
  // rather than forcing a single file.
  it.each(ROUTES)('/%s/ loads at most 3 local stylesheets, under 24 KB total', (route) => {
    const html = read(route);
    const local = [
      ...new Set(
        [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]),
      ),
    ].filter((h) => !h.startsWith('http'));

    expect(local.length, `/${route}/ stylesheets: ${local.join(', ')}`).toBeLessThanOrEqual(3);

    const bytes = local.reduce((sum, href) => {
      const p = `dist/${href.replace(/^\/bms-pro\//, '')}`;
      return sum + (existsSync(p) ? statSync(p).size : 0);
    }, 0);
    expect(bytes, `/${route}/ CSS is ${(bytes / 1024).toFixed(1)} KB`).toBeLessThan(24 * 1024);
  });
});

describe('required on every page', () => {
  it.each(ROUTES)('/%s/ carries the medical-device disclaimer', (route) => {
    expect(read(route)).toContain('не є медичними виробами');
  });

  it.each(ROUTES)('/%s/ prices are never presented as final', (route) => {
    const html = read(route);
    if (html.includes('₴')) expect(html).toContain('орієнтовна ціна');
  });
});

describe('accessibility floors', () => {
  it.each(ROUTES)('/%s/ has exactly one h1', (route) => {
    const h1s = read(route).match(/<h1[\s>]/g) ?? [];
    expect(h1s.length, `/${route}/ has ${h1s.length} h1 elements`).toBe(1);
  });

  it.each(ROUTES)('/%s/ gives every img an alt attribute', (route) => {
    const imgs = [...read(route).matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    for (const img of imgs) {
      expect(img, `/${route}/ img without alt: ${img.slice(0, 90)}`).toMatch(/\balt=/);
    }
  });

  it.each(ROUTES)('/%s/ gives every img explicit dimensions, to avoid layout shift', (route) => {
    const imgs = [...read(route).matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    for (const img of imgs) {
      expect(img, `/${route}/ img without width/height: ${img.slice(0, 90)}`).toMatch(/\bwidth=/);
    }
  });
});
