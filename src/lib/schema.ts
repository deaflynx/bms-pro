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

/**
 * One identifier for the company on every page. Without it Google reads the
 * Organization node in the layout and the LocalBusiness node on /contacts/ as
 * two businesses that happen to share an address, and neither accumulates the
 * signals of the other.
 */
export function organizationId(siteUrl: string): string {
  return `${siteUrl}#org`;
}

/** `siteUrl` and `logoUrl` must be absolute — Google discards relative URLs. */
export function organizationSchema(siteUrl: string, logoUrl: string) {
  return {
    '@context': CTX,
    '@type': 'Organization',
    '@id': organizationId(siteUrl),
    name: SITE.name,
    legalName: SITE.legalName,
    url: siteUrl,
    logo: logoUrl,
    email: SITE.email,
    telephone: SITE.phonePrimary,
    address: postalAddress(),
    ...(SITE.sameAs.length > 0 ? { sameAs: [...SITE.sameAs] } : {}),
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
}

/**
 * `absUrl` and `absImage` must be absolute. Google discards relative URLs in
 * structured data, so the image is taken as a separate argument rather than
 * off the frontmatter, where it is a site-relative path.
 */
export function productSchema(
  p: ProductLike,
  absUrl: string,
  absImage: string,
  siteUrl: string,
) {
  // `brand` keeps its own name because Google documents brand.name as the field
  // it reads; manufacturer and seller are pure references to the one company.
  const org = { '@id': organizationId(siteUrl) };
  return {
    '@context': CTX,
    '@type': 'Product',
    name: p.name,
    description: p.tagline,
    image: absImage,
    brand: { '@type': 'Brand', name: SITE.name },
    manufacturer: org,
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'UAH',
      availability: 'https://schema.org/InStock',
      url: absUrl,
      seller: org,
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
  siteUrl: string,
) {
  return {
    '@context': CTX,
    '@type': 'DigitalDocument',
    name: doc.title,
    identifier: doc.designation,
    url: absUrl,
    inLanguage: 'uk',
    publisher: { '@id': organizationId(siteUrl) },
  };
}

/** Same `@id` as the Organization node: one company, described twice. */
export function localBusinessSchema(siteUrl: string) {
  return {
    '@context': CTX,
    '@type': 'LocalBusiness',
    '@id': organizationId(siteUrl),
    name: SITE.name,
    legalName: SITE.legalName,
    url: siteUrl,
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

export function articleSchema(
  a: { title: string; description: string },
  absUrl: string,
  siteUrl: string,
) {
  return {
    '@context': CTX,
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    inLanguage: 'uk',
    mainEntityOfPage: absUrl,
    publisher: { '@id': organizationId(siteUrl) },
  };
}
