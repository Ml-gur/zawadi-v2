import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const LOGO = path.resolve('Techsari logo.png');

// The hexagon mark occupies roughly x 110..400, y 340..660 of the 1024px
// master logo. Crop it once, then compose onto brand-black squares.
const MARK = { left: 100, top: 365, width: 258, height: 300 };
const BRAND_BG = '#0a0a08';

async function generateIcon(size, name, { maskable = false } = {}) {
  const mark = await sharp(LOGO)
    .extract(MARK)
    .resize(size, size, {
      fit: 'contain',
      // Maskable icons need the mark inside the inner 80% safe zone
      background: BRAND_BG,
    })
    .toBuffer();

  const scale = maskable ? 0.72 : 0.86;
  const inner = Math.round(size * scale);
  const offset = Math.round((size - inner) / 2);

  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: await sharp(mark).resize(inner, inner).toBuffer(), left: offset, top: offset }])
    .png()
    .toFile(path.join(publicDir, name));

  console.log(`Generated ${name} (${size}x${size}${maskable ? ', maskable' : ''})`);
}

async function main() {
  if (!fs.existsSync(LOGO)) throw new Error(`Brand logo not found at ${LOGO}`);
  await generateIcon(192, 'pwa-icon-192.png');
  await generateIcon(512, 'pwa-icon-512.png');
  await generateIcon(512, 'pwa-icon-512-maskable.png', { maskable: true });
}

main().catch((err) => { console.error(err); process.exit(1); });
