// Generate minimal PNG PWA icons (pure Node.js, no deps)
import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  // Minimal PNG with solid background + letter "Z" as colored rectangle
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(require('buffer').constants ? crc32(crcData) : crc32(crcData));
    return Buffer.concat([len, crcData, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT - raw pixel data with filter byte 0 per row
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      const cx = x / width;
      const cy = y / height;
      // Dark navy background
      raw[px] = r; raw[px+1] = g; raw[px+2] = b;
      // Gold accent circle top-right
      const acx = cx - 0.75, acy = cy - 0.25;
      if (acx*acx + acy*acy < 0.035) {
        raw[px] = 245; raw[px+1] = 158; raw[px+2] = 11; // gold
      }
      // Green "Z" letterform
      const zx = cx - 0.5, zy = cy - 0.55;
      const zW = 0.32, zH = 0.32;
      if (Math.abs(zy) < zH/2 && Math.abs(zx) < zW/2) {
        // Simple Z shape
        const inZ = (
          (zy < -zH/3) || // top bar
          (zy > zH/3) ||  // bottom bar
          Math.abs(zy - zx * (zH/zW)) < 0.04 // diagonal
        );
        if (inZ) {
          raw[px] = 108; raw[px+1] = 248; raw[px+2] = 187; // green
        }
      }
    }
  }

  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
const sizes = [
  [192, 192, 'pwa-icon-192.png'],
  [512, 512, 'pwa-icon-512.png'],
  [512, 512, 'pwa-icon-512-maskable.png'],
];

const publicDir = new URL('../public', import.meta.url).pathname;

for (const [w, h, name] of sizes) {
  const png = createPNG(w, h, 0, 23, 54); // #001736 navy
  fs.writeFileSync(new URL(name, import.meta.url).pathname.replace('/scripts/', '/public/'), png);
  console.log(`Generated ${name} (${w}x${h})`);
}
