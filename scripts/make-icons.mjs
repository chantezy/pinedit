import { deflateSync, crc32 } from "node:zlib";
import fs from "node:fs";
import path from "node:path";

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const pixel = (x, y, r, g, b, a) => {
    const i = y * (size * 4 + 1) + 1 + x * 4;
    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = b;
    raw[i + 3] = a;
  };
  paint(pixel, size);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const compressed = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function pin(pixel, size) {
  const c = size / 2;
  const radius = size * 0.34;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c * 0.92;
      const dist = Math.hypot(dx, dy);
      const stem = Math.abs(dx) < size * 0.06 && y > c && y < size * 0.9;
      if (dist < radius * 0.42) pixel(x, y, 60, 141, 255, 255);
      else if (dist < radius || stem) pixel(x, y, 22, 22, 22, 255);
    }
  }
}

const root = path.resolve(import.meta.dirname, "../extension/icons");
fs.mkdirSync(root, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(root, `${size}.png`), png(size, pin));
}
const websiteStore = path.resolve(import.meta.dirname, "../../website/store");
fs.mkdirSync(websiteStore, { recursive: true });
fs.writeFileSync(path.join(websiteStore, "logo-300.png"), png(300, pin));
