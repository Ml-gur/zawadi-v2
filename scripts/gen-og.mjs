import sharp from 'sharp';
import fs from 'fs';

const images = [
  'og-image', 'og-home', 'og-scholarships', 'og-faq',
  'og-about', 'og-how-it-works'
];

for (const name of images) {
  const svgPath = `public/${name}.svg`;
  const pngPath = `public/${name}.png`;
  if (fs.existsSync(svgPath)) {
    const svg = fs.readFileSync(svgPath, 'utf-8');
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    console.log(`${pngPath} generated`);
  } else {
    console.warn(`SKIP: ${svgPath} not found`);
  }
}
