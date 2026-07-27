import { describe, expect, it } from 'vitest';
import {
  breadcrumbSchema,
  documentSchema,
  faqSchema,
  itemListSchema,
  localBusinessSchema,
  organizationSchema,
  productSchema,
  websiteSchema,
} from '../../src/lib/schema';

const CTX = 'https://schema.org';

describe('organizationSchema', () => {
  const s = organizationSchema();
  it('names the canonical legal entity', () => {
    expect(s['@type']).toBe('Organization');
    expect(s.legalName).toBe('ТОВ «УКРСИСТЕМС»');
  });
  it('carries the postal address', () => {
    expect(s.address.postalCode).toBe('02099');
    expect(s.address.addressCountry).toBe('UA');
  });
  it('declares the schema.org context', () => {
    expect(s['@context']).toBe(CTX);
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
    image: '/assets/img/bms-nexus-card.webp',
  };

  it('emits an Offer priced in hryvnia', () => {
    const s = productSchema(p, 'https://bms-pro.com.ua/products/bms-nexus/');
    expect(s['@type']).toBe('Product');
    expect(s.offers.priceCurrency).toBe('UAH');
    expect(s.offers.price).toBe(48000);
    expect(s.offers.url).toBe('https://bms-pro.com.ua/products/bms-nexus/');
  });

  it('attributes manufacture to the canonical entity', () => {
    const s = productSchema(p, 'https://example.com/');
    expect(s.manufacturer.name).toBe('ТОВ «УКРСИСТЕМС»');
    expect(s.brand.name).toBe('BMS Pro');
  });

  it('uses the tagline as the description', () => {
    expect(productSchema(p, 'https://x/').description).toBe('Два незалежні канали');
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
    );
    expect(s['@type']).toBe('DigitalDocument');
    expect(s.identifier).toBe('ТУ У 27.9-2294811615-001:2025');
    expect(s.inLanguage).toBe('uk');
  });
});

describe('localBusinessSchema', () => {
  it('lists both phone numbers', () => {
    const s = localBusinessSchema();
    expect(s['@type']).toBe('LocalBusiness');
    expect(s.telephone).toEqual(['+380505460077', '+380685460077']);
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
      organizationSchema(),
      websiteSchema('https://x/'),
      productSchema({ name: 'a', tagline: 'b', price: 1, image: '/c.webp' }, 'https://x/'),
      breadcrumbSchema([{ name: 'a', url: 'https://x/' }]),
      faqSchema([{ question: 'q', answer: 'a' }]),
      documentSchema({ title: 't', designation: 'd' }, 'https://x/'),
      localBusinessSchema(),
      itemListSchema([{ name: 'a', url: 'https://x/' }]),
    ];
    for (const s of all) {
      const round = JSON.parse(JSON.stringify(s));
      expect(round['@context']).toBe(CTX);
      expect(round['@type']).toBeTruthy();
    }
  });
});
