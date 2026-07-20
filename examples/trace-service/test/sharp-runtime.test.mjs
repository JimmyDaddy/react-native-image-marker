import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import sharp from 'sharp';
import { createSharpCodec } from '../src/sharp-codec.mjs';

const require = createRequire(import.meta.url);
const {
  createInvisibleWatermarkRuntime,
} = require('../../../trace-runtime.js');
const KEY = '0123456789abcdef';

function createPixels(width = 256, height = 176) {
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
  return { pixels, width, height };
}

/** @param {number} [width] @param {number} [height] */
async function sourcePng(width, height) {
  const source = createPixels(width, height);
  return sharp(source.pixels, {
    raw: { width: source.width, height: source.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

test('sharp codec normalizes to RGBA without enlarging past maxSize', async () => {
  const codec = createSharpCodec();
  const decoded = await codec.decode(await sourcePng(), { maxSize: 160 });
  assert.equal(decoded.width, 160);
  assert.equal(decoded.height, 110);
  assert.equal(decoded.data.length, decoded.width * decoded.height * 4);
});

test('Node runtime round-trips PNG and JPEG 75 through sharp', async () => {
  const runtime = createInvisibleWatermarkRuntime({
    codec: createSharpCodec(),
  });
  const source = await sourcePng();

  /** @type {Array<['png' | 'jpg', number]>} */
  const outputs = [
    ['png', 100],
    ['jpg', 75],
  ];
  for (const [saveFormat, quality] of outputs) {
    const marked = await runtime.embedInvisible({
      image: { src: source },
      payload: 'asset-42',
      key: KEY,
      strength: 'robust',
      saveFormat,
      quality,
    });
    const result = await runtime.detectInvisible({
      image: { src: marked },
      key: KEY,
      strength: 'robust',
      search: 'robust',
    });
    assert.equal(result.detected, true, `${saveFormat} should be detected`);
    assert.equal(result.payload, 'asset-42');
  }
});

test('wrong keys and unmarked images do not produce false positives', async () => {
  const runtime = createInvisibleWatermarkRuntime({
    codec: createSharpCodec(),
  });
  const source = await sourcePng();
  const marked = await runtime.embedInvisible({
    image: { src: source },
    payload: 'asset-42',
    key: KEY,
    strength: 'robust',
    saveFormat: 'png',
  });

  const wrongKey = await runtime.detectInvisible({
    image: { src: marked },
    key: 'fedcba9876543210',
    strength: 'robust',
    search: 'robust',
  });
  const unmarked = await runtime.detectInvisible({
    image: { src: source },
    key: KEY,
    strength: 'robust',
    search: 'robust',
  });
  assert.equal(wrongKey.detected, false);
  assert.equal(unmarked.detected, false);
});

test('robust search recovers sharp resize candidates', async () => {
  const runtime = createInvisibleWatermarkRuntime({
    codec: createSharpCodec(),
  });
  const width = 512;
  const height = 352;
  const source = await sourcePng(width, height);
  const marked = await runtime.embedInvisible({
    image: { src: source },
    payload: 'scale-42',
    key: KEY,
    strength: 'robust',
    saveFormat: 'png',
  });

  for (const scale of [0.9, 0.95, 1.05, 1.1]) {
    const resized = await sharp(marked)
      .resize(Math.round(width * scale), Math.round(height * scale))
      .png()
      .toBuffer();
    const result = await runtime.detectInvisible({
      image: { src: resized },
      key: KEY,
      strength: 'robust',
      search: 'robust',
    });
    assert.equal(result.detected, true, `${scale}x should be detected`);
    assert.equal(result.payload, 'scale-42');
    assert.equal(result.scale, scale);
  }
});
