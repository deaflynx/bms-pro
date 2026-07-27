/**
 * Generates 1200x630 Open Graph images, one per product plus a default.
 *
 * The current WordPress site uses a 512px cropped logo as og:image, so every
 * share on Telegram, Viber and Facebook — and every AI citation card — shows a
 * logo tile instead of the device. These composite the real device photo onto
 * the instrument-panel background with the name and price.
 *
 * Run with `npm run og`. Output is committed: it is a build input, not output.
 */
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import sharp from 'sharp';

const W = 1200;
const H = 630;
const OUT = 'public/og';

const PANEL = '#0e1417';
const LED = '#58b6ff';
const PAPER = '#f2f0eb';
const STEEL = '#8a98a0';

mkdirSync(OUT, { recursive: true });

function frontmatter(file) {
  const raw = readFileSync(`src/content/products/${file}`, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/)[1];
  const get = (k) =>
    (fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1] ?? '').replace(/^['"]|['"]$/g, '').trim();
  return { name: get('name'), price: Number(get('price')), image: get('image') };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function groupThousands(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Text column is 76..640px — the photo card starts at 700. Shrink long names to fit. */
const TEXT_MAX = 564;

function overlay(name, price) {
  // rough advance width for the bold sans at a given size
  const size = Math.min(82, Math.floor(TEXT_MAX / (name.length * 0.56)));
  const priceLine = price ? `${groupThousands(price)} ₴` : '20–40 Гц';
  const noteLine = price ? 'орієнтовна ціна' : 'регульована частота';

  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${PANEL}"/>
  <rect x="0" y="0" width="10" height="${H}" fill="${LED}"/>
  <text x="76" y="118" fill="${STEEL}" font-family="monospace" font-size="26" letter-spacing="7">BMS PRO</text>
  <text x="76" y="262" fill="${PAPER}" font-family="'DejaVu Sans',sans-serif" font-size="${size}" font-weight="700">${esc(name)}</text>
  <text x="76" y="344" fill="${LED}" font-family="monospace" font-size="46">${esc(priceLine)}</text>
  <text x="76" y="384" fill="${STEEL}" font-family="'DejaVu Sans',sans-serif" font-size="24">${esc(noteLine)}</text>
  <text x="76" y="566" fill="${STEEL}" font-family="'DejaVu Sans',sans-serif" font-size="25">20–40 Гц · ТОВ «УКРСИСТЕМС» · Київ</text>
</svg>`);
}

async function build(slug, name, price, imagePath) {
  const layers = [{ input: overlay(name, price) }];

  if (imagePath) {
    const photo = await sharp(`public${imagePath}`)
      .resize(430, 322, { fit: 'cover' })
      .composite([
        {
          // rounded corners, so the photo reads as a card rather than a raw crop
          input: Buffer.from(
            `<svg width="430" height="322"><rect width="430" height="322" rx="14" fill="#fff"/></svg>`,
          ),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();
    layers.push({ input: photo, left: W - 500, top: 154 });
  }

  await sharp({ create: { width: W, height: H, channels: 4, background: PANEL } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${slug}.png`);

  console.log(`${OUT}/${slug}.png`);
}

const files = readdirSync('src/content/products').filter((f) => f.endsWith('.md'));
for (const file of files) {
  const { name, price, image } = frontmatter(file);
  await build(file.replace('.md', ''), name, price, image);
}
await build('default', 'Біомеханічна стимуляція', 0, '/assets/img/bms-nexus-card.webp');
