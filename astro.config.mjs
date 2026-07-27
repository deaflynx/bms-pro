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
});
