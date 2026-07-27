import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SLUGS = ['bms-m', 'bms-pro', 'bms-nexus', 'bms-quadro'] as const;

function page(slug: string): string {
  return readFileSync(`dist/products/${slug}/index.html`, 'utf8');
}
function markup(slug: string): string {
  return page(slug).replace(/<script[\s\S]*?<\/script>/g, '');
}
function jsonLd(html: string): any[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1]),
  );
}

describe('product pages', () => {
  it('emits a page per device plus the catalogue', () => {
    expect(existsSync('dist/products/index.html')).toBe(true);
    for (const s of SLUGS) expect(existsSync(`dist/products/${s}/index.html`), s).toBe(true);
  });

  it('carries Product schema with a hryvnia Offer', () => {
    for (const s of SLUGS) {
      const product = jsonLd(page(s)).find((b) => b['@type'] === 'Product');
      expect(product, `${s} is missing Product schema`).toBeDefined();
      expect(product.offers.priceCurrency).toBe('UAH');
      expect(product.offers.price).toBeGreaterThan(0);
      expect(product.offers.url).toContain(`/products/${s}/`);
      expect(product.manufacturer.name).toBe('ТОВ «УКРСИСТЕМС»');
    }
  });

  it('carries BreadcrumbList schema ending on the model', () => {
    for (const s of SLUGS) {
      const crumbs = jsonLd(page(s)).find((b) => b['@type'] === 'BreadcrumbList');
      expect(crumbs, `${s} is missing BreadcrumbList`).toBeDefined();
      expect(crumbs.itemListElement).toHaveLength(3);
      expect(crumbs.itemListElement[0].name).toBe('Головна');
      expect(crumbs.itemListElement[1].name).toBe('Прилади');
    }
  });

  it('gives BMS Nexus two instrument channels', () => {
    const m = markup('bms-nexus');
    expect(m.match(/data-channel="/g)).toHaveLength(2);
    expect(m).toContain('data-digital="true"');
  });

  it('gives BMS m a panel with no digital readout, like the real device', () => {
    const m = markup('bms-m');
    expect(m).toContain('data-digital="false"');
    expect(m.match(/data-channel="/g)).toHaveLength(1);
    expect(m).not.toContain('data-digits=');
  });

  it('turns the BMS m photos into a slider with one thumbnail each', () => {
    const m = markup('bms-m');
    expect(m).toContain('data-gallery');
    expect(m.match(/class="slide/g)).toHaveLength(3);
    expect(m.match(/data-thumb="/g)).toHaveLength(3);
    for (const img of ['bms-m-front.webp', 'bms-m-rear.webp', 'case-card.webp']) {
      expect(m, img).toContain(`/assets/img/${img}`);
    }
  });

  it('drops the slider controls when a device has a single photo', () => {
    const m = markup('bms-pro');
    expect(m.match(/class="slide/g)).toHaveLength(1);
    expect(m).not.toContain('data-thumb=');
    expect(m).not.toContain('class="nav');
  });

  it('lists the BMS m benefits under their own heading', () => {
    const m = markup('bms-m');
    expect(m).toContain('Переваги BMS m');
    expect(m).toContain('Механічний принцип дії без електричного впливу на організм');
    expect(m).toContain('Компактність і зручність у застосуванні');
  });

  it('gives each device a distinct title and meta description', () => {
    const titles = new Set<string>();
    const descs = new Set<string>();
    for (const s of SLUGS) {
      const html = page(s);
      titles.add(html.match(/<title>(.*?)<\/title>/)![1]);
      descs.add(html.match(/<meta name="description" content="(.*?)"/)![1]);
    }
    expect(titles.size).toBe(SLUGS.length);
    expect(descs.size).toBe(SLUGS.length);
  });

  it('links every device to the others through the matrix', () => {
    for (const s of SLUGS) {
      const m = markup(s);
      for (const other of SLUGS.filter((x) => x !== s)) {
        expect(m, `${s} should link to ${other}`).toContain(`/bms-pro/products/${other}/`);
      }
    }
  });

  it('marks the current model in the matrix', () => {
    expect(markup('bms-pro')).toContain('Ця модель');
  });

  it('shows the price with the approximate label', () => {
    const m = markup('bms-quadro');
    // U+202F groups the digits, U+00A0 precedes the currency sign
    expect(m).toContain('83 000 ₴');
    expect(m).toContain('орієнтовна ціна');
  });

  it('links BMS m to its three documents and says the rest are pending', () => {
    const m = markup('bms-m');
    for (const t of ['passport', 'declaration', 'technical-conditions']) {
      expect(m).toContain(`/bms-pro/documents/bms-m/${t}/`);
    }
    expect(markup('bms-quadro')).toContain('готуються');
  });

  it('lists комплектація from the passport', () => {
    expect(markup('bms-m')).toContain('Блок стимуляції');
  });

  it('carries the disclaimer and a dialable phone on every page', () => {
    for (const s of SLUGS) {
      expect(markup(s), s).toContain('не є медичними виробами');
      expect(markup(s), s).toContain('tel:+380505460077');
    }
  });

  it('never ships an iframe', () => {
    for (const s of SLUGS) expect(page(s), s).not.toContain('<iframe');
  });
});

describe('products catalogue', () => {
  const html = readFileSync('dist/products/index.html', 'utf8');

  it('emits ItemList schema over the four devices', () => {
    const list = jsonLd(html).find((b) => b['@type'] === 'ItemList');
    expect(list).toBeDefined();
    expect(list.itemListElement).toHaveLength(4);
  });

  it('links to all four product pages', () => {
    for (const s of SLUGS) expect(html).toContain(`/bms-pro/products/${s}/`);
  });
});
