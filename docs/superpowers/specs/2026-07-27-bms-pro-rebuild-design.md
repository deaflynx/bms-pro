# bms-pro.com.ua — rebuild design

**Date:** 2026-07-27
**Status:** approved for planning
**Repo:** github.com/deaflynx/bms-pro · previews at https://deaflynx.github.io/bms-pro/

## 1. Goal

Replace the WordPress site at bms-pro.com.ua with a static Astro site that:

1. **Sells four devices.** Each of BMS m / pro / Nexus / Quadro gets its own URL, its own
   `Product` schema, and can be an ad landing page. Today all four share `/services/`.
2. **Is citable by AI search.** Full JSON-LD coverage, document text as HTML rather than
   PDF-only, and an FAQ page. Today the site has zero structured data.
3. **Converts to a phone call.** No cart, no checkout. Primary action is `tel:+380505460077`.
4. **Is fast.** The current homepage ships 690 KB of HTML; `/services/` ships 1.0 MB.

### Non-goals

- No online payment, cart, or checkout. WooCommerce is dropped entirely.
- No CMS. Content lives in the repo as Astro content collections, edited via git.
- No English version. Ukrainian only (`lang="uk"`), no locale prefix, no hreflang.
- No blog at launch. The route is left free for later.

## 2. Baseline

Measured on 2026-07-27 against the live site.

| | Current WordPress | Target |
|---|---|---|
| Homepage HTML | 689 948 B | < 60 KB |
| `/services/` HTML | 1 016 004 B | < 60 KB |
| Inline CSS on homepage | ~601 KB across 23 `<style>` blocks | 0 (one external file) |
| External CSS / JS requests | 18 / 22 | 1 / 1 |
| JSON-LD blocks | 0 | every page |
| Indexable content pages | 3 | 15 at launch, 24 once all documents land |
| Pages per product | 0 | 1 |

Stack being replaced: WordPress + Astra theme + Spectra (Ultimate Addons for Gutenberg) +
WooCommerce + Contact Form 7. The page weight is Spectra's doing — it emits per-block CSS
inline on every request.

**Carry forward unchanged:** the existing `robots.txt` AI-crawler allowlist. It already
explicitly allows GPTBot, ChatGPT-User, OAI-SearchBot, anthropic-ai, ClaudeBot, claude-web,
PerplexityBot, Perplexity-User, MistralAI-User, YouBot and Google-Extended, and blocks
AhrefsBot. It is correct and stays.

## 3. Design direction

Direction **A «Частота»** from the mockups, at `mockups/a/`. Directions Б and В are
reference only and will be deleted from the repo once the real site lands.

Two blocks are lifted from direction В into A:

- the **4-model comparison matrix** (dense table, sticky first column, highlighted price row)
- the **specs + documents block** (8 spec tiles, document list, registration data)

### Tokens

Taken from `mockups/a/index.html`, which is the source of truth for the design system.

```
--panel      #0E1417   instrument charcoal, page background
--panel-2    #151E23   raised surfaces
--panel-3    #1D282E   instrument face
--led        #58B6FF   the blue of the device's 7-segment indicator; primary accent
--led-glow   #A9DEFF
--amber      #F0A93B   potentiometer accent, warnings, PDF badges
--steel      #8A98A0   muted text
--paper      #F2F0EB   body text
```

Type: **Oswald** 400/500/600 (display, condensed, reads as equipment labelling) ·
**Onest** 400/500/700 (body, Cyrillic-first grotesque) · **JetBrains Mono** 500/700
(data, readouts, labels). All three carry Cyrillic — verified against the Google Fonts
subsets actually served.

The palette and typography are derived from the product itself: the LED blue is the colour
of the digital indicator on BMS pro and Nexus, and the amber is the potentiometer. This is
deliberate — the generic "clean med-tech teal" look is the default answer for any medical
product and was rejected.

### Signature element: the frequency instrument

The interactive 20–40 Hz control with a 7-segment readout and live waveform. Built as one
component, configured per device — this is what differentiates the models better than any
spec row:

| Model | Instrument configuration |
|---|---|
| BMS m | one analog knob, no digital readout |
| BMS pro | one digital readout |
| BMS Nexus | two independent dials and two readouts, separately adjustable |
| BMS Quadro | roller unit |

On the homepage it appears in the hero unconfigured (generic 20–40 Hz). On each product
page it appears configured for that device. A visitor comparing Nexus at 48 000 ₴ against
pro at 32 000 ₴ can operate two channels at two frequencies simultaneously and see the
difference immediately.

Implementation: a real `<input type="range">` (keyboard accessible), SVG 7-segment digits,
SVG waveform path regenerated on input, CSS translate loop for the scroll animation,
suppressed under `prefers-reduced-motion`.

## 4. URL map

15 pages at launch, every one a real indexable URL. Grows to 24 as the remaining models'
documents arrive (3 document types × 4 models).

```
/                                          Головна
/products/                                 Прилади — catalogue + comparison matrix
/products/bms-m/                           24 000 ₴ · обличчя, шия
/products/bms-pro/                         32 000 ₴ · шия, спина
/products/bms-nexus/                       48 000 ₴ · обличчя, шия, спина
/products/bms-quadro/                      83 000 ₴ · спина
/how-it-works/                             Метод + сфери застосування + кому корисно
/documents/                                Документи — model × document-type matrix
/documents/bms-m/passport/                 Паспорт BMS m
/documents/bms-m/declaration/              Декларація відповідності BMS m
/documents/bms-m/technical-conditions/     Технічні умови BMS m
/about/                                    ТОВ «УКРСИСТЕМС», Олександр Бабак
/contacts/                                 Контакти
/faq/                                      Питання та відповіді
/privacy-policy/                           Політика конфіденційності
```

**Document URLs are `/documents/<model>/<doc-type>/`** — model first. Each model has its
own document set, so this scales to 12 pages without restructuring. At launch only BMS m
has documents; the `/documents/` hub lists the other models' rows as «готується» rather
than linking to empty pages.

Decisions already taken and not to be revisited:

- «Сфери застосування» and «Кому корисно» live inside `/how-it-works/`, not as a separate
  page — the content is ~150 words per vertical, too thin to stand alone.
- Prices are public, labelled «орієнтовна ціна».
- Document contents are HTML text, not PDF-only. PDFs are supplementary downloads.

### Navigation

```
Прилади ▾   Як це працює   Документи ▾   Про нас   Контакти      [ ☎ +380 50 546 00 77 ]
```

The phone button is sticky on scroll. Below 700 px it is replaced by a fixed bottom bar
with **Зателефонувати** and **Прилади** — the single most important conversion element on
the site, since there is no cart.

The current nav is inverted: three of its five slots are compliance documents and the
products appear nowhere.

## 5. Page templates

### 5.1 Home

Hero with the frequency instrument → spec ticker (20–40 Гц · ≤20 Вт · II клас · 45/15 хв ·
12 міс) → product lineup, 4 cards → **comparison matrix** (from В) → «Принцип дії» with
three SVG diagrams and the video → **specs + documents block** (from В) → manufacturer and
declaration → call CTA → disclaimer.

### 5.2 Product page

Breadcrumbs → split hero (gallery left; zone eyebrow, `h1`, price, four fact chips, phone
CTA, trust line right) → **frequency instrument configured for this model** → комплектація
→ технічні характеристики tiles → документи цього приладу → comparison matrix with this
model's column highlighted → model-specific FAQ → call CTA → disclaimer.

The highlighted comparison matrix is the internal linking that makes all four product pages
rank together instead of cannibalising each other.

### 5.3 Document page

Ported from `volodymyr-babak.github.io/bms-pro/{passport,declaration,specifications}.html`,
which already transcribes the full passport (10 sections) and ТУ (8 sections) into HTML
with spec tables, a troubleshooting table and warranty terms. That transcription is the
most valuable existing asset in either repo and is reused verbatim.

Template: breadcrumbs → `h1` → lead with the formal designation → sticky table of contents
→ «Завантажити PDF» + «Друкувати» → metadata table → numbered sections → disclaimer.

A `print.css` is included so «Друкувати» produces a clean printout, matching the reference
implementation.

The declaration is a scan image (`declar.png`, 391 KB), not a PDF — its page shows the
image with «Відкрити в повному розмірі», plus the registration facts as HTML text.

`tu-bms-m.pdf` is 5.0 MB and is linked as-is, per decision. The HTML transcription is the
primary route; the PDF is the supplement.

### 5.4 Remaining pages

`/how-it-works/` — method, three effect diagrams, video, application areas, who it suits.
`/faq/` — 8–12 questions with `FAQPage` schema.
`/about/` — ТОВ «УКРСИСТЕМС», Олександр Бабак with his quote, production.
`/contacts/` — address, phones, email, static map image, consultation form.
`/privacy-policy/` — ported from the current site.

## 6. Content model

Astro content collections, Zod-validated:

- **`products`** — `slug`, `name`, `tagline`, `zones[]`, `price`, `channels`,
  `indicator` (`analog` | `digital` | `dual-digital` | `roller`), `usage`, `images[]`,
  `specs{}`, `included[]`, `faq[]`, `documents{}`, `order`
- **`documents`** — `model`, `type` (`passport` | `declaration` | `technical-conditions`),
  `title`, `designation`, `pdf`, `sections[]`
- **`faq`** — `question`, `answer`, `models[]`

Product data drives the cards, the matrix, the product pages and the `Product` schema from
one source, so a price change is a one-line edit.

### Known product data

| Model | Price | Zone | Channels | Indicator | Usage |
|---|---|---|---|---|---|
| BMS m | 24 000 ₴ | обличчя, шия | 1 | analog | дім |
| BMS pro | 32 000 ₴ | шия, спина | 1 | digital | дім, салон |
| BMS Nexus | 48 000 ₴ | обличчя, шия, спина | 2 | dual-digital | салон, кабінет |
| BMS Quadro | 83 000 ₴ | спина | roller unit | digital | кабінет, реабілітація |

Channel counts and indicator types are **inferred from the product photographs**, not from
supplied data, and must be confirmed.

Specs from the BMS m passport: ≤20 Вт · 20–40 Гц · 110–235 В, 50–60 Гц · кут повороту
головки 40–44° · ≤55 дБА · 45 хв роботи / 15 хв пауза · II клас електробезпеки ·
гарантія 12 міс · середовище +5…+40 °С.

### Organisation facts

- Manufacturer and seller of record: **ТОВ «УКРСИСТЕМС»** — canonical in schema and footer
- Declaration: **UA.TR.D.00159-25**, registered 24.07.2025
- ТУ: **ТУ У 27.9-2294811615-001:2025**, developer ФОП Бабак О. В., ДКПП 27.90.1, УКНД 97.170
- Official product designation: «Стимулятор біомеханічний BMS (m, Pro)»
- Address: 02099, м. Київ, вул. Бориспільська 11а, оф. 206
- Phones: **+380 50 546 00 77** (primary, all CTAs), +380 68 546 00 77
- Email: stymulation.kyiv@gmail.com

## 7. SEO and AI-search layer

The largest gap in the current site — it has no structured data at all.

| Page | JSON-LD |
|---|---|
| all | `Organization` (once, sitewide), `BreadcrumbList` |
| `/` | `WebSite`, `Organization` |
| `/products/` | `ItemList` of the 4 products |
| `/products/<model>/` | `Product` + `Offer` (price, `priceCurrency: UAH`, availability), `brand`, `manufacturer`, `FAQPage` |
| `/how-it-works/` | `Article` |
| `/faq/` | `FAQPage` |
| `/documents/<model>/<type>/` | `DigitalDocument` |
| `/contacts/` | `LocalBusiness` with `postalAddress`, `telephone`, `geo` |

Also: `@astrojs/sitemap` excluding nothing (there is nothing to exclude — the WooCommerce
cart/checkout/my-account pages that currently leak into the sitemap are gone); canonical on
every page; per-page `title` and `description`; and **real Open Graph images** — the current
`og:image` is a 512 px cropped logo, so every share on Telegram, Viber and Facebook and
every AI citation card shows a logo tile instead of the device. Each product page gets its
own OG image.

## 8. Performance and accessibility

Budgets, enforced by measurement rather than intention:

- HTML + CSS + JS per page: **< 60 KB** (mockup A is 29 KB, so this is achievable)
- One stylesheet, one script. No framework runtime — Astro ships zero JS by default; only
  the instrument and the video facade are interactive.
- **YouTube as a click-to-load facade.** A YouTube iframe pulls ~1 MB of player JS. The
  facade shows the thumbnail and injects the iframe on click. Verified in the mockups:
  zero `<iframe>` elements on first load.
- Images via `astro:assets` — WebP, explicit dimensions, `loading="lazy"` below the fold,
  `fetchpriority="high"` on the hero.
- `scrollWidth == viewport` at 360, 390 and 768 px. This was verified via the DevTools
  Protocol during mockup work and caught four real bugs; the same check runs against the
  real site.
- No tap target under 24 px. Visible keyboard focus. `prefers-reduced-motion` respected.
- Every SVG diagram carries `role="img"` and an `aria-label` describing what it shows.

## 9. Hosting and cutover

**Development and preview:** GitHub Pages from this repo, via GitHub Actions building Astro.

**Production:** to be decided, but **not GitHub Pages** — it cannot issue 301 redirects, and
`/services/` has accumulated ranking that must be preserved. Recommendation is Cloudflare
Pages (free, real 301s, custom headers, good latency in Ukraine). The Astro build is plain
static output, so the host is swappable and this decision does not block the build.

### Redirects required at cutover

| From | To | Code |
|---|---|---|
| `/services/` | `/products/` | 301 |
| `/contact/` | `/contacts/` | 301 |
| `/shop/` | `/products/` | 301 |
| `/cart/`, `/checkout/`, `/my-account/` | `/products/` | 301 |
| `/privacy-policy/` | unchanged | — |

The current nav's Паспорт / Декларація / Технічні умови are `#anchors` on `/`, so they need
no server redirect — fragments are never sent to the server. This is also precisely why
those high-intent queries currently have no page to rank: fixing that is a core goal here.

### Cutover sequence

1. Build and review on GitHub Pages (draft pages carry `noindex`).
2. Move `tu-bms-m.pdf`, `passport-bms-m.pdf`, `declar.png` into the repo.
3. Deploy to production host with redirects in place; remove `noindex`.
4. Point DNS. Submit the new sitemap in Search Console; confirm the redirects resolve.
5. Keep the WordPress install available but offline for one month as a rollback.

## 10. Content the client must supply

Ordered by how much each blocks launch.

1. **Distinct copy per model.** All four currently share one sentence, and BMS pro and
   BMS Quadro are both described only as «мʼязи спини». Four pages with identical text
   compete with each other in search and give an AI engine nothing to tell them apart.
   One or two differentiating sentences each. **Hard blocker for real product pages.**
2. **Confirmation of the inferred data** — channel counts and indicator types per model,
   and whether Quadro is intended for clinics rather than home use.
3. **Passport, declaration and ТУ for BMS pro, Nexus and Quadro.** Assumed to exist per
   model. Until supplied, those rows in `/documents/` read «готується».
4. **Product photographs on a plain background.** Every current shot is a phone photo on a
   cluttered workbench. For devices at 24 000–83 000 ₴ this is the single biggest thing
   limiting perceived quality, and it caps what any design can achieve. **BMS Quadro is
   urgent** — its photo reads as a grey 3D-printed prototype housing.
5. **A larger photo of Олександр Бабак.** The current file is 147×147 px, unusable on
   `/about/`.
6. **The logo as SVG.** The current file is a 512×512 raster of a chrome-gradient swoosh.
   It sits in the header of every page and is the weakest element on screen.
7. **Own Ukrainian-language video.** The mockups embed a third-party Russian-language
   placeholder (`VV3J9_Tyth4`), which must not ship on a commercial page.

## 11. Interim placeholders in the repo

Recorded so they are not mistaken for finished work:

- `assets/img/bms-face-illustration.svg` — a custom SVG silhouette drawn for this project
  (3.2 KB, no licence encumbrance). Created because photographic image generation was
  unavailable and the freely-licensed stock found via Openverse, Pexels and Unsplash was
  unusable. Used in directions Б and В only; **not used in direction A**, so it does not
  ship unless we choose to add it.
- The YouTube placeholder above.
- `mockups/b/` and `mockups/c/` — reference only, to be deleted once the Astro site lands.

## 12. Open question

Optional, not blocking: a short **«Який прилад вам потрібен?»** selector on `/products/` —
two or three questions (zone, home or clinic) that recommend a model. For a 4-SKU lineup
where the models are easy to confuse this converts well. Excluded from scope unless
requested.
