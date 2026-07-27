import { readdirSync, readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

const DIR = 'src/content/products';
const files = readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();

interface Product {
  name: string;
  tagline: string;
  zones: string[];
  price: number;
  channels: string;
  indicator: string;
  usage: string;
  image: string;
  gallery: string[];
  specs: Record<string, string>;
  included: { item: string; qty: number }[];
  documents: string[];
  order: number;
}

/** Parses frontmatter with real YAML — a naive regex reader hides unquoted-colon bugs. */
function parse(file: string): { data: Product; body: string } {
  const raw = readFileSync(`${DIR}/${file}`, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file} has no frontmatter`);
  return { data: load(match[1]) as Product, body: match[2].trim() };
}

const products = Object.fromEntries(files.map((f) => [f.replace('.md', ''), parse(f)]));

describe('product collection', () => {
  it('contains exactly the four devices', () => {
    expect(files).toEqual(['bms-m.md', 'bms-nexus.md', 'bms-pro.md', 'bms-quadro.md']);
  });

  it('parses as valid YAML, with every field the expected type', () => {
    for (const [slug, { data }] of Object.entries(products)) {
      expect(typeof data.name, `${slug}.name`).toBe('string');
      expect(typeof data.tagline, `${slug}.tagline`).toBe('string');
      expect(typeof data.price, `${slug}.price`).toBe('number');
      expect(Array.isArray(data.zones), `${slug}.zones`).toBe(true);
      expect(Array.isArray(data.gallery), `${slug}.gallery`).toBe(true);
      expect(Array.isArray(data.included), `${slug}.included`).toBe(true);
      expect(typeof data.specs, `${slug}.specs`).toBe('object');
    }
  });

  it('prices match the spec', () => {
    expect(Object.fromEntries(Object.entries(products).map(([s, p]) => [s, p.data.price]))).toEqual({
      'bms-m': 24000,
      'bms-pro': 32000,
      'bms-nexus': 48000,
      'bms-quadro': 83000,
    });
  });

  it('gives every device a distinct tagline, so the pages do not compete in search', () => {
    const taglines = Object.values(products).map((p) => p.data.tagline);
    expect(new Set(taglines).size).toBe(files.length);
  });

  it('gives every device distinct body copy', () => {
    const bodies = Object.values(products).map((p) => p.body);
    expect(new Set(bodies).size).toBe(files.length);
    for (const b of bodies) expect(b.length).toBeGreaterThan(40);
  });

  it('uses only the four known indicator types', () => {
    const allowed = ['analog', 'digital', 'dual-digital', 'roller'];
    for (const [slug, { data }] of Object.entries(products)) {
      expect(allowed, slug).toContain(data.indicator);
    }
  });

  it('gives BMS Nexus two stimulation blocks, matching its two channels', () => {
    const nexus = products['bms-nexus'].data;
    expect(nexus.channels).toBe('2');
    expect(nexus.indicator).toBe('dual-digital');
    expect(nexus.included.find((i) => i.item.includes('стимуляції'))?.qty).toBe(2);
  });

  it('orders the range from cheapest to most expensive', () => {
    const prices = Object.values(products)
      .sort((a, b) => a.data.order - b.data.order)
      .map((p) => p.data.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('gives every device an image and gallery that exist on disk', () => {
    for (const [slug, { data }] of Object.entries(products)) {
      for (const img of [data.image, ...data.gallery]) {
        expect(() => readFileSync(`public${img}`), `${slug}: ${img}`).not.toThrow();
      }
    }
  });

  it('only claims documents for BMS m, the one model whose documents exist', () => {
    expect(products['bms-m'].data.documents).toEqual([
      'passport',
      'declaration',
      'technical-conditions',
    ]);
    for (const slug of ['bms-pro', 'bms-nexus', 'bms-quadro']) {
      expect(products[slug].data.documents, `${slug} must not claim documents yet`).toEqual([]);
    }
  });

  it('states the 20-40 Hz range in every spec sheet', () => {
    for (const [slug, { data }] of Object.entries(products)) {
      const values = Object.values(data.specs).join(' ');
      expect(values, `${slug} specs`).toContain('20–40 Гц');
    }
  });
});
