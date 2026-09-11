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
  it('contains exactly the five devices', () => {
    expect(files).toEqual(['bms-m.md', 'bms-magnus.md', 'bms-nexus.md', 'bms-pro.md', 'bms-quadro.md']);
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
      'bms-magnus': 130000,
    });
  });

  it('gives every device a distinct tagline, so the pages do not compete in search', () => {
    const taglines = Object.values(products).map((p) => p.data.tagline);
    expect(new Set(taglines).size).toBe(files.length);
  });

  it('gives every device distinct body copy of its own, not a shared blurb', () => {
    const bodies = Object.values(products).map((p) => p.body);
    expect(new Set(bodies).size).toBe(files.length);
    for (const [slug, { body }] of Object.entries(products)) {
      const words = body.replace(/^#+ /gm, '').split(/\s+/).filter(Boolean);
      expect(words.length, `${slug} body`).toBeGreaterThanOrEqual(200);
    }
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

  it('claims only the documents that exist: the BMS (m, Pro) set and the Quadro passport', () => {
    const full = ['passport', 'declaration', 'technical-conditions'];
    expect(products['bms-m'].data.documents).toEqual(full);
    expect(products['bms-pro'].data.documents).toEqual(full);
    expect(products['bms-quadro'].data.documents).toEqual(['passport']);
    for (const slug of ['bms-nexus', 'bms-magnus']) {
      expect(products[slug].data.documents, `${slug} must not claim documents yet`).toEqual([]);
    }
  });

  it('carries the power figures the client confirmed on 2026-09-07', () => {
    const power = (slug: string) => products[slug].data.specs['Споживана потужність'];
    expect(power('bms-m')).toBe('≤20 Вт');
    expect(power('bms-pro')).toBe('≤20 Вт');
    expect(power('bms-nexus')).toBe('36 Вт');
    expect(power('bms-magnus')).toBe('80 Вт');
    expect(power('bms-quadro')).toBe('≤15 ВА');
    expect(products['bms-magnus'].data.specs['Частота в обертах']).toBe('600–1150 об/хв');
  });

  it('states a frequency range in every spec sheet, so the matrix row is never a guess', () => {
    for (const [slug, { data }] of Object.entries(products)) {
      const key = Object.keys(data.specs).find((k) => k.startsWith('Частота коливань'));
      expect(key, `${slug} specs`).toBeDefined();
      expect(data.specs[key!], `${slug} frequency`).toMatch(/^\d+–\d+ Гц$/);
    }
  });

  it('keeps BMS Magnus, the leg platform, inside the documented platform range', () => {
    expect(products['bms-magnus'].data.specs['Частота коливань']).toBe('20–35 Гц');
    expect(products['bms-magnus'].data.zones).toContain('Ноги');
  });
});

const FAQ_DIR = 'src/content/faq';
const faq = readdirSync(FAQ_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const raw = readFileSync(`${FAQ_DIR}/${f}`, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) throw new Error(`${f} has no frontmatter`);
    return {
      file: f,
      data: load(match[1]) as { question: string; models: string[]; order: number },
    };
  });

describe('faq collection', () => {
  it('keeps the general questions off the device pages, where they only duplicate', () => {
    const general = faq.filter((q) => q.data.models.length === 0).map((q) => q.file);
    expect(general).toContain('medical-device.md');
    expect(general).toContain('warranty.md');
    expect(general).toContain('delivery.md');
    expect(general.length).toBeGreaterThanOrEqual(8);
  });

  it('gives every device at least two questions of its own', () => {
    for (const slug of Object.keys(products)) {
      const mine = faq.filter((q) => q.data.models.includes(slug));
      expect(mine.length, `${slug} questions`).toBeGreaterThanOrEqual(2);
    }
  });

  it('names only devices that exist', () => {
    for (const q of faq) {
      for (const m of q.data.models) expect(Object.keys(products), q.file).toContain(m);
    }
  });

  it('orders every question distinctly, so /faq/ is stable', () => {
    const orders = faq.map((q) => q.data.order);
    expect(new Set(orders).size, orders.join()).toBe(faq.length);
  });
});
