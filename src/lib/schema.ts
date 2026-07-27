import { SITE } from './site';

const CTX = 'https://schema.org' as const;

function postalAddress() {
  return {
    '@type': 'PostalAddress',
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.city,
    postalCode: SITE.address.postalCode,
    addressCountry: SITE.address.country,
  };
}

export function organizationSchema() {
  return {
    '@context': CTX,
    '@type': 'Organization',
    name: SITE.name,
    legalName: SITE.legalName,
    email: SITE.email,
    telephone: SITE.phonePrimary,
    address: postalAddress(),
  };
}

export function websiteSchema(siteUrl: string) {
  return {
    '@context': CTX,
    '@type': 'WebSite',
    name: SITE.name,
    url: siteUrl,
    inLanguage: 'uk',
  };
}

export interface ProductLike {
  name: string;
  tagline: string;
  price: number;
  image: string;
}

export function productSchema(p: ProductLike, absUrl: string) {
  return {
    '@context': CTX,
    '@type': 'Product',
    name: p.name,
    description: p.tagline,
    image: p.image,
    brand: { '@type': 'Brand', name: SITE.name },
    manufacturer: { '@type': 'Organization', name: SITE.legalName },
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'UAH',
      availability: 'https://schema.org/InStock',
      url: absUrl,
      seller: { '@type': 'Organization', name: SITE.legalName },
    },
  };
}

export function breadcrumbSchema(trail: { name: string; url: string }[]) {
  return {
    '@context': CTX,
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': CTX,
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };
}

export function documentSchema(
  doc: { title: string; designation: string },
  absUrl: string,
) {
  return {
    '@context': CTX,
    '@type': 'DigitalDocument',
    name: doc.title,
    identifier: doc.designation,
    url: absUrl,
    inLanguage: 'uk',
    publisher: { '@type': 'Organization', name: SITE.legalName },
  };
}

export function localBusinessSchema() {
  return {
    '@context': CTX,
    '@type': 'LocalBusiness',
    name: SITE.name,
    legalName: SITE.legalName,
    telephone: [SITE.phonePrimary, SITE.phoneSecondary],
    email: SITE.email,
    address: postalAddress(),
  };
}

export function itemListSchema(items: { name: string; url: string }[]) {
  return {
    '@context': CTX,
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

export function articleSchema(a: { title: string; description: string }, absUrl: string) {
  return {
    '@context': CTX,
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    inLanguage: 'uk',
    mainEntityOfPage: absUrl,
    publisher: { '@type': 'Organization', name: SITE.legalName },
  };
}
