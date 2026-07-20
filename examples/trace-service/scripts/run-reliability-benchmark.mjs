import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { createSharpCodec } from '../src/sharp-codec.mjs';

const require = createRequire(import.meta.url);
const {
  createInvisibleWatermarkRuntime,
} = require('../../../trace-runtime.js');
const runtime = createInvisibleWatermarkRuntime({ codec: createSharpCodec() });
const key = '0123456789abcdef';
const width = 512;
const height = 352;
const pixels = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 4;
    pixels[index] = (x * 3 + y) % 256;
    pixels[index + 1] = (x + y * 2 + 37) % 256;
    pixels[index + 2] = (x * 2 + y * 3 + 91) % 256;
    pixels[index + 3] = 255;
  }
}
const source = await sharp(pixels, {
  raw: { width, height, channels: 4 },
})
  .png()
  .toBuffer();
const marked = await runtime.embedInvisible({
  image: { src: source },
  payload: 'bench-42',
  key,
  strength: 'robust',
  saveFormat: 'png',
});

/** @type {Array<{ name: string; image: Buffer; key?: string }>} */
const candidates = [
  { name: 'png', image: marked },
  {
    name: 'jpeg-90',
    image: await sharp(marked).jpeg({ quality: 90 }).toBuffer(),
  },
  {
    name: 'jpeg-75',
    image: await sharp(marked).jpeg({ quality: 75 }).toBuffer(),
  },
  {
    name: 'jpeg-60',
    image: await sharp(marked).jpeg({ quality: 60 }).toBuffer(),
  },
];
for (const scale of [0.9, 0.95, 1.05, 1.1]) {
  candidates.push({
    name: `scale-${scale}`,
    image: await sharp(marked)
      .resize(Math.round(width * scale), Math.round(height * scale))
      .png()
      .toBuffer(),
  });
}
candidates.push(
  {
    name: 'jpeg-75-scale-0.95',
    image: await sharp(marked)
      .jpeg({ quality: 75 })
      .resize(Math.round(width * 0.95), Math.round(height * 0.95))
      .png()
      .toBuffer(),
  },
  {
    name: 'crop-8px',
    image: await sharp(marked)
      .extract({ left: 8, top: 8, width: width - 16, height: height - 16 })
      .png()
      .toBuffer(),
  },
  { name: 'wrong-key', image: marked, key: 'fedcba9876543210' },
  { name: 'unmarked', image: source }
);

const results = [];
for (const candidate of candidates) {
  const result = await runtime.detectInvisible({
    image: { src: candidate.image },
    key: candidate.key ?? key,
    strength: 'robust',
    search: 'robust',
  });
  results.push({ name: candidate.name, ...result });
}

const report = {
  generatedAt: new Date().toISOString(),
  algorithm: 'dct-qim-v1',
  source: { width, height },
  results,
};
const output = new URL('../benchmark-report.json', import.meta.url);
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${output.pathname}`);
