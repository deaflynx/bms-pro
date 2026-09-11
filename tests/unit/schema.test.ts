import { describe, expect, it } from 'vitest';
import {
  articleSchema,
  breadcrumbSchema,
  documentSchema,
  faqSchema,
  itemListSchema,
  localBusinessSchema,
  organizationId,
  organizationSchema,
  productSchema,
  websiteSchema,
} from '../../src/lib/schema';

const CTX = 'https://schema.org';
const SITE_URL = 'https://bms-pro.com.ua/';
const LOGO = 'https://bms-pro.com.ua/logo.png';
const ORG = 'https://bms-pro.com.ua/#org';

describe('organizationId', () => {
  it('hangs the identifier off the site root, so every build agrees on it', () => {
    expect(organizationId(SITE_URL)).toBe(ORG);
    expect(organizationId('https://deaflynx.github.io/bms-pro/')).toBe(
      'https://deaflynx.github.io/bms-pro/#org',
    );
  });
});

describe('organizationSchema', () => {
  const s = organizationSchema(SITE_URL, LOGO);
  it('names the configured manufacturer', () => {
    expect(s['@type']).toBe('Organization');
    expect(s.legalName).toBe('Системи біомеханічної стимуляції');
  });
  it('carries the postal address', () => {
    expect(s.address.postalCode).toBe('02099');
    expect(s.address.addressCountry).toBe('UA');
  });
  it('declares the schema.org context', () => {
    expect(s['@context']).toBe(CTX);
  });
  it('carries the identity fields a knowledge panel is built from', () => {
    expect(s['@id']).toBe(ORG);
    expect(s.url).toBe(SITE_URL);
    expect(s.logo).toBe(LOGO);
  });
  it('omits sameAs while there are no profiles to claim', () => {
    // A wrong entry merges the brand with someone else's page, so an absent
    // field beats a guessed one.
    expect('sameAs' in s).toBe(false);
  });
});

describe('websiteSchema', () => {
  it('declares Ukrainian', () => {
    const s = websiteSchema('https://bms-pro.com.ua/');
    expect(s.inLanguage).toBe('uk');
    expect(s.url).toBe('https://bms-pro.com.ua/');
  });
});

describe('productSchema', () => {
  const p = {
    name: 'BMS Nexus',
    tagline: 'Два незалежні канали',
    price: 48000,
  };
  const IMG = 'https://bms-pro.com.ua/assets/img/bms-nexus-card.webp';

  it('emits an Offer priced in hryvnia', () => {
    const s = productSchema(p, 'https://bms-pro.com.ua/products/bms-nexus/', IMG, SITE_URL);
    expect(s['@type']).toBe('Product');
    expect(s.offers.priceCurrency).toBe('UAH');
    expect(s.offers.price).toBe(48000);
    expect(s.offers.url).toBe('https://bms-pro.com.ua/products/bms-nexus/');
  });

  it('references the one organisation rather than restating its name', () => {
    const s = productSchema(p, 'https://example.com/', IMG, SITE_URL);
    expect(s.manufacturer).toEqual({ '@id': ORG });
    expect(s.offers.seller).toEqual({ '@id': ORG });
    // Google reads brand.name directly, so that one keeps its literal name.
    expect(s.brand.name).toBe('BMS Pro');
  });

  it('uses the tagline as the description', () => {
    expect(productSchema(p, 'https://x/', IMG, SITE_URL).description).toBe(
      'Два незалежні канали',
    );
  });

  it('takes the image as given, so a caller cannot pass a relative path by accident', () => {
    // Google discards relative URLs in structured data; the frontmatter path is relative.
    expect(productSchema(p, 'https://x/', IMG, SITE_URL).image).toBe(IMG);
  });
});

describe('breadcrumbSchema', () => {
  const s = breadcrumbSchema([
    { name: 'Головна', url: 'https://x/' },
    { name: 'Прилади', url: 'https://x/products/' },
  ]);
  it('numbers positions from one', () => {
    expect(s.itemListElement[0].position).toBe(1);
    expect(s.itemListElement[1].position).toBe(2);
  });
  it('keeps the names and urls', () => {
    expect(s.itemListElement[1].name).toBe('Прилади');
    expect(s.itemListElement[1].item).toBe('https://x/products/');
  });
});

describe('faqSchema', () => {
  it('wraps each answer in an acceptedAnswer', () => {
    const s = faqSchema([{ question: 'Чи це медичний виріб?', answer: 'Ні.' }]);
    expect(s['@type']).toBe('FAQPage');
    expect(s.mainEntity[0]['@type']).toBe('Question');
    expect(s.mainEntity[0].acceptedAnswer.text).toBe('Ні.');
  });
});

describe('documentSchema', () => {
  it('identifies the document by its formal designation', () => {
    const s = documentSchema(
      { title: 'Паспорт приладу BMS m', designation: 'ТУ У 27.9-2294811615-001:2025' },
      'https://x/documents/bms-m/passport/',
      SITE_URL,
    );
    expect(s['@type']).toBe('DigitalDocument');
    expect(s.identifier).toBe('ТУ У 27.9-2294811615-001:2025');
    expect(s.inLanguage).toBe('uk');
    expect(s.publisher).toEqual({ '@id': ORG });
  });
});

describe('localBusinessSchema', () => {
  const s = localBusinessSchema(SITE_URL);
  it('lists both phone numbers', () => {
    expect(s['@type']).toBe('LocalBusiness');
    expect(s.telephone).toEqual(['+380505460077', '+380685460077']);
  });
  it('is the same entity as the Organization node, not a second business', () => {
    expect(s['@id']).toBe(organizationSchema(SITE_URL, LOGO)['@id']);
  });
});

describe('articleSchema', () => {
  const a = { headline: 'Як працює БМС', description: 'Опис' };

  it('attributes the article to the one organisation', () => {
    const s = articleSchema(a, 'https://x/how-it-works/', SITE_URL);
    expect(s['@type']).toBe('Article');
    expect(s.author).toEqual({ '@id': ORG });
    expect(s.publisher).toEqual({ '@id': ORG });
  });

  it('carries the dates when given them', () => {
    const s = articleSchema(
      { ...a, datePublished: '2026-07-27T16:55:59.000Z', dateModified: '2026-09-11T09:06:06.000Z' },
      'https://x/',
      SITE_URL,
    );
    expect(s.datePublished).toBe('2026-07-27T16:55:59.000Z');
    expect(s.dateModified).toBe('2026-09-11T09:06:06.000Z');
  });

  it('omits the dates rather than guessing when git history is unavailable', () => {
    const s = articleSchema(a, 'https://x/', SITE_URL);
    expect('datePublished' in s).toBe(false);
    expect('dateModified' in s).toBe(false);
  });
});

describe('itemListSchema', () => {
  it('positions the products in the given order', () => {
    const s = itemListSchema([
      { name: 'BMS m', url: 'https://x/products/bms-m/' },
      { name: 'BMS pro', url: 'https://x/products/bms-pro/' },
    ]);
    expect(s['@type']).toBe('ItemList');
    expect(s.itemListElement).toHaveLength(2);
    expect(s.itemListElement[0].position).toBe(1);
    expect(s.itemListElement[1].name).toBe('BMS pro');
  });
});

describe('every builder', () => {
  it('serialises to JSON without throwing or losing the context', () => {
    const all = [
      organizationSchema('https://x/', 'https://x/logo.png'),
      websiteSchema('https://x/'),
      productSchema(
        { name: 'a', tagline: 'b', price: 1 },
        'https://x/',
        'https://x/c.webp',
        'https://x/',
      ),
      breadcrumbSchema([{ name: 'a', url: 'https://x/' }]),
      faqSchema([{ question: 'q', answer: 'a' }]),
      documentSchema({ title: 't', designation: 'd' }, 'https://x/', 'https://x/'),
      localBusinessSchema('https://x/'),
      itemListSchema([{ name: 'a', url: 'https://x/' }]),
    ];
    for (const s of all) {
      const round = JSON.parse(JSON.stringify(s));
      expect(round['@context']).toBe(CTX);
      expect(round['@type']).toBeTruthy();
    }
  });
});
