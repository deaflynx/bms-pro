import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Set both for production: SITE_URL=https://bms-pro.com.ua BASE_PATH=/
const SITE = process.env.SITE_URL ?? 'https://deaflynx.github.io';
const BASE = process.env.BASE_PATH ?? '/bms-pro/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  // Old WordPress URLs. Static output emits instant meta-refresh pages, which
  // Google treats as permanent; deploy/nginx-redirects.conf adds real 301s.
  // Astro prefixes `base` to the source but not to the destination.
  redirects: {
    '/services': `${BASE}products/`,
    '/shop': `${BASE}products/`,
    '/cart': `${BASE}products/`,
    '/checkout': `${BASE}products/`,
    '/my-account': `${BASE}products/`,
    '/contact': `${BASE}contacts/`,
  },
});
