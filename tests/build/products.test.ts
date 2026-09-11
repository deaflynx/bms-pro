import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SLUGS = ['bms-m', 'bms-pro', 'bms-nexus', 'bms-quadro', 'bms-magnus'] as const;

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

  it('gives Product schema an absolute image — Google discards relative URLs', () => {
    for (const s of SLUGS) {
      const product = jsonLd(page(s)).find((b) => b['@type'] === 'Product');
      expect(product.image, s).toMatch(/^https:\/\//);
      expect(product.image, s).toContain(`/assets/img/${s}-card.webp`);
    }
  });

  it('leaves FAQPage to /faq/ — six copies of one node help nothing', () => {
    for (const s of SLUGS) {
      expect(jsonLd(page(s)).find((b) => b['@type'] === 'FAQPage'), s).toBeUndefined();
    }
  });

  it('links out to the full FAQ from each device page', () => {
    for (const s of SLUGS) expect(markup(s), s).toContain('Усі питання про прилади BMS');
  });

  it('carries Product schema with a hryvnia Offer', () => {
    for (const s of SLUGS) {
      const product = jsonLd(page(s)).find((b) => b['@type'] === 'Product');
      expect(product, `${s} is missing Product schema`).toBeDefined();
      expect(product.offers.priceCurrency).toBe('UAH');
      expect(product.offers.price).toBeGreaterThan(0);
      expect(product.offers.url).toContain(`/products/${s}/`);
      expect(product.manufacturer.name).toBe('Системи біомеханічної стимуляції');
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

  it('ships no interactive panel — it lives on /how-it-works/ alone', () => {
    for (const s of SLUGS) {
      expect(markup(s), s).not.toContain('data-channel=');
      expect(markup(s), s).not.toContain('Панель керування');
    }
  });

  it('still names the panel type in the hero chips', () => {
    expect(markup('bms-m')).toContain('Аналоговий регулятор');
    expect(markup('bms-nexus')).toContain('Два цифрові канали');
  });

  it('turns the BMS m photos into a slider with one thumbnail each', () => {
    const m = markup('bms-m');
    expect(m).toContain('data-gallery');
    expect(m.match(/class="slide/g)).toHaveLength(3);
    expect(m.match(/data-thumb="/g)).toHaveLength(3);
    for (const img of ['bms-m-1.webp', 'bms-m-2.webp', 'bms-m-3.webp']) {
      expect(m, img).toContain(`/assets/img/${img}`);
    }
  });

  it('gives every device a multi-photo slider with controls', () => {
    for (const slug of ['bms-pro', 'bms-nexus', 'bms-quadro', 'bms-magnus']) {
      const m = markup(slug);
      expect(m.match(/class="slide/g), slug).toHaveLength(3);
      expect(m, slug).toContain('data-thumb=');
      expect(m, slug).toContain('class="nav');
    }
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

  it('links every device to the other four, now that the matrix has gone', () => {
    for (const s of SLUGS) {
      const m = markup(s);
      for (const other of SLUGS.filter((x) => x !== s)) {
        expect(m, `${s} should link to ${other}`).toContain(`/bms-pro/products/${other}/`);
      }
    }
  });

  it('carries no comparison matrix — the home page holds the only copy', () => {
    for (const s of SLUGS) {
      expect(markup(s), s).not.toContain('Порівняння моделей');
      expect(markup(s), s).not.toContain('Ця модель');
    }
  });

  it('points at that matrix instead', () => {
    for (const s of SLUGS) {
      expect(markup(s), s).toContain('Порівняти з іншими моделями');
      expect(markup(s), s).toContain('href="/bms-pro/#compare"');
    }
  });

  it('gives each device its own description of at least 200 words', () => {
    const texts = SLUGS.map((s) => {
      const prose = markup(s).match(/<div class="prose"[^>]*>([\s\S]*?)<\/div>/)![1];
      return prose.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    });
    for (const [i, text] of texts.entries()) {
      expect(text.split(' ').length, `${SLUGS[i]} description`).toBeGreaterThanOrEqual(200);
    }
    expect(new Set(texts).size, 'descriptions must all differ').toBe(SLUGS.length);
  });

  it('asks only model-specific questions, leaving the general ones to /faq/', () => {
    for (const s of SLUGS) {
      const m = markup(s);
      expect(m, `${s} should keep a question of its own`).toContain('Питання та відповіді');
      expect(m, s).not.toContain('Чи є прилади BMS медичними виробами');
      expect(m, s).not.toContain('Яка гарантія на прилад');
      expect(m, s).not.toContain('Як замовити та отримати прилад');
    }
  });

  it('shows the price with the approximate label', () => {
    const m = markup('bms-quadro');
    // U+202F groups the digits, U+00A0 precedes the currency sign
    expect(m).toContain('83 000 ₴');
    expect(m).toContain('орієнтовна ціна');
  });

  it('carries no documentation block — the menu leads to the documents page', () => {
    for (const s of SLUGS) {
      expect(markup(s), s).not.toContain('Документація на');
      expect(markup(s), s).not.toContain('готуються');
    }
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

  it('emits ItemList schema over the five devices', () => {
    const list = jsonLd(html).find((b) => b['@type'] === 'ItemList');
    expect(list).toBeDefined();
    expect(list.itemListElement).toHaveLength(5);
  });

  it('links to all five product pages', () => {
    for (const s of SLUGS) expect(html).toContain(`/bms-pro/products/${s}/`);
  });

  it('sends comparison to the single matrix rather than repeating it', () => {
    expect(html).not.toContain('Порівняння моделей');
    expect(html).toContain('href="/bms-pro/#compare"');
  });
});
