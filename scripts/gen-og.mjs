import sharp from 'sharp';
import fs from 'fs';

const svg = fs.readFileSync('public/og-image.svg', 'utf-8');
await sharp(Buffer.from(svg)).png().toFile('public/og-image.png');
console.log('og-image.png generated');
