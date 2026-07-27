import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The 15 launch routes from the spec. */
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

function read(route: string): string {
  return readFileSync(`dist/${route ? `${route}/` : ''}index.html`, 'utf8');
}

describe('all launch routes', () => {
  it('emits exactly the 15 pages in the spec', () => {
    for (const r of ROUTES) {
      expect(existsSync(`dist/${r ? `${r}/` : ''}index.html`), `missing /${r}/`).toBe(true);
    }
  });

  it('gives every page a canonical, a title and a description', () => {
    for (const r of ROUTES) {
      const html = read(r);
      expect(html, `/${r}/ canonical`).toContain('<link rel="canonical"');
      expect(html, `/${r}/ title`).toMatch(/<title>.+<\/title>/);
      expect(html, `/${r}/ description`).toMatch(/<meta name="description" content=".+"/);
    }
  });

  it('base-prefixes every canonical', () => {
    for (const r of ROUTES) {
      const canonical = read(r).match(/<link rel="canonical" href="([^"]+)"/)![1];
      expect(canonical, `/${r}/`).toContain('https://deaflynx.github.io/bms-pro/');
    }
  });

  it('gives every page a unique title', () => {
    const titles = ROUTES.map((r) => read(r).match(/<title>(.*?)<\/title>/)![1]);
    expect(new Set(titles).size).toBe(ROUTES.length);
  });

  it('declares Ukrainian on every page', () => {
    for (const r of ROUTES) expect(read(r), `/${r}/`).toContain('<html lang="uk"');
  });

  it('emits Organization schema on every page', () => {
    for (const r of ROUTES) expect(read(r), `/${r}/`).toContain('"Organization"');
  });

  it('puts the primary phone on every page', () => {
    for (const r of ROUTES) expect(read(r), `/${r}/`).toContain('tel:+380505460077');
  });

  it('carries the medical-device disclaimer on every page', () => {
    for (const r of ROUTES) expect(read(r), `/${r}/`).toContain('не є медичними виробами');
  });

  it('ships no iframe on any page', () => {
    for (const r of ROUTES) expect(read(r), `/${r}/`).not.toContain('<iframe');
  });
});

describe('how it works', () => {
  const html = read('how-it-works');

  it('carries Article schema', () => {
    expect(html).toContain('"Article"');
  });
  it('shows the three principle diagrams', () => {
    const labels = [...html.matchAll(/role="img" aria-label="(Схема:[^"]+)"/g)];
    expect(labels).toHaveLength(3);
  });
  it('offers the video as a facade', () => {
    expect(html).toContain('data-yt=');
  });
  it('covers the three application areas', () => {
    for (const a of ['Косметологія', 'Спорт', 'Реабілітація']) expect(html).toContain(a);
  });
});

describe('faq', () => {
  const html = read('faq');

  it('carries FAQPage schema with every question', () => {
    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].map((m) => JSON.parse(m[1]));
    const faq = blocks.find((b) => b['@type'] === 'FAQPage');
    expect(faq).toBeDefined();
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(8);
    for (const q of faq.mainEntity) {
      expect(q.name.length).toBeGreaterThan(5);
      expect(q.acceptedAnswer.text.length).toBeGreaterThan(10);
    }
  });

  it('answers the medical-device question honestly', () => {
    expect(html).toContain('Чи є прилади BMS медичними виробами');
  });

  it('needs no JavaScript to expand — uses details/summary', () => {
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
  });
});

describe('contacts', () => {
  const html = read('contacts');

  it('carries LocalBusiness schema with both phones', () => {
    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].map((m) => JSON.parse(m[1]));
    const biz = blocks.find((b) => b['@type'] === 'LocalBusiness');
    expect(biz).toBeDefined();
    expect(biz.telephone).toEqual(['+380505460077', '+380685460077']);
    expect(biz.address.postalCode).toBe('02099');
  });

  it('links the email and the address', () => {
    expect(html).toContain('mailto:stymulation.kyiv@gmail.com');
    expect(html).toContain('Бориспільська');
  });
});

describe('about', () => {
  const html = read('about');

  it('names the manufacturer and the founder', () => {
    expect(html).toContain('ТОВ «УКРСИСТЕМС»');
    expect(html).toContain('Олександр Бабак');
  });
  it('states the declaration facts', () => {
    expect(html).toContain('UA.TR.D.00159-25');
  });
});

describe('privacy policy', () => {
  it('is dated and names the governing law', () => {
    const html = read('privacy-policy');
    expect(html).toContain('Про захист персональних даних');
    expect(html).toContain('GDPR');
  });
});
