# BMS Pro Astro Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the WordPress site at bms-pro.com.ua with a static Astro site of 15 indexable Ukrainian pages that sells four BMS devices, converts to a phone call, and carries full JSON-LD for AI search.

**Architecture:** Astro with zero client framework. Content lives in `src/content/` as Zod-validated collections, so product data drives cards, the comparison matrix, product pages and `Product` schema from one source. Only two things ship JavaScript: the frequency instrument and the YouTube facade, both vanilla and progressive. Output is plain static HTML deployed to GitHub Pages via Actions during development, host-swappable for production.

**Tech Stack:** Astro 7.1.4 · TypeScript 5.9.3 · `@astrojs/sitemap` 3.7.3 · `@astrojs/check` 0.9.10 · Vitest 4.1.10 · sharp 0.35.3 · linkinator 8.0.2 · Node 22.22.3

**Spec:** `docs/superpowers/specs/2026-07-27-bms-pro-rebuild-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Language:** Ukrainian only. `<html lang="uk">`. No locale prefix, no hreflang, no English strings in user-facing copy.
- **TypeScript must be `^5.9.3`.** `@astrojs/check` declares `peerDependencies: { typescript: "^5.0.0 || ^6.0.0" }` — TypeScript 7 is incompatible. Do not upgrade.
- **Zod comes from `astro/zod`,** not a direct dependency and not `astro:content`. Astro 7 bundles zod and re-exports it at `astro/zod`; `import { z } from 'astro:content'` is deprecated and removed in Astro 8, and a separately installed copy breaks schema identity.
- **Base path is configurable.** `base: process.env.BASE_PATH ?? '/bms-pro/'`. GitHub Pages needs `/bms-pro/`; production root needs `/`. Never hardcode either. All internal links go through the `url()` helper from Task 3.
- **Primary phone is `+380505460077`** on every CTA. Display format `+380 50 546 00 77`. Secondary `+380685460077`.
- **Canonical organisation is ТОВ «УКРСИСТЕМС».** Declaration `UA.TR.D.00159-25`, registered 24.07.2025. ТУ `ТУ У 27.9-2294811615-001:2025`.
- **Address:** `02099, м. Київ, вул. Бориспільська 11а, оф. 206`. **Email:** `stymulation.kyiv@gmail.com`.
- **Page budget:** HTML + CSS + JS under 60 KB per page. Enforced by test in Task 12.
- **No `<iframe>` in delivered HTML.** YouTube loads only on click. Enforced by test in Task 12.
- **Prices are labelled «орієнтовна ціна»** everywhere they appear. Never present them as final.
- **Every page carries the disclaimer:** «Прилади BMS не є медичними виробами…». Never omit it, never soften it.
- **Design tokens are fixed** — see Task 2. Do not invent colours or fonts. `--led: #58B6FF`, `--panel: #0E1417`, Oswald / Onest / JetBrains Mono.
- **Commit after every task.** Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`). No `Co-Authored-By` lines.

---

## File Structure

```
package.json                       deps, scripts
astro.config.mjs                   site/base/sitemap, env-driven
tsconfig.json                      extends astro/tsconfigs/strict
vitest.config.ts                   two projects: unit, build
.github/workflows/deploy.yml       build + deploy to Pages

src/
  content.config.ts                collections: products, documents, faq
  content/
    products/*.md                  4 devices — the single source of product truth
    documents/*.md                 passport / declaration / technical-conditions per model
    faq/*.md                       questions, tagged by model
  lib/
    site.ts                        org constants, phones, url() helper
    format.ts                      price and number formatting
    instrument.ts                  model -> instrument configuration
    schema.ts                      JSON-LD builders, one per @type
  styles/
    tokens.css                     design tokens only
    global.css                     reset, base type, shared primitives
    print.css                      document-page printing
  components/
    Seo.astro                      title, description, canonical, OG, Twitter
    JsonLd.astro                   renders a JSON-LD object
    Header.astro  Footer.astro  CallBar.astro  Breadcrumbs.astro
    Instrument.astro               THE signature element, per-model
    ProductCard.astro  ComparisonMatrix.astro  SpecTiles.astro
    DocumentList.astro  Diagram.astro  VideoFacade.astro  Disclaimer.astro
  layouts/
    Base.astro                     shell: html/head/header/footer/callbar
    DocumentPage.astro             breadcrumbs, TOC, download, print
  pages/
    index.astro
    products/index.astro
    products/[slug].astro
    documents/index.astro
    documents/[model]/[type].astro
    how-it-works.astro  about.astro  contacts.astro  faq.astro  privacy-policy.astro

public/
  assets/img/**                    moved from ./assets — preserves mockup URLs
  assets/docs/*.pdf
  mockups/**                       moved from ./mockups — preserves preview URLs
  robots.txt                       AI-crawler allowlist, ported verbatim
  og/*.png                         generated, committed

scripts/generate-og.mjs            1200x630 OG images from product photos
tests/
  unit/*.test.ts                   pure functions
  build/*.test.ts                  assertions against dist/
  responsive/overflow.mjs          CDP overflow + tap-target harness
```

---

### Task 1: Scaffold Astro, preserve the mockups, deploy via Actions

Deliverable: a building Astro site live at `https://deaflynx.github.io/bms-pro/` with all three mockup URLs still working.

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.github/workflows/deploy.yml`, `src/pages/index.astro`, `src/env.d.ts`
- Move: `assets/` → `public/assets/`, `mockups/` → `public/mockups/`, `index.html` → `public/mockups/index.html`
- Delete: `.nojekyll` (Actions deployment does not need it)

**Interfaces:**
- Consumes: nothing
- Produces: `npm run build` emits `dist/`. `npm run dev` serves on :4321. Env vars `SITE_URL` and `BASE_PATH` control absolute URLs.

- [ ] **Step 1: Move static assets into `public/` so existing URLs survive**

The mockups reference `../../assets/img/...`. From `/bms-pro/mockups/a/` that resolves to `/bms-pro/assets/img/...`, and `public/assets/` deploys to exactly that path. Verify after building.

```bash
cd /home/artem/projects/bms-pro
mkdir -p public
git mv assets public/assets
git mv mockups public/mockups
git mv index.html public/mockups/index.html
git rm -q .nojekyll
```

The chooser page moves to `/mockups/`. Fix its three links, which were relative to the old root:

```bash
sed -i 's|href="mockups/a/"|href="a/"|; s|href="mockups/b/"|href="b/"|; s|href="mockups/c/"|href="c/"|' public/mockups/index.html
grep -n 'href="[abc]/"' public/mockups/index.html
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "bms-pro",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:unit": "vitest run --project unit",
    "test:build": "npm run build && vitest run --project build",
    "test:responsive": "node tests/responsive/overflow.mjs",
    "og": "node scripts/generate-og.mjs"
  },
  "dependencies": {
    "astro": "7.1.4",
    "@astrojs/sitemap": "3.7.3",
    "sharp": "0.35.3"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.10",
    "typescript": "5.9.3",
    "vitest": "4.1.10",
    "linkinator": "8.0.2",
    "websocket": "1.0.35"
  }
}
```

Note `typescript` is pinned to `5.9.3` — see Global Constraints.

- [ ] **Step 3: Create `astro.config.mjs`**

`site` and `base` come from the environment so the same build serves GitHub Pages and production.

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
```

- [ ] **Step 4: Create `tsconfig.json` and `src/env.d.ts`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "public"]
}
```

```ts
/// <reference types="astro/client" />
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
.astro/
.DS_Store
*.log
```

- [ ] **Step 6: Create a placeholder homepage so the build has something to emit**

`src/pages/index.astro`:

```astro
---
const title = 'BMS Pro — системи біомеханічної стимуляції';
---
<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <h1>{title}</h1>
    <p>Сайт у розробці.</p>
  </body>
</html>
```

- [ ] **Step 7: Install and build**

```bash
npm install
npm run build
```

Expected: `dist/index.html` exists, and `dist/mockups/a/index.html` plus `dist/assets/img/bms-m-card.webp` were copied through from `public/`.

```bash
test -f dist/index.html && test -f dist/mockups/a/index.html && test -f dist/assets/img/bms-m-card.webp && echo "PASS: build output correct"
```

- [ ] **Step 8: Create the Pages deployment workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          SITE_URL: https://deaflynx.github.io
          BASE_PATH: /bms-pro/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 9: Switch the Pages source from branch to Actions**

The repo currently serves Pages from `main` at `/`. That must become Actions or the workflow artifact is ignored.

```bash
gh api -X PUT repos/deaflynx/bms-pro/pages -f build_type=workflow
gh api repos/deaflynx/bms-pro/pages --jq '.build_type + " " + .html_url'
```

Expected: `workflow https://deaflynx.github.io/bms-pro/`

- [ ] **Step 10: Commit and confirm the deploy**

```bash
git add -A
git commit -m "feat: scaffold Astro site, move mockups under public/"
git push origin main
gh run watch "$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

Then verify the live URLs, including that the mockups survived:

```bash
for u in "" "mockups/" "mockups/a/" "assets/img/bms-m-card.webp"; do
  curl -s -o /dev/null -w "%{http_code}  /$u\n" "https://deaflynx.github.io/bms-pro/$u"
done
```

Expected: four `200`s.

---

### Task 2: Design system and layout shell

Deliverable: every future page inherits header, footer, sticky phone CTA, mobile call bar and the token system, extracted from mockup A.

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/lib/site.ts`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/CallBar.astro`, `src/components/Disclaimer.astro`, `src/layouts/Base.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/unit/site.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `src/lib/site.ts` exports `SITE` (const object with `name`, `legalName`, `phonePrimary`, `phonePrimaryDisplay`, `phoneSecondary`, `phoneSecondaryDisplay`, `email`, `address` with `street`/`city`/`postalCode`, `declaration`, `declarationDate`, `tu`), `NAV` (array of `{ href, label }`), and `url(path: string): string`
  - `src/layouts/Base.astro` accepts props `{ title: string; description: string; canonicalPath: string; ogImage?: string }` and a default slot

- [ ] **Step 1: Write the failing test for the `url()` helper**

`tests/unit/site.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SITE, NAV, url } from '../../src/lib/site';

describe('url()', () => {
  it('prefixes a path with the configured base', () => {
    expect(url('/products/')).toBe('/bms-pro/products/');
  });
  it('does not double the slash when base ends with one', () => {
    expect(url('products/')).toBe('/bms-pro/products/');
  });
  it('returns the base itself for the root path', () => {
    expect(url('/')).toBe('/bms-pro/');
  });
});

describe('SITE', () => {
  it('uses the canonical legal entity', () => {
    expect(SITE.legalName).toBe('ТОВ «УКРСИСТЕМС»');
  });
  it('exposes the primary phone in dialable and display form', () => {
    expect(SITE.phonePrimary).toBe('+380505460077');
    expect(SITE.phonePrimaryDisplay).toBe('+380 50 546 00 77');
  });
  it('carries the registered declaration number', () => {
    expect(SITE.declaration).toBe('UA.TR.D.00159-25');
  });
});

describe('NAV', () => {
  it('puts the products first, since selling devices is the point', () => {
    expect(NAV[0]).toEqual({ href: '/products/', label: 'Прилади' });
  });
  it('covers all five sections', () => {
    expect(NAV.map((n) => n.label)).toEqual([
      'Прилади', 'Як це працює', 'Документи', 'Про нас', 'Контакти',
    ]);
  });
});
```

- [ ] **Step 2: Create `vitest.config.ts` and run the test to see it fail**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      { test: { name: 'build', include: ['tests/build/**/*.test.ts'], environment: 'node' } },
    ],
  },
});
```

Run: `npx vitest run --project unit`
Expected: FAIL — `Cannot find module '../../src/lib/site'`.

- [ ] **Step 3: Implement `src/lib/site.ts`**

```ts
const BASE = import.meta.env.BASE_URL ?? '/bms-pro/';

/** Prefixes an internal path with the configured base. Every internal link must use this. */
export function url(path: string): string {
  const base = BASE.endsWith('/') ? BASE : `${BASE}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

export const SITE = {
  name: 'BMS Pro',
  legalName: 'ТОВ «УКРСИСТЕМС»',
  tagline: 'Системи біомеханічної стимуляції',
  phonePrimary: '+380505460077',
  phonePrimaryDisplay: '+380 50 546 00 77',
  phoneSecondary: '+380685460077',
  phoneSecondaryDisplay: '+380 68 546 00 77',
  email: 'stymulation.kyiv@gmail.com',
  address: {
    street: 'вул. Бориспільська 11а, оф. 206',
    city: 'Київ',
    postalCode: '02099',
    country: 'UA',
  },
  declaration: 'UA.TR.D.00159-25',
  declarationDate: '2025-07-24',
  declarationDateDisplay: '24 липня 2025',
  tu: 'ТУ У 27.9-2294811615-001:2025',
  disclaimer:
    'Прилади BMS не є медичними виробами. Вони не призначені для діагностики, ' +
    'лікування або профілактики захворювань і не замінюють консультацію лікаря ' +
    'чи призначене лікування. Перед застосуванням ознайомтеся з інструкцією користувача.',
} as const;

export const NAV = [
  { href: '/products/', label: 'Прилади' },
  { href: '/how-it-works/', label: 'Як це працює' },
  { href: '/documents/', label: 'Документи' },
  { href: '/about/', label: 'Про нас' },
  { href: '/contacts/', label: 'Контакти' },
] as const;
```

Because the test imports this outside Astro, add `define` so `import.meta.env.BASE_URL` resolves under Vitest. Append to `vitest.config.ts`:

```ts
  define: { 'import.meta.env.BASE_URL': JSON.stringify('/bms-pro/') },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit`
Expected: PASS, 6 tests.

- [ ] **Step 5: Create `src/styles/tokens.css`**

Copy the token block from `public/mockups/a/index.html` verbatim. Do not adjust values.

```css
:root {
  --panel: #0E1417;
  --panel-2: #151E23;
  --panel-3: #1D282E;
  --led: #58B6FF;
  --led-dim: rgba(88, 182, 255, .13);
  --led-glow: #A9DEFF;
  --amber: #F0A93B;
  --steel: #8A98A0;
  --steel-2: #5C686E;
  --paper: #F2F0EB;
  --rule: rgba(255, 255, 255, .10);

  --d: 'Oswald', system-ui, sans-serif;
  --b: 'Onest', system-ui, sans-serif;
  --m: 'JetBrains Mono', ui-monospace, monospace;

  --wrap: 1200px;
  --r: 12px;
  --r-lg: 14px;
}
```

- [ ] **Step 6: Create `src/styles/global.css`**

Port the reset, base typography, `.wrap`, `.eyebrow`, `.btn`, `h1`/`h2`, `.sec-head` and `.warn` rules from `public/mockups/a/index.html`. Include the reduced-motion guard and visible focus:

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { -webkit-text-size-adjust: 100%; }

body {
  background: var(--panel);
  color: var(--paper);
  font-family: var(--b);
  line-height: 1.6;
  font-size: clamp(.97rem, .94rem + .15vw, 1.05rem);
  -webkit-font-smoothing: antialiased;
}

img { max-width: 100%; display: block; height: auto; }
a { color: inherit; text-decoration: none; }
ul { list-style: none; padding: 0; }
button, input { font: inherit; }

:focus-visible { outline: 2px solid var(--led); outline-offset: 3px; border-radius: 2px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .001ms !important;
    transition-duration: .001ms !important;
  }
}

.wrap { max-width: var(--wrap); margin-inline: auto; padding-inline: clamp(1rem, 4vw, 2.5rem); }

.eyebrow {
  font-family: var(--m); font-size: .68rem; font-weight: 500;
  letter-spacing: .22em; text-transform: uppercase; color: var(--steel);
  display: flex; align-items: center; gap: .7rem;
}
.eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--led); flex: none; }

h1, h2, h3 { font-family: var(--d); font-weight: 500; }
h1 { font-size: clamp(2.1rem, 1.3rem + 3.6vw, 4rem); line-height: 1.03; text-wrap: balance; }
h2 { font-size: clamp(1.6rem, 1.2rem + 1.7vw, 2.5rem); line-height: 1.1; }

section { padding: clamp(3rem, 7vw, 5.5rem) 0; }
.sec-head { max-width: 60ch; margin-bottom: clamp(1.6rem, 4vw, 2.5rem); }
.sec-head p { margin-top: .9rem; color: #B0BBC1; }

.btn {
  display: inline-flex; align-items: center; gap: .6rem;
  padding: .95rem 1.5rem; border-radius: 7px; font-weight: 700; font-size: .95rem;
  transition: transform .18s, box-shadow .18s, background .18s;
}
.btn-1 { background: var(--led); color: #06232F; box-shadow: 0 6px 26px -8px rgba(88,182,255,.75); }
.btn-1:hover { transform: translateY(-2px); }
.btn-2 { border: 1px solid var(--rule); color: var(--paper); }
.btn-2:hover { background: var(--panel-2); border-color: var(--steel-2); }

.warn {
  margin-inline: auto; max-width: 70ch; padding: 1rem 1.2rem;
  border-left: 2px solid var(--amber); background: rgba(240,169,59,.06);
  font-size: .82rem; color: #BCA98C;
}
```

- [ ] **Step 7: Create `Header.astro`, `Footer.astro`, `CallBar.astro`, `Disclaimer.astro`**

Port the markup and scoped styles from mockup A. All hrefs go through `url()`.

`src/components/Header.astro`:

```astro
---
import { NAV, SITE, url } from '../lib/site';
const { path } = Astro.props as { path: string };
---
<header>
  <div class="wrap bar">
    <a class="brand" href={url('/')}>
      <img src={url('/assets/img/logo.webp')} alt="" width="26" height="26" /> BMS PRO
    </a>
    <nav aria-label="Головна навігація">
      <ul>
        {NAV.map((item) => (
          <li>
            <a href={url(item.href)} aria-current={path === item.href ? 'page' : undefined}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
    <a class="tel" href={`tel:${SITE.phonePrimary}`}>☎ {SITE.phonePrimaryDisplay}</a>
  </div>
</header>

<style>
  header {
    position: sticky; top: 0; z-index: 50;
    background: rgba(14,20,23,.82); backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--rule);
  }
  .bar { display: flex; align-items: center; gap: clamp(1rem,3vw,2.5rem); height: 66px; }
  .brand { display: flex; align-items: center; gap: .6rem; font-family: var(--d); font-weight: 600; font-size: 1.16rem; letter-spacing: .06em; }
  .brand img { border-radius: 5px; }
  nav ul { display: flex; gap: clamp(.9rem,2vw,1.8rem); }
  nav a { font-size: .85rem; color: #C7D1D6; padding: .4rem 0; border-bottom: 1px solid transparent; transition: color .2s, border-color .2s; }
  nav a:hover, nav a[aria-current='page'] { color: var(--paper); border-color: var(--led); }
  .tel {
    margin-left: auto; display: inline-flex; align-items: center; gap: .5rem;
    font-family: var(--m); font-size: .82rem; font-weight: 700;
    padding: .6rem 1rem; border: 1px solid rgba(88,182,255,.4); border-radius: 6px;
    color: var(--led-glow); background: var(--led-dim); white-space: nowrap;
  }
  @media (max-width: 900px) { nav { display: none; } }
  @media (max-width: 700px) { .tel { display: none; } }
</style>
```

`src/components/CallBar.astro` — the most important conversion element, since there is no cart:

```astro
---
import { SITE, url } from '../lib/site';
---
<div class="callbar">
  <a href={`tel:${SITE.phonePrimary}`}>☎ Зателефонувати</a>
  <a href={url('/products/')}>Прилади</a>
</div>

<style>
  .callbar { display: none; }
  @media (max-width: 700px) {
    .callbar {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1px;
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
      background: var(--rule); border-top: 1px solid var(--rule);
    }
    .callbar a { padding: .95rem; text-align: center; font-weight: 700; font-size: .9rem; background: var(--panel-2); }
    .callbar a:first-child { background: var(--led); color: #06232F; }
  }
</style>
```

`src/components/Disclaimer.astro`:

```astro
---
import { SITE } from '../lib/site';
---
<p class="warn">⚠️ {SITE.disclaimer}</p>
```

`src/components/Footer.astro`: three columns — copyright with `SITE.legalName`, the address, and the email. Port the `.foot-grid` styles from mockup A.

- [ ] **Step 8: Create `src/layouts/Base.astro`**

```astro
---
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import CallBar from '../components/CallBar.astro';

interface Props {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
}
const { title, description, canonicalPath, ogImage } = Astro.props;
---
<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Onest:wght@400;500;700&family=JetBrains+Mono:wght@500;700&display=swap"
    />
    <slot name="head" />
  </head>
  <body>
    <Header path={canonicalPath} />
    <main><slot /></main>
    <Footer />
    <CallBar />
  </body>
</html>
```

`Seo.astro` lands in Task 5 and will be passed through the `head` slot; `ogImage` is threaded now so no signature change is needed later.

- [ ] **Step 9: Rewrite the homepage to use the layout, and build**

```astro
---
import Base from '../layouts/Base.astro';
import Disclaimer from '../components/Disclaimer.astro';
---
<Base
  title="BMS Pro — системи біомеханічної стимуляції"
  description="Прилади BMS для механічної стимуляції мʼязів у діапазоні 20–40 Гц. Виробництво ТОВ «УКРСИСТЕМС», Київ."
  canonicalPath="/"
>
  <section class="wrap">
    <p class="eyebrow">Біомеханічна стимуляція · Київ</p>
    <h1>Механічна стимуляція мʼязів</h1>
    <Disclaimer />
  </section>
</Base>
```

Run: `npm run build && npm run check`
Expected: build succeeds, `astro check` reports 0 errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: design system tokens, layout shell, sticky call CTA"
```

---

### Task 3: Content collections and product data

Deliverable: the four devices exist as validated content, so every later component reads from one source.

**Files:**
- Create: `src/content.config.ts`, `src/content/products/{bms-m,bms-pro,bms-nexus,bms-quadro}.md`, `src/lib/format.ts`
- Test: `tests/unit/format.test.ts`, `tests/unit/content.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - collection `products` with fields `name`, `tagline`, `zones: string[]`, `price: number`, `channels: string`, `indicator: 'analog'|'digital'|'dual-digital'|'roller'`, `usage: string`, `image: string`, `gallery: string[]`, `specs: Record<string,string>`, `included: {item,qty}[]`, `order: number`, `documents: ('passport'|'declaration'|'technical-conditions')[]`
  - `src/lib/format.ts` exports `formatPrice(uah: number): string` and `PRICE_NOTE: string`

- [ ] **Step 1: Write the failing tests**

`tests/unit/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatPrice, PRICE_NOTE } from '../../src/lib/format';

describe('formatPrice', () => {
  it('groups thousands with a narrow no-break space and appends the hryvnia sign', () => {
    expect(formatPrice(24000)).toBe('24 000 ₴');
    expect(formatPrice(83000)).toBe('83 000 ₴');
  });
  it('handles values below a thousand', () => {
    expect(formatPrice(950)).toBe('950 ₴');
  });
  it('labels prices as approximate, per the spec', () => {
    expect(PRICE_NOTE).toBe('орієнтовна ціна');
  });
});
```

`tests/unit/content.test.ts` — reads the markdown directly so it runs without an Astro build:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = 'src/content/products';
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));

function frontmatter(file: string): Record<string, unknown> {
  const raw = readFileSync(`${DIR}/${file}`, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${file} has no frontmatter`);
  const out: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([a-zA-Z]+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

describe('product collection', () => {
  it('contains exactly the four devices', () => {
    expect(files.sort()).toEqual([
      'bms-m.md', 'bms-nexus.md', 'bms-pro.md', 'bms-quadro.md',
    ]);
  });

  it('prices match the spec', () => {
    const prices = Object.fromEntries(
      files.map((f) => [f.replace('.md', ''), Number(frontmatter(f).price)]),
    );
    expect(prices).toEqual({
      'bms-m': 24000, 'bms-pro': 32000, 'bms-nexus': 48000, 'bms-quadro': 83000,
    });
  });

  it('gives every device a distinct tagline, so the pages do not compete in search', () => {
    const taglines = files.map((f) => frontmatter(f).tagline);
    expect(new Set(taglines).size).toBe(files.length);
  });

  it('uses only the four known indicator types', () => {
    const allowed = new Set(['analog', 'digital', 'dual-digital', 'roller']);
    for (const f of files) expect(allowed).toContain(frontmatter(f).indicator);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit`
Expected: FAIL — missing `src/lib/format` and missing `src/content/products`.

- [ ] **Step 3: Implement `src/lib/format.ts`**

U+202F narrow no-break space keeps `24 000` from wrapping mid-number.

```ts
const THIN_NBSP = ' ';

export function formatPrice(uah: number): string {
  const grouped = String(uah).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_NBSP);
  return `${grouped}${THIN_NBSP}₴`;
}

export const PRICE_NOTE = 'орієнтовна ціна';
```

- [ ] **Step 4: Create `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    zones: z.array(z.string()).min(1),
    price: z.number().int().positive(),
    channels: z.string(),
    indicator: z.enum(['analog', 'digital', 'dual-digital', 'roller']),
    usage: z.string(),
    image: z.string(),
    gallery: z.array(z.string()).default([]),
    specs: z.record(z.string(), z.string()).default({}),
    included: z.array(z.object({ item: z.string(), qty: z.number().int() })).default([]),
    documents: z.array(z.enum(['passport', 'declaration', 'technical-conditions'])).default([]),
    order: z.number().int(),
  }),
});

const documents = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/documents' }),
  schema: z.object({
    model: z.string(),
    type: z.enum(['passport', 'declaration', 'technical-conditions']),
    title: z.string(),
    designation: z.string(),
    lead: z.string(),
    pdf: z.string().optional(),
    image: z.string().optional(),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string(),
    models: z.array(z.string()).default([]),
    order: z.number().int(),
  }),
});

export const collections = { products, documents, faq };
```

- [ ] **Step 5: Create the four product files**

`src/content/products/bms-m.md`:

```markdown
---
name: BMS m
tagline: Базова модель для стимуляції мʼязів обличчя та шиї в домашніх умовах
zones: ['Обличчя', 'Шия']
price: 24000
channels: '1'
indicator: analog
usage: Дім
image: '/assets/img/bms-m-card.webp'
gallery: ['/assets/img/bms-m-card.webp', '/assets/img/bms-m-back-card.webp', '/assets/img/case-card.webp']
specs:
  'Споживана потужність': '≤20 Вт'
  'Частота коливань насадки': '20–40 Гц'
  'Напруга живлення, 50–60 Гц': '110–235 В'
  'Кут повороту головки': '40–44°'
  'Рівень шуму, максимум': '≤55 дБА'
  'Робота / обовʼязкова пауза': '45 / 15 хв'
  'Електробезпека': 'II клас'
  'Гарантія виробника': '12 міс'
included:
  - { item: 'Блок стимуляції', qty: 1 }
  - { item: 'Блок живлення', qty: 1 }
documents: ['passport', 'declaration', 'technical-conditions']
order: 1
---

Одна насадка й аналоговий регулятор частоти. Обертанням ручки потенціометра ви обираєте
потрібну частоту коливань у діапазоні 20–40 Гц і працюєте з конкретною групою мʼязів.
```

Create `bms-pro.md`, `bms-nexus.md`, `bms-quadro.md` the same way with these values. Specs are copied from BMS m — they share the platform — but each `tagline` must be distinct or `tests/unit/content.test.ts` fails by design:

| file | name | price | zones | channels | indicator | usage | image |
|---|---|---|---|---|---|---|---|
| `bms-pro.md` | BMS pro | 32000 | Шия, Спина | `'1'` | `digital` | Дім, салон | `/assets/img/bms-pro-card.webp` |
| `bms-nexus.md` | BMS Nexus | 48000 | Обличчя, Шия, Спина | `'2'` | `dual-digital` | Салон, кабінет | `/assets/img/bms-nexus-card.webp` |
| `bms-quadro.md` | BMS Quadro | 83000 | Спина | `'Роликовий вузол'` | `roller` | Кабінет, реабілітація | `/assets/img/bms-quadro-card.webp` |

Taglines to use:

- BMS pro — `Цифровий регулятор частоти для великих мʼязових груп шиї та спини`
- BMS Nexus — `Два незалежні канали: можливості BMS m і BMS pro в одному корпусі`
- BMS Quadro — `Роликовий вузол для професійного опрацювання спини`

Set `documents: []` on pro, Nexus and Quadro — their documents do not exist yet, and the `/documents/` hub renders those rows as «готується» in Task 9.

Body copy for each is one honest paragraph describing the panel. Do not invent therapeutic claims.

> **Content note for the client:** these taglines and bodies are written from the photographs and the BMS m passport. They must be reviewed — see spec §10 items 1 and 2.

- [ ] **Step 6: Run the tests and the build**

Run: `npx vitest run --project unit && npm run build && npm run check`
Expected: unit tests PASS, build succeeds, `astro check` reports 0 errors (this also proves the Zod schemas accept the content).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: product, document and faq content collections with the four devices"
```

---

### Task 4: The frequency instrument component

Deliverable: the signature element, configurable per model — the thing that explains why Nexus costs 48 000 ₴.

**Files:**
- Create: `src/lib/instrument.ts`, `src/components/Instrument.astro`
- Test: `tests/unit/instrument.test.ts`

**Interfaces:**
- Consumes: `indicator` values from Task 3
- Produces:
  - `src/lib/instrument.ts` exports `type Indicator = 'analog'|'digital'|'dual-digital'|'roller'`, `type InstrumentConfig = { channels: number; digital: boolean; label: string }`, and `instrumentFor(indicator: Indicator): InstrumentConfig`
  - `src/components/Instrument.astro` accepts `{ indicator?: Indicator; heading?: string }`, defaults to `'digital'`

- [ ] **Step 1: Write the failing test**

`tests/unit/instrument.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { instrumentFor } from '../../src/lib/instrument';

describe('instrumentFor', () => {
  it('gives BMS m a single analog channel with no digital readout', () => {
    expect(instrumentFor('analog')).toEqual({
      channels: 1, digital: false, label: 'Аналоговий регулятор',
    });
  });
  it('gives BMS pro one digital channel', () => {
    expect(instrumentFor('digital')).toEqual({
      channels: 1, digital: true, label: 'Цифровий регулятор',
    });
  });
  it('gives BMS Nexus two independent digital channels', () => {
    const cfg = instrumentFor('dual-digital');
    expect(cfg.channels).toBe(2);
    expect(cfg.digital).toBe(true);
  });
  it('treats the roller unit as one digital channel', () => {
    expect(instrumentFor('roller').channels).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit`
Expected: FAIL — `Cannot find module '../../src/lib/instrument'`.

- [ ] **Step 3: Implement `src/lib/instrument.ts`**

```ts
export type Indicator = 'analog' | 'digital' | 'dual-digital' | 'roller';

export interface InstrumentConfig {
  channels: number;
  digital: boolean;
  label: string;
}

const CONFIG: Record<Indicator, InstrumentConfig> = {
  analog: { channels: 1, digital: false, label: 'Аналоговий регулятор' },
  digital: { channels: 1, digital: true, label: 'Цифровий регулятор' },
  'dual-digital': { channels: 2, digital: true, label: 'Два цифрові канали' },
  roller: { channels: 1, digital: true, label: 'Роликовий вузол' },
};

export function instrumentFor(indicator: Indicator): InstrumentConfig {
  return CONFIG[indicator];
}

export const FREQ_MIN = 20;
export const FREQ_MAX = 40;
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run --project unit`
Expected: PASS.

- [ ] **Step 5: Build `src/components/Instrument.astro`**

Port the instrument markup, styles and script from `public/mockups/a/index.html` (the `.instrument`, `.scope`, `.readout`, `.digits`, `.seg`, `.dial` rules and the `SEGS`/`MAP`/`digitSVG`/`render` script). Three changes from the mockup:

1. Render `config.channels` dials, each with its own scope, readout and `<input type="range">`.
2. When `config.digital` is false, hide the 7-segment readout and show the dial position only — BMS m has no display.
3. Scope every id per channel (`freq-0`, `freq-1`) so two instruments on one page do not collide.

```astro
---
import { instrumentFor, FREQ_MIN, FREQ_MAX, type Indicator } from '../lib/instrument';

interface Props { indicator?: Indicator; heading?: string; }
const { indicator = 'digital', heading = 'Регулятор частоти' } = Astro.props;
const config = instrumentFor(indicator);
const channels = Array.from({ length: config.channels }, (_, i) => i);
---
<div class="instrument" data-digital={String(config.digital)}>
  <div class="inst-head">
    <p class="eyebrow">{heading}</p>
    <span class="inst-tag">{config.label}</span>
  </div>

  {channels.map((i) => (
    <div class="channel" data-channel={i}>
      {config.channels > 1 && <p class="ch-label">Канал {i + 1}</p>}
      <div class="scope">
        <svg viewBox="0 0 800 200" preserveAspectRatio="none" aria-hidden="true">
          <line class="mid" x1="0" y1="100" x2="800" y2="100" />
          <path class="trace" data-trace={i} />
        </svg>
      </div>
      {config.digital && (
        <div class="readout">
          <div class="digits" data-digits={i} role="img" aria-label="Поточна частота"></div>
          <span class="unit">Гц</span>
        </div>
      )}
      <div class="dial">
        <input
          type="range" data-freq={i}
          min={FREQ_MIN} max={FREQ_MAX} step="0.5" value={28 + i * 6}
          aria-label={config.channels > 1 ? `Частота коливань, канал ${i + 1}, Гц` : 'Частота коливань, Гц'}
        />
        <div class="dial-scale"><span>{FREQ_MIN} Гц</span><span>30</span><span>{FREQ_MAX} Гц</span></div>
      </div>
    </div>
  ))}

  <p class="hint">Потягніть регулятор — робочий діапазон приладів BMS</p>
</div>
```

The script must be `is:inline` free — use a plain `<script>` so Astro bundles it, and query only within `document.currentScript`'s component root via a `data-` attribute so multiple instruments coexist:

```astro
<script>
  const SEGS = [[12,2,36,11],[49,13,11,34],[49,57,11,34],[12,91,36,11],[0,57,11,34],[0,13,11,34],[12,46.5,36,11]];
  const MAP: Record<number, string> = {0:'abcdef',1:'bc',2:'abdeg',3:'abcdg',4:'bcfg',5:'acdfg',6:'acdefg',7:'abc',8:'abcdefg',9:'abcdfg'};
  const KEYS = 'abcdefg';

  function digitSVG(n: number): string {
    const on = MAP[n];
    const rects = SEGS.map((s, i) =>
      `<rect class="seg${on.includes(KEYS[i]) ? ' on' : ''}" x="${s[0]}" y="${s[1]}" width="${s[2]}" height="${s[3]}" rx="3"/>`
    ).join('');
    return `<svg viewBox="-2 -2 64 108" aria-hidden="true">${rects}</svg>`;
  }

  document.querySelectorAll<HTMLElement>('.instrument').forEach((root) => {
    root.querySelectorAll<HTMLInputElement>('input[data-freq]').forEach((input) => {
      const i = input.dataset.freq!;
      const digits = root.querySelector<HTMLElement>(`[data-digits="${i}"]`);
      const trace = root.querySelector<SVGPathElement>(`[data-trace="${i}"]`);

      const render = (hz: number) => {
        if (digits) {
          const s = hz.toFixed(1);
          digits.innerHTML = [...s].map((ch) => ch === '.' ? '<i class="dp"></i>' : digitSVG(Number(ch))).join('');
          digits.setAttribute('aria-label', `${s} герц`);
        }
        if (trace) {
          // 0..800 spans two viewport widths so the scroll animation loops seamlessly
          const cycles = Math.round((hz - 20) / 2) + 3;
          let d = '';
          for (let x = 0; x <= 800; x += 4) {
            const y = 100 - 68 * Math.sin((x / 400) * cycles * 2 * Math.PI);
            d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1);
          }
          trace.setAttribute('d', d);
        }
      };

      input.addEventListener('input', (e) => render(Number((e.target as HTMLInputElement).value)));
      render(Number(input.value));
    });
  });
</script>
```

- [ ] **Step 6: Render both variants on the homepage and check them in a browser**

Temporarily add `<Instrument indicator="dual-digital" />` and `<Instrument indicator="analog" />` to `src/pages/index.astro`, then:

```bash
npm run build && npx astro preview --port 4321 &
sleep 3
curl -s http://localhost:4321/bms-pro/ | grep -c 'class="instrument"'
```

Expected: `2`. Then open `http://localhost:4321/bms-pro/` and confirm: the dual instrument shows two dials with two independent readouts, the analog one shows a dial with no readout, and keyboard arrows move each slider.

Remove the temporary instruments from `index.astro` before committing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: per-model frequency instrument with 7-segment readout"
```

---

### Task 5: SEO components and JSON-LD builders

Deliverable: the layer the current site is missing entirely — structured data on every page.

**Files:**
- Create: `src/lib/schema.ts`, `src/components/Seo.astro`, `src/components/JsonLd.astro`, `src/components/Breadcrumbs.astro`
- Modify: `src/layouts/Base.astro`
- Test: `tests/unit/schema.test.ts`

**Interfaces:**
- Consumes: `SITE` from Task 2, product frontmatter from Task 3
- Produces: `src/lib/schema.ts` exports `organizationSchema()`, `websiteSchema(siteUrl)`, `productSchema(p, absUrl)`, `breadcrumbSchema(trail)`, `faqSchema(items)`, `documentSchema(doc, absUrl)`, `localBusinessSchema()`. Every one returns a plain object with `'@context': 'https://schema.org'`.

- [ ] **Step 1: Write the failing test**

`tests/unit/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  breadcrumbSchema, faqSchema, organizationSchema, productSchema,
} from '../../src/lib/schema';

describe('organizationSchema', () => {
  it('names the canonical legal entity', () => {
    const s = organizationSchema();
    expect(s['@type']).toBe('Organization');
    expect(s.legalName).toBe('ТОВ «УКРСИСТЕМС»');
    expect(s.address.postalCode).toBe('02099');
  });
});

describe('productSchema', () => {
  const p = {
    name: 'BMS Nexus', tagline: 'Два незалежні канали', price: 48000,
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
  });
});

describe('breadcrumbSchema', () => {
  it('numbers positions from one', () => {
    const s = breadcrumbSchema([
      { name: 'Головна', url: 'https://x/' },
      { name: 'Прилади', url: 'https://x/products/' },
    ]);
    expect(s.itemListElement[0].position).toBe(1);
    expect(s.itemListElement[1].name).toBe('Прилади');
  });
});

describe('faqSchema', () => {
  it('wraps each answer in an acceptedAnswer', () => {
    const s = faqSchema([{ question: 'Чи це медичний виріб?', answer: 'Ні.' }]);
    expect(s['@type']).toBe('FAQPage');
    expect(s.mainEntity[0].acceptedAnswer.text).toBe('Ні.');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit`
Expected: FAIL — `Cannot find module '../../src/lib/schema'`.

- [ ] **Step 3: Implement `src/lib/schema.ts`**

```ts
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
    '@context': CTX, '@type': 'WebSite',
    name: SITE.name, url: siteUrl, inLanguage: 'uk',
  };
}

export interface ProductLike {
  name: string; tagline: string; price: number; image: string;
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
      '@type': 'ListItem', position: i + 1, name: t.name, item: t.url,
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
  doc: { title: string; designation: string }, absUrl: string,
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run --project unit`
Expected: PASS.

- [ ] **Step 5: Create `JsonLd.astro`, `Seo.astro` and `Breadcrumbs.astro`**

`src/components/JsonLd.astro`:

```astro
---
const { data } = Astro.props as { data: unknown };
---
<script type="application/ld+json" set:html={JSON.stringify(data)} is:inline />
```

`src/components/Seo.astro` — canonical plus Open Graph. The OG image must be absolute or scrapers ignore it:

```astro
---
import { SITE } from '../lib/site';

interface Props { title: string; description: string; canonicalPath: string; ogImage?: string; }
const { title, description, canonicalPath, ogImage } = Astro.props;

const canonical = new URL(canonicalPath, Astro.site).href;
const image = new URL(ogImage ?? '/og/default.png', Astro.site).href;
---
<link rel="canonical" href={canonical} />
<meta property="og:type" content="website" />
<meta property="og:site_name" content={SITE.name} />
<meta property="og:locale" content="uk_UA" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={image} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={image} />
```

`src/components/Breadcrumbs.astro` renders the visible trail and emits `breadcrumbSchema` via `JsonLd`. Props: `{ trail: { name: string; href: string }[] }`. The last entry renders as plain text with `aria-current="page"`, not a link.

- [ ] **Step 6: Wire `Seo` and the sitewide `Organization` into `Base.astro`**

Insert into `<head>`, after the `<meta name="description">` line:

```astro
    <Seo title={title} description={description} canonicalPath={canonicalPath} ogImage={ogImage} />
    <JsonLd data={organizationSchema()} />
```

with the matching imports. Note `Astro.site` must be set for `Seo` to work — it is, via `astro.config.mjs`.

- [ ] **Step 7: Build and confirm the head output**

```bash
npm run build
grep -o '<link rel="canonical"[^>]*>' dist/index.html
grep -c 'application/ld+json' dist/index.html
```

Expected: canonical is `https://deaflynx.github.io/bms-pro/`, and at least one JSON-LD block.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: SEO head, JSON-LD builders, breadcrumbs"
```

---

### Task 6: Shared display components

Deliverable: the reusable blocks the homepage and product pages both need, including the two lifted from direction В.

**Files:**
- Create: `src/components/ProductCard.astro`, `src/components/ComparisonMatrix.astro`, `src/components/SpecTiles.astro`, `src/components/Diagram.astro`, `src/components/VideoFacade.astro`
- Test: `tests/build/components.test.ts`

**Interfaces:**
- Consumes: products collection (Task 3), `formatPrice`/`PRICE_NOTE` (Task 3), `url()` (Task 2)
- Produces:
  - `ProductCard.astro` props `{ product: CollectionEntry<'products'> }`
  - `ComparisonMatrix.astro` props `{ products: CollectionEntry<'products'>[]; highlight?: string }`
  - `SpecTiles.astro` props `{ specs: Record<string,string>; note?: string }`
  - `Diagram.astro` props `{ kind: 'circulation' | 'metabolic' | 'neuromuscular' }`
  - `VideoFacade.astro` props `{ id: string; caption?: string }`

- [ ] **Step 1: Build `ProductCard.astro`**

Port the `.card` markup and styles from mockup A. Every card links to `url('/products/' + product.id + '/')`.

```astro
---
import type { CollectionEntry } from 'astro:content';
import { formatPrice, PRICE_NOTE } from '../lib/format';
import { url } from '../lib/site';

const { product } = Astro.props as { product: CollectionEntry<'products'> };
const d = product.data;
---
<article class="card">
  <a href={url(`/products/${product.id}/`)}>
    <figure>
      <img src={url(d.image)} alt={`Прилад ${d.name}`} width="900" height="675" loading="lazy" />
    </figure>
    <div class="body">
      <h3>{d.name}</h3>
      <p class="zone">{d.zones.join(', ')}</p>
      <p class="desc">{d.tagline}</p>
      <p class="price"><b>{formatPrice(d.price)}</b><span>{PRICE_NOTE}</span></p>
      <span class="more">Детальніше →</span>
    </div>
  </a>
</article>
```

- [ ] **Step 2: Build `ComparisonMatrix.astro`**

Port the `<table>` from `public/mockups/c/index.html` — `.matrix-shell` with `overflow-x:auto`, `min-width:800px` on the table, sticky first column, highlighted price row, and the `.scroll-hint` shown under 880 px. Restyle to A's dark tokens: `--panel-2` surfaces, `--rule` hairlines, `--led-dim` for the price row instead of В's green.

Rows, in order: Орієнтовна ціна · Зона впливу · Каналів стимуляції · Індикатор частоти · Частота коливань · Застосування · Гарантія · action row with «Замовити» linking to `tel:`.

The `highlight` prop adds `class="is-current"` to that model's column so the product-page instance marks where the visitor is.

Indicator labels come from `instrumentFor(d.indicator).label` so they cannot drift from Task 4.

- [ ] **Step 3: Build `SpecTiles.astro`**

The 8-tile grid from В, retoned to A. `Object.entries(specs)` renders `<b>{value}</b><span>{key}</span>`.

```astro
---
const { specs, note } = Astro.props as { specs: Record<string, string>; note?: string };
const entries = Object.entries(specs);
---
<div class="spec-grid">
  {entries.map(([label, value]) => (
    <div class="spec"><b>{value}</b><span>{label}</span></div>
  ))}
</div>
{note && <p class="spec-note">{note}</p>}

<style>
  .spec-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    border: 1px solid var(--rule); border-radius: var(--r); overflow: hidden;
    background: var(--rule); gap: 1px;
  }
  @media (max-width: 900px) { .spec-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 520px) { .spec-grid { grid-template-columns: 1fr; } }
  .spec { background: var(--panel-2); padding: 1.1rem 1.2rem; }
  .spec b { display: block; font-family: var(--d); font-weight: 500; font-size: 1.28rem; }
  .spec span { font-size: .78rem; color: var(--steel); }
  .spec-note { margin-top: .8rem; font-size: .78rem; color: var(--steel-2); }
</style>
```

- [ ] **Step 4: Build `Diagram.astro`**

Port the three SVGs from `public/mockups/a/index.html` (`.dia` with `circulation`, `metabolic`, `neuromuscular` shapes). Keep `role="img"` and the `aria-label` on each — they are the only description a screen reader gets.

- [ ] **Step 5: Build `VideoFacade.astro`**

Port the facade from mockup A. A YouTube iframe costs roughly 1 MB of player JS, so it must not load until clicked.

```astro
---
const { id, caption } = Astro.props as { id: string; caption?: string };
---
<div class="video-block">
  <div class="video" data-yt={id}>
    <button class="facade" aria-label="Дивитися відео про біомеханічну стимуляцію на YouTube">
      <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" width="1280" height="720" loading="lazy" />
      <span class="play" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#06232F"><path d="M8 5v14l11-7z"/></svg>
      </span>
    </button>
  </div>
  {caption && <p class="video-cap">{caption}</p>}
</div>

<script>
  document.querySelectorAll<HTMLElement>('.video').forEach((box) => {
    const btn = box.querySelector<HTMLButtonElement>('.facade');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0`;
      f.title = 'Відео про біомеханічну стимуляцію';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      btn.replaceWith(f);
    });
  });
</script>
```

> The video id used everywhere is `VV3J9_Tyth4`, a third-party Russian-language placeholder. Spec §10 item 7 requires replacing it before launch. Caption it «Тимчасове відео для макета, буде замінено на власне.»

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: product card, comparison matrix, spec tiles, diagrams, video facade"
```

---

### Task 7: Homepage

Deliverable: `/` complete — the page that has to hook, qualify, then route to a call.

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/build/home.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–6
- Produces: nothing new

- [ ] **Step 1: Write the failing build test**

`tests/build/home.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('dist/index.html', 'utf8');

describe('homepage', () => {
  it('leads with the frequency range in the h1', () => {
    expect(html).toMatch(/<h1[^>]*>[\s\S]*20–40 Гц[\s\S]*<\/h1>/);
  });
  it('renders exactly one instrument', () => {
    expect(html.match(/class="instrument"/g)).toHaveLength(1);
  });
  it('renders all four product cards', () => {
    for (const n of ['BMS m', 'BMS pro', 'BMS Nexus', 'BMS Quadro']) {
      expect(html).toContain(n);
    }
  });
  it('includes the comparison matrix', () => {
    expect(html).toContain('Порівняння моделей');
  });
  it('includes the three principle diagrams', () => {
    expect(html.match(/class="dia"/g)).toHaveLength(3);
  });
  it('never ships an iframe', () => {
    expect(html).not.toContain('<iframe');
  });
  it('carries the medical-device disclaimer', () => {
    expect(html).toContain('не є медичними виробами');
  });
  it('makes the primary phone dialable', () => {
    expect(html).toContain('tel:+380505460077');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build && npx vitest run --project build`
Expected: FAIL on the instrument, matrix and diagram assertions.

- [ ] **Step 3: Build the homepage**

Compose in this order — hook, qualify, route:

1. Hero: eyebrow «Біомеханічна стимуляція · Київ», `<h1>` «Механічна стимуляція мʼязів на частоті <em>20–40 Гц</em>», lede, two CTAs, `<Instrument />` on the right.
2. Spec ticker: 20–40 Гц · ≤20 Вт · II клас · 45 / 15 хв · 12 міс. Use an auto-fit grid with 1 px gaps — **not** flex with `min-width`, which overflowed below 390 px in the mockups.
3. `/products/` lineup: four `<ProductCard>`s from `getCollection('products')` sorted by `order`.
4. `<ComparisonMatrix products={products} />`.
5. «Принцип дії»: three `<Diagram>`s plus `<VideoFacade id="VV3J9_Tyth4" />`.
6. `<SpecTiles specs={bmsM.data.specs} note="Характеристики наведено для приладу BMS m згідно з паспортом." />` beside a document list.
7. Manufacturer block: `SITE.legalName`, declaration number and date.
8. Call CTA, then `<Disclaimer />`.

Head slot gets `websiteSchema` and an `ItemList` of the four products.

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
// ...component imports
const products = (await getCollection('products')).sort((a, b) => a.data.order - b.data.order);
const bmsM = products.find((p) => p.id === 'bms-m')!;
---
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run build && npx vitest run --project build`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: homepage with instrument hero, lineup, matrix, diagrams"
```

---

### Task 8: Product pages and catalogue

Deliverable: four URLs that can rank, carry `Product` schema, and be ad landing pages — the core reason for the rebuild.

**Files:**
- Create: `src/pages/products/index.astro`, `src/pages/products/[slug].astro`
- Test: `tests/build/products.test.ts`

**Interfaces:**
- Consumes: Tasks 2–6
- Produces: four routes at `/products/<slug>/`

- [ ] **Step 1: Write the failing test**

`tests/build/products.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SLUGS = ['bms-m', 'bms-pro', 'bms-nexus', 'bms-quadro'];

function jsonLd(html: string): any[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]));
}

describe('product pages', () => {
  it('emits a page per device', () => {
    for (const s of SLUGS) expect(existsSync(`dist/products/${s}/index.html`)).toBe(true);
  });

  it('carries Product schema with a hryvnia Offer', () => {
    for (const s of SLUGS) {
      const blocks = jsonLd(readFileSync(`dist/products/${s}/index.html`, 'utf8'));
      const product = blocks.find((b) => b['@type'] === 'Product');
      expect(product, `${s} is missing Product schema`).toBeDefined();
      expect(product.offers.priceCurrency).toBe('UAH');
      expect(product.offers.price).toBeGreaterThan(0);
    }
  });

  it('carries BreadcrumbList schema', () => {
    for (const s of SLUGS) {
      const blocks = jsonLd(readFileSync(`dist/products/${s}/index.html`, 'utf8'));
      expect(blocks.some((b) => b['@type'] === 'BreadcrumbList')).toBe(true);
    }
  });

  it('gives BMS Nexus two instrument channels and BMS m none digital', () => {
    const nexus = readFileSync('dist/products/bms-nexus/index.html', 'utf8');
    expect(nexus.match(/data-channel="/g)).toHaveLength(2);
    const m = readFileSync('dist/products/bms-m/index.html', 'utf8');
    expect(m).toContain('data-digital="false"');
  });

  it('gives each device a distinct title and meta description', () => {
    const titles = new Set<string>();
    const descs = new Set<string>();
    for (const s of SLUGS) {
      const html = readFileSync(`dist/products/${s}/index.html`, 'utf8');
      titles.add(html.match(/<title>(.*?)<\/title>/)![1]);
      descs.add(html.match(/<meta name="description" content="(.*?)"/)![1]);
    }
    expect(titles.size).toBe(SLUGS.length);
    expect(descs.size).toBe(SLUGS.length);
  });

  it('links every device to the others through the matrix', () => {
    const html = readFileSync('dist/products/bms-m/index.html', 'utf8');
    for (const s of SLUGS.filter((x) => x !== 'bms-m')) {
      expect(html).toContain(`/products/${s}/`);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build && npx vitest run --project build`
Expected: FAIL — no `dist/products/` output.

- [ ] **Step 3: Build `src/pages/products/[slug].astro`**

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import Base from '../../layouts/Base.astro';
// ...component imports
import { productSchema, breadcrumbSchema, faqSchema } from '../../lib/schema';
import { formatPrice, PRICE_NOTE } from '../../lib/format';
import { instrumentFor } from '../../lib/instrument';
import { url } from '../../lib/site';

export async function getStaticPaths() {
  const products = await getCollection('products');
  return products.map((product) => ({ params: { slug: product.id }, props: { product } }));
}

const { product } = Astro.props as { product: CollectionEntry<'products'> };
const d = product.data;
const all = (await getCollection('products')).sort((a, b) => a.data.order - b.data.order);
const path = `/products/${product.id}/`;
const abs = new URL(path, Astro.site).href;
const { Content } = await product.render();
---
```

Section order, matching spec §5.2:

1. `<Breadcrumbs trail={[{name:'Головна',href:'/'},{name:'Прилади',href:'/products/'},{name:d.name,href:path}]} />`
2. Split hero — gallery from `d.gallery` on the left; on the right the zone eyebrow, `<h1>{d.name}</h1>`, `formatPrice(d.price)` with `PRICE_NOTE`, four fact chips (`{d.channels} канал`, `instrumentFor(d.indicator).label`, `20–40 Гц`, `II клас`), the `tel:` CTA, and a trust line with гарантія / declaration / Київ.
3. `<Instrument indicator={d.indicator} heading={`Панель керування ${d.name}`} />` — the differentiator.
4. Комплектація from `d.included`, skipped when empty.
5. `<SpecTiles specs={d.specs} />`.
6. Документи — links to `/documents/{product.id}/{type}/` for each entry in `d.documents`; when empty, «Документи для цієї моделі готуються.»
7. `<ComparisonMatrix products={all} highlight={product.id} />`.
8. Model FAQ from `getCollection('faq')` filtered by `models.includes(product.id)`.
9. Call CTA, `<Disclaimer />`.

`title` is `` `${d.name} — прилад біомеханічної стимуляції | BMS Pro` ``; `description` is `d.tagline` plus the price, keeping both unique per model as the test requires.

Head slot: `productSchema(d, abs)`, `breadcrumbSchema(...)`, and `faqSchema(...)` when the model has questions.

- [ ] **Step 4: Build `src/pages/products/index.astro`**

Header, four `<ProductCard>`s, `<ComparisonMatrix>`, call CTA, `<Disclaimer />`. Head slot emits an `ItemList` of the four products.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run build && npx vitest run --project build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: product catalogue and four product pages with Product schema"
```

---

### Task 9: Document pages

Deliverable: `/documents/bms-m/{passport,declaration,technical-conditions}/` — the high-intent URLs the current site cannot rank for, because they are `#anchors`.

**Files:**
- Create: `src/layouts/DocumentPage.astro`, `src/styles/print.css`, `src/pages/documents/index.astro`, `src/pages/documents/[model]/[type].astro`, three files in `src/content/documents/`
- Add: `public/assets/docs/passport-bms-m.pdf`, `public/assets/docs/tu-bms-m.pdf`
- Test: `tests/build/documents.test.ts`

**Interfaces:**
- Consumes: `documents` collection (Task 3), `DigitalDocument` schema (Task 5)
- Produces: routes `/documents/<model>/<type>/`

- [ ] **Step 1: Fetch the PDFs and the declaration scan**

These already exist and are reused rather than recreated.

```bash
mkdir -p public/assets/docs
curl -sL -o public/assets/docs/passport-bms-m.pdf https://volodymyr-babak.github.io/bms-pro/assets/docs/passport-bms-m.pdf
curl -sL -o public/assets/docs/tu-bms-m.pdf       https://volodymyr-babak.github.io/bms-pro/assets/docs/tu-bms-m.pdf
curl -sL -o public/assets/img/declar.png          https://volodymyr-babak.github.io/bms-pro/assets/img/declar.png
ls -la public/assets/docs public/assets/img/declar.png
```

Expected: `passport-bms-m.pdf` ≈ 520 KB, `tu-bms-m.pdf` ≈ 5.0 MB, `declar.png` ≈ 391 KB. The 5 MB ТУ is kept as-is per spec §5.3 — the HTML transcription is the primary route.

- [ ] **Step 2: Write the failing test**

`tests/build/documents.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PAGES = [
  ['passport', 'Паспорт'],
  ['declaration', 'Декларація'],
  ['technical-conditions', 'Технічні умови'],
] as const;

describe('document pages', () => {
  it('emits a page per document type for BMS m', () => {
    for (const [type] of PAGES) {
      expect(existsSync(`dist/documents/bms-m/${type}/index.html`)).toBe(true);
    }
  });

  it('transcribes the document body as HTML, not just a PDF link', () => {
    const html = readFileSync('dist/documents/bms-m/passport/index.html', 'utf8');
    // the passport has 10 numbered sections
    expect(html.match(/<h2[^>]*>/g)!.length).toBeGreaterThanOrEqual(10);
    expect(html).toContain('Гарантійний термін');
  });

  it('states the formal TU designation on the technical-conditions page', () => {
    const html = readFileSync('dist/documents/bms-m/technical-conditions/index.html', 'utf8');
    expect(html).toContain('ТУ У 27.9-2294811615-001:2025');
  });

  it('states the declaration number and registrant', () => {
    const html = readFileSync('dist/documents/bms-m/declaration/index.html', 'utf8');
    expect(html).toContain('UA.TR.D.00159-25');
    expect(html).toContain('ТОВ «УКРСИСТЕМС»');
  });

  it('carries DigitalDocument schema', () => {
    const html = readFileSync('dist/documents/bms-m/passport/index.html', 'utf8');
    expect(html).toContain('"DigitalDocument"');
  });

  it('marks the other models as pending rather than linking to empty pages', () => {
    const hub = readFileSync('dist/documents/index.html', 'utf8');
    expect(hub).toContain('готується');
    expect(hub).not.toContain('/documents/bms-quadro/passport/');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run build && npx vitest run --project build`
Expected: FAIL — no `dist/documents/`.

- [ ] **Step 4: Transcribe the three documents into `src/content/documents/`**

Source the body text from the reference pages, which already contain full transcriptions:

- `https://volodymyr-babak.github.io/bms-pro/passport.html` — 10 sections
- `https://volodymyr-babak.github.io/bms-pro/specifications.html` — 8 sections
- `https://volodymyr-babak.github.io/bms-pro/declaration.html`

Fetch and convert:

```bash
for p in passport specifications declaration; do
  curl -sL -o "/tmp/vb-$p.html" "https://volodymyr-babak.github.io/bms-pro/$p.html"
done
```

Extract the `<main>` content of each and rewrite as Markdown with `##` per numbered section and Markdown tables for the spec, parts and troubleshooting tables. Keep the Ukrainian text **verbatim** — it is regulatory copy and must not be paraphrased.

`src/content/documents/bms-m-passport.md` frontmatter:

```yaml
---
model: bms-m
type: passport
title: Паспорт приладу BMS m
designation: 'ТУ У 27.9-2294811615-001:2025'
lead: 'Стимулятор біомеханічний BMS (m, Pro) · ТУ У 27.9-2294811615-001:2025'
pdf: '/assets/docs/passport-bms-m.pdf'
---
```

`bms-m-technical-conditions.md` uses `pdf: '/assets/docs/tu-bms-m.pdf'`. `bms-m-declaration.md` uses `image: '/assets/img/declar.png'` and no `pdf` — the declaration is a scan, not a PDF — and its body states registrant `ТОВ «УКРСИСТЕМС»`, number `UA.TR.D.00159-25`, date 24 липня 2025.

- [ ] **Step 5: Create `src/styles/print.css`**

So «Друкувати» yields a clean printout, matching the reference implementation.

```css
@media print {
  header, .callbar, .doc-toc, .doc-actions, footer { display: none !important; }
  :root { --panel: #fff; --panel-2: #fff; --paper: #000; --steel: #333; --rule: #ccc; }
  body { background: #fff; color: #000; font-size: 11pt; }
  main { max-width: none; }
  h1, h2, h3 { color: #000; page-break-after: avoid; }
  table { page-break-inside: avoid; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 4pt 6pt; }
  a[href^='http']::after { content: ' (' attr(href) ')'; font-size: 9pt; }
}
```

- [ ] **Step 6: Build `DocumentPage.astro` and the routes**

`DocumentPage.astro` layout: breadcrumbs → `<h1>{title}</h1>` → `<p class="lead">{lead}</p>` → sticky `.doc-toc` built from the rendered headings → `.doc-actions` with «Завантажити PDF» (when `pdf` is set) and a «Друкувати» button calling `window.print()` → `<slot />` → `<Disclaimer />`. Import `print.css`.

Build the TOC from Astro's `headings`:

```astro
---
const { Content, headings } = await entry.render();
const toc = headings.filter((h) => h.depth === 2);
---
```

`src/pages/documents/[model]/[type].astro` uses `getStaticPaths` over the `documents` collection, mapping `{ model, type }` to params.

`src/pages/documents/index.astro` renders a model × document-type matrix over all four products: a link where `product.data.documents` includes that type, the word «готується» otherwise.

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm run build && npx vitest run --project build`
Expected: PASS, 6 tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: document pages with full HTML transcription and print stylesheet"
```

---

### Task 10: Remaining content pages

Deliverable: `/how-it-works/`, `/faq/`, `/about/`, `/contacts/`, `/privacy-policy/` — completing all 15 launch URLs.

**Files:**
- Create: `src/pages/how-it-works.astro`, `src/pages/faq.astro`, `src/pages/about.astro`, `src/pages/contacts.astro`, `src/pages/privacy-policy.astro`, 8–12 files in `src/content/faq/`
- Test: `tests/build/pages.test.ts`

**Interfaces:**
- Consumes: Tasks 2–6
- Produces: five routes

- [ ] **Step 1: Write the failing test**

`tests/build/pages.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROUTES = [
  '', 'products', 'products/bms-m', 'products/bms-pro', 'products/bms-nexus',
  'products/bms-quadro', 'how-it-works', 'documents', 'documents/bms-m/passport',
  'documents/bms-m/declaration', 'documents/bms-m/technical-conditions',
  'about', 'contacts', 'faq', 'privacy-policy',
];

describe('all launch routes', () => {
  it('emits exactly the 15 pages in the spec', () => {
    for (const r of ROUTES) {
      expect(existsSync(`dist/${r ? r + '/' : ''}index.html`), `missing /${r}/`).toBe(true);
    }
  });

  it('gives every page a canonical, a title and a description', () => {
    for (const r of ROUTES) {
      const html = readFileSync(`dist/${r ? r + '/' : ''}index.html`, 'utf8');
      expect(html, `/${r}/ canonical`).toContain('<link rel="canonical"');
      expect(html, `/${r}/ title`).toMatch(/<title>.+<\/title>/);
      expect(html, `/${r}/ description`).toMatch(/<meta name="description" content=".+"/);
    }
  });

  it('declares Ukrainian on every page', () => {
    for (const r of ROUTES) {
      const html = readFileSync(`dist/${r ? r + '/' : ''}index.html`, 'utf8');
      expect(html).toContain('<html lang="uk"');
    }
  });

  it('carries FAQPage schema on the FAQ page', () => {
    expect(readFileSync('dist/faq/index.html', 'utf8')).toContain('"FAQPage"');
  });

  it('carries LocalBusiness schema on contacts', () => {
    expect(readFileSync('dist/contacts/index.html', 'utf8')).toContain('"LocalBusiness"');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build && npx vitest run --project build`
Expected: FAIL on the missing five routes.

- [ ] **Step 3: Write the FAQ content**

8–12 entries in `src/content/faq/`, each with `question`, `models` and `order`. Cover at minimum, in Ukrainian:

1. Чи є прилади BMS медичними виробами? — answer must reproduce the disclaimer position honestly: no.
2. Які протипоказання?
3. Чим біомеханічна стимуляція відрізняється від звичайного масажера?
4. Скільки триває один сеанс? — 45 хв роботи, потім обовʼязкова пауза 15 хв.
5. Яка гарантія? — 12 місяців з дати продажу.
6. Який прилад обрати для обличчя? — BMS m or Nexus.
7. Чим BMS Nexus відрізняється від BMS pro? — two independent channels.
8. Як замовити та отримати прилад?
9. Чи зареєстровані прилади? — declaration UA.TR.D.00159-25.

Never assert therapeutic efficacy. Where a question invites a medical claim, answer with what the device does mechanically and point to a doctor.

- [ ] **Step 4: Build the five pages**

- `/how-it-works/` — method, three `<Diagram>`s, `<VideoFacade>`, application areas (косметологія / спорт / реабілітація), «Кому може бути корисним». Head: `Article` schema.
- `/faq/` — `<details>`/`<summary>` accordion, no JS. Head: `faqSchema` over all entries.
- `/about/` — `SITE.legalName`, Олександр Бабак with his quote and `babak.webp`, production, declaration facts.
- `/contacts/` — address, both phones as `tel:` links, email, hours if known. Head: `localBusinessSchema()`. No map iframe — a static image or a link out, since Task 12 forbids iframes.
- `/privacy-policy/` — port the text from `https://bms-pro.com.ua/privacy-policy/`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run build && npx vitest run --project build`
Expected: PASS, all 15 routes present.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: how-it-works, FAQ, about, contacts and privacy pages"
```

---

### Task 11: robots.txt, sitemap and OG images

Deliverable: the crawl and share layer. The current site's `og:image` is a 512 px logo, so every share and AI citation card shows a logo tile instead of a device.

**Files:**
- Create: `public/robots.txt`, `scripts/generate-og.mjs`, `public/og/*.png`
- Test: `tests/build/crawl.test.ts`

**Interfaces:**
- Consumes: product images and data
- Produces: `public/og/{default,bms-m,bms-pro,bms-nexus,bms-quadro}.png` at 1200×630

- [ ] **Step 1: Write the failing test**

`tests/build/crawl.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('robots.txt', () => {
  const robots = readFileSync('dist/robots.txt', 'utf8');

  it('keeps the AI crawler allowlist from the current site', () => {
    for (const bot of [
      'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'anthropic-ai', 'ClaudeBot',
      'claude-web', 'PerplexityBot', 'Perplexity-User', 'MistralAI-User',
      'YouBot', 'Google-Extended',
    ]) {
      expect(robots, `${bot} must stay allowed`).toContain(bot);
    }
  });

  it('still blocks AhrefsBot', () => {
    expect(robots).toMatch(/User-agent: AhrefsBot\s+Disallow: \//);
  });

  it('points at the sitemap', () => {
    expect(robots).toContain('Sitemap:');
  });
});

describe('sitemap', () => {
  it('is generated and lists the product pages', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
    const body = readFileSync('dist/sitemap-0.xml', 'utf8');
    for (const s of ['bms-m', 'bms-pro', 'bms-nexus', 'bms-quadro']) {
      expect(body).toContain(`/products/${s}/`);
    }
  });

  it('never lists the retired WooCommerce pages', () => {
    const body = readFileSync('dist/sitemap-0.xml', 'utf8');
    for (const gone of ['/cart/', '/checkout/', '/my-account/', '/shop/']) {
      expect(body).not.toContain(gone);
    }
  });
});

describe('Open Graph images', () => {
  it('gives every product its own OG image, not the logo', () => {
    for (const s of ['bms-m', 'bms-pro', 'bms-nexus', 'bms-quadro']) {
      expect(existsSync(`dist/og/${s}.png`)).toBe(true);
      const html = readFileSync(`dist/products/${s}/index.html`, 'utf8');
      expect(html).toContain(`/og/${s}.png`);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build && npx vitest run --project build`
Expected: FAIL — no `robots.txt`, no `og/`.

- [ ] **Step 3: Create `public/robots.txt`**

Port the allowlist from `https://bms-pro.com.ua/robots.txt` verbatim — it is already correct — dropping the WordPress-specific `Disallow` lines (`/wp-admin/`, `/xmlrpc.php`, `*?s=`, `/author/`) which no longer exist.

```
User-agent: *
Allow: /

# --- AI crawlers ---
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: claude-web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: MistralAI-User
Allow: /

User-agent: YouBot
Allow: /

User-agent: Google-Extended
Allow: /

# --- SEO crawlers ---
User-agent: AhrefsBot
Disallow: /

Sitemap: https://bms-pro.com.ua/sitemap-index.xml
```

- [ ] **Step 4: Write `scripts/generate-og.mjs`**

Composites the device photo onto the dark panel with the name and price. Uses sharp, already a dependency.

```js
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const W = 1200, H = 630;
const OUT = 'public/og';
mkdirSync(OUT, { recursive: true });

function frontmatter(file) {
  const raw = readFileSync(`src/content/products/${file}`, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/)[1];
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1] ?? '').replace(/^['"]|['"]$/g, '');
  return { name: get('name'), price: Number(get('price')), image: get('image') };
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function overlay(name, price) {
  const priceText = price
    ? `${String(price).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₴`
    : 'Системи біомеханічної стимуляції';
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#0E1417"/>
    <rect x="0" y="0" width="8" height="${H}" fill="#58B6FF"/>
    <text x="72" y="120" fill="#8A98A0" font-family="monospace" font-size="24" letter-spacing="6">BMS PRO</text>
    <text x="72" y="250" fill="#F2F0EB" font-family="sans-serif" font-size="86" font-weight="600">${esc(name)}</text>
    <text x="72" y="340" fill="#58B6FF" font-family="monospace" font-size="46">${esc(priceText)}</text>
    <text x="72" y="560" fill="#8A98A0" font-family="sans-serif" font-size="26">20–40 Гц · ТОВ «УКРСИСТЕМС» · Київ</text>
  </svg>`);
}

async function build(slug, name, price, imagePath) {
  const layers = [{ input: overlay(name, price) }];
  if (imagePath) {
    const photo = await sharp(`public${imagePath}`)
      .resize(440, 330, { fit: 'cover' })
      .png()
      .toBuffer();
    layers.push({ input: photo, left: W - 500, top: 150 });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: '#0E1417' } })
    .composite(layers)
    .png()
    .toFile(`${OUT}/${slug}.png`);
  console.log(`${OUT}/${slug}.png`);
}

for (const file of readdirSync('src/content/products').filter((f) => f.endsWith('.md'))) {
  const { name, price, image } = frontmatter(file);
  await build(file.replace('.md', ''), name, price, image);
}
await build('default', 'BMS Pro', 0, '/assets/img/bms-nexus-card.webp');
```

- [ ] **Step 5: Generate the images and wire them into pages**

```bash
npm run og
ls -la public/og
```

Expected: five PNGs at 1200×630. Then pass `ogImage={`/og/${product.id}.png`}` from `src/pages/products/[slug].astro` into `Base`, and commit the PNGs — they are build inputs, not build output.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run build && npx vitest run --project build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A public/og
git commit -m "feat: robots.txt with AI allowlist, per-product Open Graph images"
```

---

### Task 12: Verification harness and budgets

Deliverable: the checks that keep the promises in the spec measurable rather than aspirational. This harness caught four real bugs during mockup work.

**Files:**
- Create: `tests/build/budget.test.ts`, `tests/responsive/overflow.mjs`
- Modify: `.github/workflows/deploy.yml`, `README.md`
- Delete: `public/mockups/b/`, `public/mockups/c/`

**Interfaces:**
- Consumes: `dist/`
- Produces: `npm test` and `npm run test:responsive` as gates

- [ ] **Step 1: Write the budget test**

`tests/build/budget.test.ts`:

```ts
import { readFileSync, statSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROUTES = [
  '', 'products', 'products/bms-m', 'products/bms-nexus', 'how-it-works',
  'documents', 'about', 'contacts', 'faq',
];
const BUDGET = 60 * 1024;

function pageWeight(route: string): number {
  const dir = route ? `${route}/` : '';
  const html = readFileSync(`dist/${dir}index.html`, 'utf8');
  let total = Buffer.byteLength(html);
  for (const m of html.matchAll(/(?:href|src)="([^"]*\.(?:css|js))"/g)) {
    const p = `dist/${m[1].replace(/^\/bms-pro\//, '')}`;
    if (existsSync(p)) total += statSync(p).size;
  }
  return total;
}

describe('page weight budget', () => {
  it.each(ROUTES)('/%s/ stays under 60 KB of HTML+CSS+JS', (route) => {
    const bytes = pageWeight(route);
    expect(bytes, `/${route}/ is ${(bytes / 1024).toFixed(1)} KB`).toBeLessThan(BUDGET);
  });
});

describe('no eager third-party embeds', () => {
  it.each(ROUTES)('/%s/ ships no iframe', (route) => {
    const html = readFileSync(`dist/${route ? route + '/' : ''}index.html`, 'utf8');
    expect(html).not.toContain('<iframe');
  });
});

describe('disclaimer', () => {
  it.each(ROUTES)('/%s/ carries the medical-device disclaimer', (route) => {
    const html = readFileSync(`dist/${route ? route + '/' : ''}index.html`, 'utf8');
    expect(html).toContain('не є медичними виробами');
  });
});
```

- [ ] **Step 2: Run it to see where the site actually stands**

Run: `npm run build && npx vitest run --project build`
Expected: PASS. If a page exceeds budget, the usual cause is an unoptimised image reference or a duplicated style block — fix the page, do not raise the budget.

- [ ] **Step 3: Port the responsive harness**

`tests/responsive/overflow.mjs` — drives headless Chrome over the DevTools Protocol against `astro preview`, asserting `scrollWidth === viewport` at 360, 390 and 768 px and that no `<a>`/`<button>`/`<input>` is under 24 px tall. Skips elements inside `overflow-x: auto|scroll|hidden` ancestors, which is why the comparison matrix is not a false positive.

Reuse the working implementation from the mockup phase. It must connect with `suppress_origin` / `--remote-allow-origins=*`, or Chrome rejects the WebSocket with 403. Exit non-zero on any failure so CI can gate on it.

Run it:

```bash
npm run build
npx astro preview --port 4321 &
sleep 3
npm run test:responsive
```

Expected: `ok` at all three widths for all 15 routes.

- [ ] **Step 4: Add internal link checking**

```bash
npm run build
npx astro preview --port 4321 &
sleep 3
npx linkinator http://localhost:4321/bms-pro/ --recurse --skip 'youtube|ytimg|fonts.g'
```

Expected: zero broken links. Fix any that use a raw path instead of `url()`.

- [ ] **Step 5: Gate CI on the tests**

In `.github/workflows/deploy.yml`, insert before `upload-pages-artifact`:

```yaml
      - run: npm run check
      - run: npx vitest run
```

`npm run build` already ran, so the build-project tests have `dist/` available.

- [ ] **Step 6: Delete the superseded mockups**

Directions Б and В were reference only; their blocks now live in the real components.

```bash
git rm -r -q public/mockups/b public/mockups/c
```

Keep `public/mockups/a/` as the design reference and update `public/mockups/index.html` to link only to A, noting that B and C were retired.

- [ ] **Step 7: Rewrite `README.md`**

Replace the mockup-era content with: what the project is, the stack, `npm run dev|build|test|test:responsive|og`, the content-editing workflow (edit `src/content/products/*.md`, commit, push), the URL map, and a **Pending from the client** section listing spec §10 items 1–7 verbatim so the blockers stay visible.

- [ ] **Step 8: Commit and confirm the live deploy**

```bash
git add -A
git commit -m "test: page weight budget, responsive and link checks; retire mockups B and C"
git push origin main
gh run watch "$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

Then verify the live site:

```bash
for r in "" products/ products/bms-nexus/ documents/bms-m/passport/ faq/; do
  curl -s -o /dev/null -w "%{http_code} %{size_download}B  /$r\n" "https://deaflynx.github.io/bms-pro/$r"
done
curl -s https://deaflynx.github.io/bms-pro/products/bms-nexus/ | grep -c 'application/ld+json'
```

Expected: five `200`s, each well under 60 KB, and at least two JSON-LD blocks on the product page.

---

## Deferred to cutover

Not part of this plan. Tracked in spec §9 and to be done when the domain moves:

- Choose the production host (recommendation: Cloudflare Pages — GitHub Pages cannot issue 301s)
- Build with `SITE_URL=https://bms-pro.com.ua BASE_PATH=/`
- Configure the 301s: `/services/` → `/products/`, `/contact/` → `/contacts/`, `/shop/` and the three WooCommerce routes → `/products/`
- Point DNS, submit the sitemap in Search Console, verify redirects resolve
- Keep the WordPress install offline for one month as a rollback

## Self-review notes

**Spec coverage.** §3 direction and tokens → Tasks 2, 4, 6. §4 URL map → Tasks 7–10, verified by `tests/build/pages.test.ts`. §5.1 home → Task 7. §5.2 product pages → Task 8. §5.3 document pages → Task 9. §5.4 remaining → Task 10. §6 content model → Task 3. §7 SEO/JSON-LD → Tasks 5, 11. §8 performance and accessibility → Tasks 6, 12. §9 hosting → Task 1 for preview, deferred section for production. §10 client content → surfaced in the Task 3 note and the Task 12 README. §11 placeholders → the video note in Task 6, mockup deletion in Task 12. §12 optional selector → out of scope, unchanged.

**Naming consistency.** `url()`, `SITE`, `NAV` (Task 2) · `formatPrice`, `PRICE_NOTE` (Task 3) · `instrumentFor`, `InstrumentConfig`, `FREQ_MIN`/`FREQ_MAX` (Task 4) · `organizationSchema`, `websiteSchema`, `productSchema`, `breadcrumbSchema`, `faqSchema`, `documentSchema`, `localBusinessSchema` (Task 5). Task 6's `ComparisonMatrix` reads indicator labels through `instrumentFor` rather than duplicating the strings. Task 8's test asserts `data-channel` and `data-digital`, both emitted by Task 4's component.
