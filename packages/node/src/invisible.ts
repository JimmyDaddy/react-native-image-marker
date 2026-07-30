/* eslint-disable no-bitwise */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { sourceToSharpInput, throwIfAborted } from './source';
import type {
  NodeInvisibleDetectOptions,
  NodeInvisibleDetectionResult,
  NodeInvisibleEmbedOptions,
  NodeRenderResult,
} from './types';

type SharpFactory = typeof import('sharp').default;

const ALGORITHM = 'lsb-hmac-v1' as const;
const MAGIC = Buffer.from('IMN1');
const FRAME_BYTES = 80;
const PAYLOAD_OFFSET = 5;
const MAX_PAYLOAD_BYTES = 64;
const MAC_OFFSET = PAYLOAD_OFFSET + MAX_PAYLOAD_BYTES;
const MAC_BYTES = 8;
const REPEATS = 3;

function normalizeKey(value: string | Buffer): Buffer {
  const key = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  if (key.length < 16) {
    throw new Error('Invisible locator key must contain at least 16 bytes.');
  }
  return key;
}

function createFrame(payload: string, key: Buffer): Buffer {
  const payloadBytes = Buffer.from(payload, 'utf8');
  if (payloadBytes.length === 0 || payloadBytes.length > MAX_PAYLOAD_BYTES) {
    throw new Error(
      `Invisible locator payload must contain 1-${MAX_PAYLOAD_BYTES} UTF-8 bytes.`
    );
  }
  const frame = Buffer.alloc(FRAME_BYTES);
  MAGIC.copy(frame, 0);
  frame[4] = payloadBytes.length;
  payloadBytes.copy(frame, PAYLOAD_OFFSET);
  createHmac('sha256', key)
    .update(frame.subarray(0, MAC_OFFSET))
    .digest()
    .copy(frame, MAC_OFFSET, 0, MAC_BYTES);
  return frame;
}

function decodeFrame(
  frame: Buffer,
  key: Buffer,
  confidence: number
): NodeInvisibleDetectionResult {
  const payloadLength = frame[4] ?? 0;
  const validLength = payloadLength > 0 && payloadLength <= MAX_PAYLOAD_BYTES;
  const expected = createHmac('sha256', key)
    .update(frame.subarray(0, MAC_OFFSET))
    .digest()
    .subarray(0, MAC_BYTES);
  const actual = frame.subarray(MAC_OFFSET, MAC_OFFSET + MAC_BYTES);
  const detected =
    frame.subarray(0, MAGIC.length).equals(MAGIC) &&
    validLength &&
    actual.length === expected.length &&
    timingSafeEqual(actual, expected);
  return {
    detected,
    payload: detected
      ? frame
          .subarray(PAYLOAD_OFFSET, PAYLOAD_OFFSET + payloadLength)
          .toString('utf8')
      : undefined,
    confidence: detected ? confidence : 0,
    algorithm: ALGORITHM,
  };
}

function positionSeed(key: Buffer, width: number, height: number): Buffer {
  return createHmac('sha256', key)
    .update(`image-marker-node:${width}x${height}`)
    .digest();
}

function createPixelPositions(
  key: Buffer,
  width: number,
  height: number
): number[] {
  const pixelCount = width * height;
  const needed = FRAME_BYTES * 8 * REPEATS;
  if (pixelCount < needed) {
    throw new Error(
      `Invisible locator requires at least ${needed} pixels; received ${width}x${height}.`
    );
  }
  const seed = positionSeed(key, width, height);
  const positions: number[] = [];
  const used = new Set<number>();
  let counter = 0;
  while (positions.length < needed) {
    const digest = createHash('sha256')
      .update(seed)
      .update(String(counter))
      .digest();
    counter += 1;
    for (let offset = 0; offset + 4 <= digest.length; offset += 4) {
      const position = digest.readUInt32BE(offset) % pixelCount;
      if (used.has(position)) continue;
      used.add(position);
      positions.push(position);
      if (positions.length === needed) break;
    }
  }
  return positions;
}

function embedFrame(
  pixels: Buffer,
  frame: Buffer,
  positions: readonly number[]
): void {
  for (let bitIndex = 0; bitIndex < FRAME_BYTES * 8; bitIndex += 1) {
    const bit = (frame[Math.floor(bitIndex / 8)]! >> (7 - (bitIndex % 8))) & 1;
    for (let repeat = 0; repeat < REPEATS; repeat += 1) {
      const pixel = positions[bitIndex * REPEATS + repeat]!;
      const channel = pixel * 4 + 2;
      pixels[channel] = (pixels[channel]! & 0xfe) | bit;
    }
  }
}

function readFrame(
  pixels: Buffer,
  positions: readonly number[]
): { frame: Buffer; confidence: number } {
  const frame = Buffer.alloc(FRAME_BYTES);
  let agreements = 0;
  for (let bitIndex = 0; bitIndex < FRAME_BYTES * 8; bitIndex += 1) {
    let votes = 0;
    for (let repeat = 0; repeat < REPEATS; repeat += 1) {
      const pixel = positions[bitIndex * REPEATS + repeat]!;
      votes += pixels[pixel * 4 + 2]! & 1;
    }
    const bit = votes >= Math.ceil(REPEATS / 2) ? 1 : 0;
    agreements += bit ? votes : REPEATS - votes;
    frame[Math.floor(bitIndex / 8)]! |= bit << (7 - (bitIndex % 8));
  }
  return {
    frame,
    confidence: agreements / (FRAME_BYTES * 8 * REPEATS),
  };
}

async function decodePixels(
  sharp: SharpFactory,
  source: NodeInvisibleEmbedOptions['image'],
  signal?: AbortSignal
) {
  const input = await sourceToSharpInput(source, signal);
  throwIfAborted(signal);
  return sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

export async function embedNodeInvisible(
  sharp: SharpFactory,
  options: NodeInvisibleEmbedOptions
): Promise<NodeRenderResult> {
  const startedAt = performance.now();
  const key = normalizeKey(options.key);
  const decoded = await decodePixels(sharp, options.image, options.signal);
  throwIfAborted(options.signal);
  const frame = createFrame(options.payload, key);
  const positions = createPixelPositions(
    key,
    decoded.info.width,
    decoded.info.height
  );
  const pixels = Buffer.from(decoded.data);
  embedFrame(pixels, frame, positions);
  const data = await sharp(pixels, {
    raw: {
      width: decoded.info.width,
      height: decoded.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
  throwIfAborted(options.signal);
  return {
    data,
    format: 'png',
    mimeType: 'image/png',
    width: decoded.info.width,
    height: decoded.info.height,
    durationMs: Math.max(0, performance.now() - startedAt),
  };
}

export async function detectNodeInvisible(
  sharp: SharpFactory,
  options: NodeInvisibleDetectOptions
): Promise<NodeInvisibleDetectionResult> {
  const key = normalizeKey(options.key);
  const decoded = await decodePixels(sharp, options.image, options.signal);
  throwIfAborted(options.signal);
  const positions = createPixelPositions(
    key,
    decoded.info.width,
    decoded.info.height
  );
  const { frame, confidence } = readFrame(Buffer.from(decoded.data), positions);
  return decodeFrame(frame, key, confidence);
}
