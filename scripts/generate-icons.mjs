/**
 * Generates the favicon set and the structured-data logo from the square logo.
 *
 * Google Search accepts BMP, GIF, ICO, JPEG, PNG, PPM and TIFF for favicons —
 * not WebP, which is what the source logo is — so the icons are emitted as PNG
 * and wrapped in an ICO for /favicon.ico, which browsers and crawlers request
 * whether or not the page declares one.
 *
 * /logo.png is the same source at 512 px, referenced as the Organization
 * `logo` in JSON-LD. The lockup is not usable there: its wordmark is white and
 * disappears on the light background a knowledge panel draws.
 *
 * Run with `npm run icons`. Output is committed: it is a build input.
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'public/assets/img/logo.webp';
const OUT = 'public';

async function png(size) {
  return sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 14, g: 20, b: 23, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** ICO container holding a single PNG frame — the format allows PNG since Vista. */
function ico(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // palette colours
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

const favicon = await png(96);
writeFileSync(`${OUT}/favicon.png`, favicon);
writeFileSync(`${OUT}/favicon.ico`, ico(await png(48), 48));
writeFileSync(`${OUT}/apple-touch-icon.png`, await png(180));
writeFileSync(`${OUT}/logo.png`, await png(512));

for (const f of ['favicon.png', 'favicon.ico', 'apple-touch-icon.png', 'logo.png']) {
  console.log(`${OUT}/${f}`);
}
