import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');

function createSVG(width, height, maskable) {
  const r = Math.round(width * 0.16);
  const cx = width / 2;
  const cy = height / 2;
  const fontSize = Math.round(height * 0.55);
  const starR = Math.round(height * 0.12);
  const starX = Math.round(width * 0.75);
  const starY = Math.round(height * 0.28);
  const rx = maskable ? Math.round(width * 0.25) : r;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" rx="${rx}" fill="#001736"/>
    <text x="${cx}" y="${Math.round(cy + fontSize * 0.35)}" font-family="Georgia,serif" font-size="${fontSize}" font-weight="bold" fill="#6cf8bb" text-anchor="middle">Z</text>
    <circle cx="${starX}" cy="${starY}" r="${starR}" fill="#f59e0b"/>
  </svg>`;
}

async function generateIcon(size, name, maskable = false) {
  const svg = createSVG(size, size, maskable);
  const pngPath = path.join(publicDir, name);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(pngPath);
  console.log(`Generated ${name} (${size}x${size})`);
}

async function main() {
  await generateIcon(192, 'pwa-icon-192.png');
  await generateIcon(512, 'pwa-icon-512.png');
  await generateIcon(512, 'pwa-icon-512-maskable.png', true);
}

main().catch(console.error);
