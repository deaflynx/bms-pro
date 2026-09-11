/**
 * Commit dates per route: the newest for the sitemap's <lastmod>, the oldest
 * for an Article's datePublished.
 *
 * Build time would be a lie — it would tell Google every page changed on every
 * deploy. This maps each route back to the content and page files it is built
 * from and takes the newest — or, for datePublished, the oldest — commit
 * touching any of them.
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

const fileCache = new Map();

/** Every commit touching a file, newest first. Empty when git is unavailable. */
function commitDates(file) {
  if (fileCache.has(file)) return fileCache.get(file);
  let dates = [];
  if (existsSync(file)) {
    try {
      const out = execFileSync('git', ['log', '--format=%cI', '--', file], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (out) dates = out.split('\n').map((d) => new Date(d));
    } catch {
      dates = [];
    }
  }
  fileCache.set(file, dates);
  return dates;
}

function extremeFor(pathname, newest) {
  const times = sourcesFor(pathname)
    .map(commitDates)
    .filter((d) => d.length > 0)
    .map((d) => (newest ? d[0] : d[d.length - 1]).getTime());
  if (times.length === 0) return null;
  return new Date(newest ? Math.max(...times) : Math.min(...times));
}

/** Newest commit date across a route's sources, or null when git is unavailable. */
export function lastmodFor(pathname) {
  return extremeFor(pathname, true);
}

/** Oldest commit date across a route's sources — when the page first existed. */
export function publishedFor(pathname) {
  return extremeFor(pathname, false);
}
