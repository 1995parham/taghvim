// Draws the toolbar icon (a small calendar page) as PNG files with no dependencies.
// Run: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y);
      raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const inRound = (u, v, x0, y0, x1, y1, r) => {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false;
  const cx = Math.min(Math.max(u, x0 + r), x1 - r);
  const cy = Math.min(Math.max(v, y0 + r), y1 - r);
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
};

// Shape in unit coordinates (0..1). Returns RGBA or null.
function shade(u, v) {
  if (!inRound(u, v, 0.06, 0.1, 0.94, 0.94, 0.14)) return null;
  if (v < 0.36) return [217, 48, 37]; // red header
  // grid of dots for the days
  const gx = (u - 0.2) / 0.15, gy = (v - 0.47) / 0.14;
  const ix = Math.round(gx), iy = Math.round(gy);
  if (ix >= 0 && ix <= 4 && iy >= 0 && iy <= 3 && (gx - ix) ** 2 + (gy - iy) ** 2 < 0.12) {
    return ix === 4 ? [217, 48, 37] : [26, 115, 232];
  }
  return [255, 255, 255];
}

for (const size of [16, 32, 48, 128]) {
  const ss = 4;
  const buf = png(size, (x, y) => {
    let r = 0, g = 0, b = 0, a = 0;
    for (let i = 0; i < ss; i += 1) for (let j = 0; j < ss; j += 1) {
      const c = shade((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a += 1; }
    }
    if (!a) return [0, 0, 0, 0];
    return [r / a, g / a, b / a, Math.round((255 * a) / (ss * ss))].map(Math.round);
  });
  writeFileSync(new URL(`../extension/icons/icon-${size}.png`, import.meta.url), buf);
}
console.log('icons written');
