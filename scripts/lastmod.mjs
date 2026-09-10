/**
 * Last commit date per route, for the sitemap's <lastmod>.
 *
 * Build time would be a lie — it would tell Google every page changed on every
 * deploy. This maps each route back to the content and page files it is built
 * from and takes the newest commit touching any of them.
 *
 * Requires full history: a shallow CI clone reports one date for everything,
 * so .github/workflows/deploy.yml sets fetch-depth: 0.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

function list(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`) : [];
}

const PRODUCTS = list('src/content/products');
const DOCUMENTS = list('src/content/documents');
const FAQ = list('src/content/faq');

/** Source files behind a route, relative to the repository root. */
function sourcesFor(pathname) {
  const p = pathname.replace(/^\/|\/$/g, '');

  if (p === '') return ['src/pages/index.astro', ...PRODUCTS];
  if (p === 'products') return ['src/pages/products/index.astro', ...PRODUCTS];
  if (p === 'documents') return ['src/pages/documents/index.astro', ...DOCUMENTS];
  if (p === 'faq') return ['src/pages/faq.astro', ...FAQ];

  const product = p.match(/^products\/([^/]+)$/);
  if (product) return [`src/content/products/${product[1]}.md`, 'src/pages/products/[slug].astro'];

  const doc = p.match(/^documents\/([^/]+)\/([^/]+)$/);
  if (doc) return [`src/content/documents/${doc[1]}-${doc[2]}.md`, 'src/pages/documents/[model]/[type].astro'];

  return [`src/pages/${p}.astro`];
}

function committedAt(file) {
  if (!existsSync(file)) return null;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out ? new Date(out) : null;
  } catch {
    return null;
  }
}

const cache = new Map();

/** Newest commit date across a route's sources, or null when git is unavailable. */
export function lastmodFor(pathname) {
  if (cache.has(pathname)) return cache.get(pathname);
  const dates = sourcesFor(pathname).map(committedAt).filter(Boolean);
  const newest = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  cache.set(pathname, newest);
  return newest;
}
