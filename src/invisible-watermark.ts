/* eslint-disable no-bitwise -- SHA-256, CRC, seeded permutation, and QIM bit operations are intentional. */

import type { ImageFormat } from './index';

export const INVISIBLE_WATERMARK_ALGORITHM = 'dct-qim-v1' as const;
export const INVISIBLE_WATERMARK_MAX_PAYLOAD_BYTES = 12;
export const INVISIBLE_WATERMARK_MIN_KEY_BYTES = 16;
export const INVISIBLE_WATERMARK_MIN_WIDTH = 128;
export const INVISIBLE_WATERMARK_MIN_HEIGHT = 88;
export const INVISIBLE_WATERMARK_RESIZE_SCALES = [
  0.95, 1.05, 0.9, 1.1,
] as const;
const INVISIBLE_WATERMARK_RESIZE_DELTA_FACTORS = [1, 0.9];

const BLOCK_SIZE = 8;
const TILE_WIDTH = 16;
const TILE_HEIGHT = 11;
const FRAME_BYTES = 22;
const FRAME_BITS = FRAME_BYTES * 8;
const PAYLOAD_OFFSET = 4;
const PAYLOAD_BYTES = 12;
const CRC_OFFSET = 16;
const AUTH_OFFSET = 18;
const MAGIC_0 = 0x49;
const MAGIC_1 = 0x4d;
const FRAME_VERSION = 1;
const SHA256_BLOCK_BYTES = 64;

const SHA256_INITIAL = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
]);

const SHA256_ROUND = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const COEFFICIENT_PAIRS = [
  [1, 2, 2, 1],
  [2, 3, 3, 2],
  [1, 3, 3, 1],
  [2, 4, 4, 2],
] as const;

const STRENGTH_DELTAS: Record<InvisibleWatermarkStrength, number> = {
  subtle: 18,
  balanced: 28,
  robust: 42,
};

/** Pixel-change strength used by the DCT-QIM invisible watermark. */
export type InvisibleWatermarkStrength = 'subtle' | 'balanced' | 'robust';

/** Detection search cost. Robust search also checks light resizing, shifted block grids, and tile phases. */
export type InvisibleWatermarkSearch = 'fast' | 'robust';

/** Source image accepted by the invisible watermark APIs. */
export interface InvisibleWatermarkImage {
  /** Native image asset, URI object, URL/data URL, Blob, File, or loaded browser image. */
  src: any;
}

/** Options for writing an authenticated short locator into image pixels. */
export interface EmbedInvisibleWatermarkOptions {
  /** Source image. It must be at least 128×88 pixels after `maxSize` is applied. */
  image: InvisibleWatermarkImage;
  /** Locator containing 1–12 UTF-8 bytes. Do not store personal data directly. */
  payload: string;
  /** Secret containing at least 16 UTF-8 bytes. Do not bundle a production master key. */
  key: string;
  /** Pixel-change strength. Use the same value during detection. @defaultValue `balanced` */
  strength?: InvisibleWatermarkStrength;
  /** JPEG encoder quality from 0–100. */
  quality?: number;
  /** Safe output basename on iOS and Android. */
  filename?: string;
  /** Output encoding. Web returns a data URL; native returns a cache path. */
  saveFormat?: ImageFormat;
  /** Maximum decoded width or height. @defaultValue 2048 */
  maxSize?: number;
}

/** Options for recovering and authenticating an invisible trace locator. */
export interface DetectInvisibleWatermarkOptions {
  /** Image that may contain an invisible trace watermark. */
  image: InvisibleWatermarkImage;
  /** The same secret that was used to embed the locator. */
  key: string;
  /** The same pixel-change strength used during embedding. @defaultValue `balanced` */
  strength?: InvisibleWatermarkStrength;
  /** Use `robust` for 0.9×–1.1× resize and limited crop recovery at a higher CPU cost. @defaultValue `fast` */
  search?: InvisibleWatermarkSearch;
  /** Maximum decoded width or height. Keep this consistent with embedding. @defaultValue 2048 */
  maxSize?: number;
}

/** Authenticated detection result. A positive result does not prove the image was unmodified. */
export interface InvisibleWatermarkDetectionResult {
  /** Whether the frame passed magic, CRC, and authentication checks. */
  detected: boolean;
  /** Recovered locator, present only when `detected` is true. */
  payload?: string;
  /** Normalized detector confidence from 0–1. */
  confidence: number;
  /** Disagreement between decoded frame bits and individual block votes. */
  bitErrorRate?: number;
  /** Versioned pixel algorithm identifier. */
  algorithm: typeof INVISIBLE_WATERMARK_ALGORITHM;
  /** Estimated input scale when robust resize recovery was required. */
  scale?: number;
}

export interface InvisibleWatermarkPixelBuffer {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}

interface DetectionCandidate extends InvisibleWatermarkDetectionResult {
  frame?: Uint8Array;
}

function toPublicDetectionResult(
  candidate: DetectionCandidate
): InvisibleWatermarkDetectionResult {
  const result: InvisibleWatermarkDetectionResult = {
    detected: candidate.detected,
    confidence: candidate.confidence,
    algorithm: candidate.algorithm,
  };
  if (candidate.payload !== undefined) result.payload = candidate.payload;
  if (candidate.bitErrorRate !== undefined) {
    result.bitErrorRate = candidate.bitErrorRate;
  }
  if (candidate.scale !== undefined && candidate.scale !== 1) {
    result.scale = candidate.scale;
  }
  return result;
}

interface BlockObservation {
  differences: Float64Array;
  blockX: number;
  blockY: number;
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/** Small dependency-free SHA-256 used to keep Web frame vectors deterministic. */
export function sha256(input: Uint8Array): Uint8Array {
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const hash = new Uint32Array(SHA256_INITIAL);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const word15 = words[index - 15]!;
      const word2 = words[index - 2]!;
      const sigma0 =
        rotateRight(word15, 7) ^ rotateRight(word15, 18) ^ (word15 >>> 3);
      const sigma1 =
        rotateRight(word2, 17) ^ rotateRight(word2, 19) ^ (word2 >>> 10);
      words[index] =
        (words[index - 16]! + sigma0 + words[index - 7]! + sigma1) >>> 0;
    }

    let a = hash[0]!;
    let b = hash[1]!;
    let c = hash[2]!;
    let d = hash[3]!;
    let e = hash[4]!;
    let f = hash[5]!;
    let g = hash[6]!;
    let h = hash[7]!;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 =
        (h + sum1 + choose + SHA256_ROUND[index]! + words[index]!) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0]! + a) >>> 0;
    hash[1] = (hash[1]! + b) >>> 0;
    hash[2] = (hash[2]! + c) >>> 0;
    hash[3] = (hash[3]! + d) >>> 0;
    hash[4] = (hash[4]! + e) >>> 0;
    hash[5] = (hash[5]! + f) >>> 0;
    hash[6] = (hash[6]! + g) >>> 0;
    hash[7] = (hash[7]! + h) >>> 0;
  }

  const output = new Uint8Array(32);
  const outputView = new DataView(output.buffer);
  hash.forEach((word, index) => outputView.setUint32(index * 4, word));
  return output;
}

export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  let normalizedKey = key.length > SHA256_BLOCK_BYTES ? sha256(key) : key;
  if (normalizedKey.length < SHA256_BLOCK_BYTES) {
    const padded = new Uint8Array(SHA256_BLOCK_BYTES);
    padded.set(normalizedKey);
    normalizedKey = padded;
  }
  const innerKey = new Uint8Array(SHA256_BLOCK_BYTES);
  const outerKey = new Uint8Array(SHA256_BLOCK_BYTES);
  for (let index = 0; index < SHA256_BLOCK_BYTES; index += 1) {
    innerKey[index] = normalizedKey[index]! ^ 0x36;
    outerKey[index] = normalizedKey[index]! ^ 0x5c;
  }
  const inner = new Uint8Array(innerKey.length + message.length);
  inner.set(innerKey);
  inner.set(message, innerKey.length);
  const innerHash = sha256(inner);
  const outer = new Uint8Array(outerKey.length + innerHash.length);
  outer.set(outerKey);
  outer.set(innerHash, outerKey.length);
  return sha256(outer);
}

export function encodeUtf8(value: string): Uint8Array {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      } else {
        codePoint = 0xfffd;
      }
    } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
      codePoint = 0xfffd;
    }
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

export function decodeUtf8(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; ) {
    const first = bytes[index++]!;
    let codePoint: number;
    if (first < 0x80) {
      codePoint = first;
    } else if ((first & 0xe0) === 0xc0 && index < bytes.length) {
      codePoint = ((first & 0x1f) << 6) | (bytes[index++]! & 0x3f);
    } else if ((first & 0xf0) === 0xe0 && index + 1 < bytes.length) {
      codePoint =
        ((first & 0x0f) << 12) |
        ((bytes[index++]! & 0x3f) << 6) |
        (bytes[index++]! & 0x3f);
    } else if ((first & 0xf8) === 0xf0 && index + 2 < bytes.length) {
      codePoint =
        ((first & 0x07) << 18) |
        ((bytes[index++]! & 0x3f) << 12) |
        ((bytes[index++]! & 0x3f) << 6) |
        (bytes[index++]! & 0x3f);
    } else {
      codePoint = 0xfffd;
    }
    output += String.fromCodePoint(codePoint);
  }
  return output;
}

export function crc16Ccitt(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
    }
  }
  return crc;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index]! ^ right[index]!;
  }
  return mismatch === 0;
}

function bytesToBits(bytes: Uint8Array): Uint8Array {
  const bits = new Uint8Array(bytes.length * 8);
  for (let index = 0; index < bits.length; index += 1) {
    bits[index] = (bytes[index >>> 3]! >>> (7 - (index & 7))) & 1;
  }
  return bits;
}

function bitsToBytes(bits: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let index = 0; index < bits.length; index += 1) {
    bytes[index >>> 3] =
      bytes[index >>> 3]! | (bits[index]! << (7 - (index & 7)));
  }
  return bytes;
}

export function buildInvisibleWatermarkFrame(
  payload: string,
  key: string
): Uint8Array {
  const payloadBytes = encodeUtf8(payload);
  const keyBytes = encodeUtf8(key);
  validatePayloadAndKey(payloadBytes, keyBytes);
  const frame = new Uint8Array(FRAME_BYTES);
  frame[0] = MAGIC_0;
  frame[1] = MAGIC_1;
  frame[2] = FRAME_VERSION;
  frame[3] = payloadBytes.length;
  frame.set(payloadBytes, PAYLOAD_OFFSET);
  const crc = crc16Ccitt(frame.subarray(0, CRC_OFFSET));
  frame[CRC_OFFSET] = crc >>> 8;
  frame[CRC_OFFSET + 1] = crc & 0xff;
  const tag = hmacSha256(keyBytes, frame.subarray(0, AUTH_OFFSET));
  frame.set(tag.subarray(0, 4), AUTH_OFFSET);
  return frame;
}

function parseFrame(frame: Uint8Array, keyBytes: Uint8Array): string | null {
  if (
    frame.length !== FRAME_BYTES ||
    frame[0] !== MAGIC_0 ||
    frame[1] !== MAGIC_1 ||
    frame[2] !== FRAME_VERSION ||
    frame[3]! < 1 ||
    frame[3]! > PAYLOAD_BYTES
  ) {
    return null;
  }
  const expectedCrc = crc16Ccitt(frame.subarray(0, CRC_OFFSET));
  const actualCrc = (frame[CRC_OFFSET]! << 8) | frame[CRC_OFFSET + 1]!;
  if (expectedCrc !== actualCrc) return null;
  const expectedTag = hmacSha256(
    keyBytes,
    frame.subarray(0, AUTH_OFFSET)
  ).subarray(0, 4);
  if (!equalBytes(expectedTag, frame.subarray(AUTH_OFFSET))) return null;
  return decodeUtf8(frame.subarray(PAYLOAD_OFFSET, PAYLOAD_OFFSET + frame[3]!));
}

function xorshift32(value: number): number {
  let output = value >>> 0;
  output ^= output << 13;
  output ^= output >>> 17;
  output ^= output << 5;
  return output >>> 0;
}

function seedForKey(keyBytes: Uint8Array): number {
  const label = encodeUtf8('react-native-image-marker:dct-qim-v1');
  const digest = hmacSha256(keyBytes, label);
  const seed = new DataView(
    digest.buffer,
    digest.byteOffset,
    digest.byteLength
  ).getUint32(0);
  return seed || 0x6d2b79f5;
}

export function createInvisibleWatermarkPermutation(key: string): Uint16Array {
  const keyBytes = encodeUtf8(key);
  if (keyBytes.length < INVISIBLE_WATERMARK_MIN_KEY_BYTES) {
    throw new Error(
      `key must contain at least ${INVISIBLE_WATERMARK_MIN_KEY_BYTES} UTF-8 bytes.`
    );
  }
  const output = new Uint16Array(FRAME_BITS);
  for (let index = 0; index < output.length; index += 1) output[index] = index;
  let state = seedForKey(keyBytes);
  for (let index = output.length - 1; index > 0; index -= 1) {
    state = xorshift32(state);
    const swapIndex = state % (index + 1);
    const value = output[index]!;
    output[index] = output[swapIndex]!;
    output[swapIndex] = value;
  }
  return output;
}

function mixSlot(seed: number, slot: number): number {
  let mixed = (seed ^ Math.imul(slot + 1, 0x9e3779b1)) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x85ebca6b) >>> 0;
  mixed ^= mixed >>> 13;
  mixed = Math.imul(mixed, 0xc2b2ae35) >>> 0;
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function pairAndDither(
  seed: number,
  slot: number,
  delta: number
): { pair: (typeof COEFFICIENT_PAIRS)[number]; dither: number } {
  const mixed = mixSlot(seed, slot);
  return {
    pair: COEFFICIENT_PAIRS[mixed & 3]!,
    dither: (((mixed >>> 8) & 0xffffff) / 0x1000000 - 0.5) * delta,
  };
}

function validatePayloadAndKey(
  payloadBytes: Uint8Array,
  keyBytes: Uint8Array
): void {
  if (payloadBytes.length < 1 || payloadBytes.length > PAYLOAD_BYTES) {
    throw new Error(
      `payload must contain between 1 and ${PAYLOAD_BYTES} UTF-8 bytes.`
    );
  }
  if (keyBytes.length < INVISIBLE_WATERMARK_MIN_KEY_BYTES) {
    throw new Error(
      `key must contain at least ${INVISIBLE_WATERMARK_MIN_KEY_BYTES} UTF-8 bytes.`
    );
  }
}

function validateImageDimensions(width: number, height: number): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < INVISIBLE_WATERMARK_MIN_WIDTH ||
    height < INVISIBLE_WATERMARK_MIN_HEIGHT
  ) {
    throw new Error(
      `invisible watermark images must be at least ${INVISIBLE_WATERMARK_MIN_WIDTH}x${INVISIBLE_WATERMARK_MIN_HEIGHT} pixels.`
    );
  }
}

function validateStrength(
  strength: InvisibleWatermarkStrength | undefined
): InvisibleWatermarkStrength {
  const resolved = strength ?? 'balanced';
  if (!Object.prototype.hasOwnProperty.call(STRENGTH_DELTAS, resolved)) {
    throw new Error(`Unsupported invisible watermark strength: ${resolved}.`);
  }
  return resolved;
}

function validateSearch(
  search: InvisibleWatermarkSearch | undefined
): InvisibleWatermarkSearch {
  const resolved = search ?? 'fast';
  if (resolved !== 'fast' && resolved !== 'robust') {
    throw new Error(
      `Unsupported invisible watermark search mode: ${resolved}.`
    );
  }
  return resolved;
}

function validateOutputNumber(
  value: number | undefined,
  name: 'quality' | 'maxSize',
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
): void {
  if (
    value !== undefined &&
    (!Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < minimum ||
      value > maximum)
  ) {
    throw new Error(
      name === 'quality'
        ? 'quality must be a finite integer between 0 and 100.'
        : 'maxSize must be a positive finite integer.'
    );
  }
}

export function validateEmbedInvisibleOptions(
  options: EmbedInvisibleWatermarkOptions
): void {
  if (!options?.image?.src) throw new Error('please set image!');
  validatePayloadAndKey(
    encodeUtf8(options.payload ?? ''),
    encodeUtf8(options.key ?? '')
  );
  validateStrength(options.strength);
  validateOutputNumber(options.quality, 'quality', 0, 100);
  validateOutputNumber(options.maxSize, 'maxSize', 1);
}

export function validateDetectInvisibleOptions(
  options: DetectInvisibleWatermarkOptions
): void {
  if (!options?.image?.src) throw new Error('please set image!');
  const keyBytes = encodeUtf8(options.key ?? '');
  if (keyBytes.length < INVISIBLE_WATERMARK_MIN_KEY_BYTES) {
    throw new Error(
      `key must contain at least ${INVISIBLE_WATERMARK_MIN_KEY_BYTES} UTF-8 bytes.`
    );
  }
  validateStrength(options.strength);
  validateSearch(options.search);
  validateOutputNumber(options.maxSize, 'maxSize', 1);
}

function nearestParity(value: number, bit: number): number {
  const rounded = Math.round(value);
  if ((rounded & 1) === bit) return rounded;
  const lower = rounded - 1;
  const upper = rounded + 1;
  return Math.abs(value - lower) <= Math.abs(value - upper) ? lower : upper;
}

function basisValue(
  u: number,
  v: number,
  x: number,
  y: number,
  size = BLOCK_SIZE
): number {
  const alphaU = u === 0 ? Math.sqrt(1 / size) : Math.sqrt(2 / size);
  const alphaV = v === 0 ? Math.sqrt(1 / size) : Math.sqrt(2 / size);
  return (
    alphaU *
    alphaV *
    Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
    Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size))
  );
}

const BASIS_CACHE = new Map<string, Float64Array>();

function basis(u: number, v: number): Float64Array {
  const key = `${u}:${v}`;
  const cached = BASIS_CACHE.get(key);
  if (cached) return cached;
  const output = new Float64Array(BLOCK_SIZE * BLOCK_SIZE);
  for (let y = 0; y < BLOCK_SIZE; y += 1) {
    for (let x = 0; x < BLOCK_SIZE; x += 1) {
      output[y * BLOCK_SIZE + x] = basisValue(u, v, x, y);
    }
  }
  BASIS_CACHE.set(key, output);
  return output;
}

function readLuminanceBlock(
  buffer: InvisibleWatermarkPixelBuffer,
  startX: number,
  startY: number
): { luminance: Float64Array; usable: boolean } {
  const output = new Float64Array(BLOCK_SIZE * BLOCK_SIZE);
  let opaque = 0;
  for (let y = 0; y < BLOCK_SIZE; y += 1) {
    for (let x = 0; x < BLOCK_SIZE; x += 1) {
      const pixel = ((startY + y) * buffer.width + startX + x) * 4;
      const alpha = buffer.data[pixel + 3]!;
      if (alpha >= 224) opaque += 1;
      output[y * BLOCK_SIZE + x] =
        buffer.data[pixel]! * 0.299 +
        buffer.data[pixel + 1]! * 0.587 +
        buffer.data[pixel + 2]! * 0.114;
    }
  }
  return { luminance: output, usable: opaque >= 56 };
}

function coefficient(luminance: Float64Array, values: Float64Array): number {
  let output = 0;
  for (let index = 0; index < luminance.length; index += 1) {
    output += luminance[index]! * values[index]!;
  }
  return output;
}

function coefficientDifference(
  luminance: Float64Array,
  pair: (typeof COEFFICIENT_PAIRS)[number]
): number {
  return (
    coefficient(luminance, basis(pair[0], pair[1])) -
    coefficient(luminance, basis(pair[2], pair[3]))
  );
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function embedBlock(
  buffer: InvisibleWatermarkPixelBuffer,
  startX: number,
  startY: number,
  bit: number,
  pair: (typeof COEFFICIENT_PAIRS)[number],
  dither: number,
  delta: number
): void {
  const block = readLuminanceBlock(buffer, startX, startY);
  if (!block.usable) return;
  const firstBasis = basis(pair[0], pair[1]);
  const secondBasis = basis(pair[2], pair[3]);
  const difference =
    coefficient(block.luminance, firstBasis) -
    coefficient(block.luminance, secondBasis);
  const quantized = nearestParity((difference - dither) / delta, bit);
  const target = quantized * delta + dither;
  const coefficientShift = (target - difference) / 2;
  for (let y = 0; y < BLOCK_SIZE; y += 1) {
    for (let x = 0; x < BLOCK_SIZE; x += 1) {
      const blockIndex = y * BLOCK_SIZE + x;
      const pixel = ((startY + y) * buffer.width + startX + x) * 4;
      if (buffer.data[pixel + 3]! < 224) continue;
      const luminanceShift =
        coefficientShift * (firstBasis[blockIndex]! - secondBasis[blockIndex]!);
      buffer.data[pixel] = clampByte(buffer.data[pixel]! + luminanceShift);
      buffer.data[pixel + 1] = clampByte(
        buffer.data[pixel + 1]! + luminanceShift
      );
      buffer.data[pixel + 2] = clampByte(
        buffer.data[pixel + 2]! + luminanceShift
      );
    }
  }
}

export function embedInvisibleWatermarkPixels(
  buffer: InvisibleWatermarkPixelBuffer,
  options: Pick<EmbedInvisibleWatermarkOptions, 'payload' | 'key' | 'strength'>
): void {
  validateImageDimensions(buffer.width, buffer.height);
  if (buffer.data.length < buffer.width * buffer.height * 4) {
    throw new Error(
      'RGBA pixel buffer is smaller than its declared dimensions.'
    );
  }
  const frame = buildInvisibleWatermarkFrame(options.payload, options.key);
  const bits = bytesToBits(frame);
  const keyBytes = encodeUtf8(options.key);
  const seed = seedForKey(keyBytes);
  const permutation = createInvisibleWatermarkPermutation(options.key);
  const delta = STRENGTH_DELTAS[validateStrength(options.strength)];
  const blocksX = Math.floor(buffer.width / BLOCK_SIZE);
  const blocksY = Math.floor(buffer.height / BLOCK_SIZE);
  for (let blockY = 0; blockY < blocksY; blockY += 1) {
    for (let blockX = 0; blockX < blocksX; blockX += 1) {
      const slot = (blockY % TILE_HEIGHT) * TILE_WIDTH + (blockX % TILE_WIDTH);
      const { pair, dither } = pairAndDither(seed, slot, delta);
      embedBlock(
        buffer,
        blockX * BLOCK_SIZE,
        blockY * BLOCK_SIZE,
        bits[permutation[slot]!]!,
        pair,
        dither,
        delta
      );
    }
  }
}

function observeGrid(
  buffer: InvisibleWatermarkPixelBuffer,
  offsetX: number,
  offsetY: number
): BlockObservation[] {
  const blocksX = Math.floor((buffer.width - offsetX) / BLOCK_SIZE);
  const blocksY = Math.floor((buffer.height - offsetY) / BLOCK_SIZE);
  const observations: BlockObservation[] = [];
  for (let blockY = 0; blockY < blocksY; blockY += 1) {
    for (let blockX = 0; blockX < blocksX; blockX += 1) {
      const block = readLuminanceBlock(
        buffer,
        offsetX + blockX * BLOCK_SIZE,
        offsetY + blockY * BLOCK_SIZE
      );
      if (!block.usable) continue;
      const differences = new Float64Array(COEFFICIENT_PAIRS.length);
      COEFFICIENT_PAIRS.forEach((pair, index) => {
        differences[index] = coefficientDifference(block.luminance, pair);
      });
      observations.push({ differences, blockX, blockY });
    }
  }
  return observations;
}

async function yieldToEventLoop(): Promise<void> {
  const scheduler = (
    globalThis as typeof globalThis & {
      scheduler?: { yield?: () => Promise<void> };
    }
  ).scheduler;
  if (typeof scheduler?.yield === 'function') {
    await scheduler.yield();
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function observeGridAsync(
  buffer: InvisibleWatermarkPixelBuffer,
  offsetX: number,
  offsetY: number
): Promise<BlockObservation[]> {
  const blocksX = Math.floor((buffer.width - offsetX) / BLOCK_SIZE);
  const blocksY = Math.floor((buffer.height - offsetY) / BLOCK_SIZE);
  const observations: BlockObservation[] = [];
  for (let blockY = 0; blockY < blocksY; blockY += 1) {
    for (let blockX = 0; blockX < blocksX; blockX += 1) {
      const block = readLuminanceBlock(
        buffer,
        offsetX + blockX * BLOCK_SIZE,
        offsetY + blockY * BLOCK_SIZE
      );
      if (!block.usable) continue;
      const differences = new Float64Array(COEFFICIENT_PAIRS.length);
      COEFFICIENT_PAIRS.forEach((pair, index) => {
        differences[index] = coefficientDifference(block.luminance, pair);
      });
      observations.push({ differences, blockX, blockY });
    }
    if ((blockY + 1) % 8 === 0) {
      await yieldToEventLoop();
    }
  }
  return observations;
}

function decodeCandidate(
  observations: BlockObservation[],
  keyBytes: Uint8Array,
  permutation: Uint16Array,
  seed: number,
  delta: number,
  phaseX: number,
  phaseY: number
): DetectionCandidate | null {
  const votes = new Float64Array(FRAME_BITS);
  const counts = new Uint32Array(FRAME_BITS);
  const hardBits = new Uint8Array(observations.length);
  const frameIndexes = new Uint16Array(observations.length);
  observations.forEach((observation, observationIndex) => {
    const slot =
      ((observation.blockY + phaseY) % TILE_HEIGHT) * TILE_WIDTH +
      ((observation.blockX + phaseX) % TILE_WIDTH);
    const mixed = mixSlot(seed, slot);
    const pairIndex = mixed & 3;
    const dither = (((mixed >>> 8) & 0xffffff) / 0x1000000 - 0.5) * delta;
    const normalized = (observation.differences[pairIndex]! - dither) / delta;
    const rounded = Math.round(normalized);
    const bit = Math.abs(rounded % 2);
    const reliability = Math.max(
      0,
      Math.min(1, Math.abs(normalized - Math.floor(normalized) - 0.5) * 2)
    );
    const frameIndex = permutation[slot]!;
    votes[frameIndex] =
      votes[frameIndex]! + (bit === 1 ? reliability : -reliability);
    counts[frameIndex] = counts[frameIndex]! + 1;
    hardBits[observationIndex] = bit;
    frameIndexes[observationIndex] = frameIndex;
  });
  if (counts.some((count) => count === 0)) return null;
  const decodedBits = new Uint8Array(FRAME_BITS);
  for (let index = 0; index < FRAME_BITS; index += 1) {
    decodedBits[index] = votes[index]! >= 0 ? 1 : 0;
  }
  const frame = bitsToBytes(decodedBits);
  const payload = parseFrame(frame, keyBytes);
  if (payload === null) return null;
  let mismatches = 0;
  hardBits.forEach((bit, index) => {
    if (bit !== decodedBits[frameIndexes[index]!]) mismatches += 1;
  });
  const bitErrorRate = observations.length
    ? mismatches / observations.length
    : 1;
  let margin = 0;
  for (let index = 0; index < FRAME_BITS; index += 1) {
    margin += Math.min(1, Math.abs(votes[index]!) / counts[index]!);
  }
  margin /= FRAME_BITS;
  return {
    detected: true,
    payload,
    confidence: Math.max(
      0,
      Math.min(1, margin * 0.6 + (1 - bitErrorRate) * 0.4)
    ),
    bitErrorRate,
    algorithm: INVISIBLE_WATERMARK_ALGORITHM,
    frame,
  };
}

interface DetectionContext {
  keyBytes: Uint8Array;
  permutation: Uint16Array;
  seed: number;
  delta: number;
}

function createDetectionContext(
  options: Pick<DetectInvisibleWatermarkOptions, 'key' | 'strength'>
): DetectionContext {
  const keyBytes = encodeUtf8(options.key ?? '');
  if (keyBytes.length < INVISIBLE_WATERMARK_MIN_KEY_BYTES) {
    throw new Error(
      `key must contain at least ${INVISIBLE_WATERMARK_MIN_KEY_BYTES} UTF-8 bytes.`
    );
  }
  return {
    keyBytes,
    delta: STRENGTH_DELTAS[validateStrength(options.strength)],
    permutation: createInvisibleWatermarkPermutation(options.key),
    seed: seedForKey(keyBytes),
  };
}

function validatePixelBuffer(buffer: InvisibleWatermarkPixelBuffer): void {
  validateImageDimensions(buffer.width, buffer.height);
  if (buffer.data.length < buffer.width * buffer.height * 4) {
    throw new Error(
      'RGBA pixel buffer is smaller than its declared dimensions.'
    );
  }
}

function detectAtScale(
  buffer: InvisibleWatermarkPixelBuffer,
  context: DetectionContext,
  search: InvisibleWatermarkSearch,
  scale = 1
): DetectionCandidate | null {
  const offsets = search === 'robust' ? BLOCK_SIZE : 1;
  const phaseXs = search === 'robust' ? TILE_WIDTH : 1;
  const phaseYs = search === 'robust' ? TILE_HEIGHT : 1;

  let best: DetectionCandidate | null = null;
  for (let offsetY = 0; offsetY < offsets; offsetY += 1) {
    for (let offsetX = 0; offsetX < offsets; offsetX += 1) {
      const observations = observeGrid(buffer, offsetX, offsetY);
      for (let phaseY = 0; phaseY < phaseYs; phaseY += 1) {
        for (let phaseX = 0; phaseX < phaseXs; phaseX += 1) {
          const candidate = decodeCandidate(
            observations,
            context.keyBytes,
            context.permutation,
            context.seed,
            context.delta,
            phaseX,
            phaseY
          );
          if (candidate && (!best || candidate.confidence > best.confidence)) {
            candidate.scale = scale;
            best = candidate;
            if (search === 'fast' || candidate.confidence >= 0.98) {
              return candidate;
            }
          }
        }
      }
    }
  }
  return best;
}

async function detectAtScaleAsync(
  buffer: InvisibleWatermarkPixelBuffer,
  context: DetectionContext,
  search: InvisibleWatermarkSearch,
  scale = 1
): Promise<DetectionCandidate | null> {
  const offsets = search === 'robust' ? BLOCK_SIZE : 1;
  const phaseXs = search === 'robust' ? TILE_WIDTH : 1;
  const phaseYs = search === 'robust' ? TILE_HEIGHT : 1;
  let best: DetectionCandidate | null = null;
  let candidatesSinceYield = 0;
  for (let offsetY = 0; offsetY < offsets; offsetY += 1) {
    for (let offsetX = 0; offsetX < offsets; offsetX += 1) {
      const observations = await observeGridAsync(buffer, offsetX, offsetY);
      for (let phaseY = 0; phaseY < phaseYs; phaseY += 1) {
        for (let phaseX = 0; phaseX < phaseXs; phaseX += 1) {
          const candidate = decodeCandidate(
            observations,
            context.keyBytes,
            context.permutation,
            context.seed,
            context.delta,
            phaseX,
            phaseY
          );
          if (candidate && (!best || candidate.confidence > best.confidence)) {
            candidate.scale = scale;
            best = candidate;
            if (search === 'fast' || candidate.confidence >= 0.98) {
              return candidate;
            }
          }
          candidatesSinceYield += 1;
          if (candidatesSinceYield >= 16) {
            candidatesSinceYield = 0;
            await yieldToEventLoop();
          }
        }
      }
    }
  }
  return best;
}

function detectResizedCandidate(
  buffer: InvisibleWatermarkPixelBuffer,
  context: DetectionContext,
  scale: number
): DetectionCandidate | null {
  const observations = observeGrid(buffer, 0, 0);
  for (const factor of INVISIBLE_WATERMARK_RESIZE_DELTA_FACTORS) {
    const candidate = decodeCandidate(
      observations,
      context.keyBytes,
      context.permutation,
      context.seed,
      context.delta * factor,
      0,
      0
    );
    if (candidate) {
      candidate.scale = scale;
      return candidate;
    }
  }
  return null;
}

async function detectResizedCandidateAsync(
  buffer: InvisibleWatermarkPixelBuffer,
  context: DetectionContext,
  scale: number
): Promise<DetectionCandidate | null> {
  const observations = await observeGridAsync(buffer, 0, 0);
  for (const factor of INVISIBLE_WATERMARK_RESIZE_DELTA_FACTORS) {
    const candidate = decodeCandidate(
      observations,
      context.keyBytes,
      context.permutation,
      context.seed,
      context.delta * factor,
      0,
      0
    );
    if (candidate) {
      candidate.scale = scale;
      return candidate;
    }
  }
  return null;
}

function resizeTarget(
  buffer: InvisibleWatermarkPixelBuffer,
  scale: number
): { width: number; height: number } | null {
  const width = Math.max(1, Math.round(buffer.width / scale));
  const height = Math.max(1, Math.round(buffer.height / scale));
  return width >= INVISIBLE_WATERMARK_MIN_WIDTH &&
    height >= INVISIBLE_WATERMARK_MIN_HEIGHT
    ? { width, height }
    : null;
}

export function resizeInvisibleWatermarkPixels(
  buffer: InvisibleWatermarkPixelBuffer,
  width: number,
  height: number
): InvisibleWatermarkPixelBuffer {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      'Invisible watermark resize dimensions must be positive integers.'
    );
  }
  const output = new Uint8ClampedArray(width * height * 4);
  const scaleX = buffer.width / width;
  const scaleY = buffer.height / height;
  for (let targetY = 0; targetY < height; targetY += 1) {
    const sourceY = (targetY + 0.5) * scaleY - 0.5;
    const top = Math.max(0, Math.min(buffer.height - 1, Math.floor(sourceY)));
    const bottom = Math.min(buffer.height - 1, top + 1);
    const weightY = Math.max(0, Math.min(1, sourceY - top));
    for (let targetX = 0; targetX < width; targetX += 1) {
      const sourceX = (targetX + 0.5) * scaleX - 0.5;
      const left = Math.max(0, Math.min(buffer.width - 1, Math.floor(sourceX)));
      const right = Math.min(buffer.width - 1, left + 1);
      const weightX = Math.max(0, Math.min(1, sourceX - left));
      const topLeft = (top * buffer.width + left) * 4;
      const topRight = (top * buffer.width + right) * 4;
      const bottomLeft = (bottom * buffer.width + left) * 4;
      const bottomRight = (bottom * buffer.width + right) * 4;
      const target = (targetY * width + targetX) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const topValue =
          buffer.data[topLeft + channel]! * (1 - weightX) +
          buffer.data[topRight + channel]! * weightX;
        const bottomValue =
          buffer.data[bottomLeft + channel]! * (1 - weightX) +
          buffer.data[bottomRight + channel]! * weightX;
        output[target + channel] =
          topValue * (1 - weightY) + bottomValue * weightY;
      }
    }
  }
  return { data: output, width, height };
}

function resizeInvisibleWatermarkPixelsNearest(
  buffer: InvisibleWatermarkPixelBuffer,
  width: number,
  height: number
): InvisibleWatermarkPixelBuffer {
  const output = new Uint8ClampedArray(width * height * 4);
  for (let targetY = 0; targetY < height; targetY += 1) {
    const sourceY = Math.min(
      buffer.height - 1,
      Math.floor(((targetY + 0.5) * buffer.height) / height)
    );
    for (let targetX = 0; targetX < width; targetX += 1) {
      const sourceX = Math.min(
        buffer.width - 1,
        Math.floor(((targetX + 0.5) * buffer.width) / width)
      );
      const source = (sourceY * buffer.width + sourceX) * 4;
      const target = (targetY * width + targetX) * 4;
      output[target] = buffer.data[source]!;
      output[target + 1] = buffer.data[source + 1]!;
      output[target + 2] = buffer.data[source + 2]!;
      output[target + 3] = buffer.data[source + 3]!;
    }
  }
  return { data: output, width, height };
}

async function resizeInvisibleWatermarkPixelsAsync(
  buffer: InvisibleWatermarkPixelBuffer,
  width: number,
  height: number
): Promise<InvisibleWatermarkPixelBuffer> {
  const output = new Uint8ClampedArray(width * height * 4);
  const scaleX = buffer.width / width;
  const scaleY = buffer.height / height;
  for (let targetY = 0; targetY < height; targetY += 1) {
    const sourceY = (targetY + 0.5) * scaleY - 0.5;
    const top = Math.max(0, Math.min(buffer.height - 1, Math.floor(sourceY)));
    const bottom = Math.min(buffer.height - 1, top + 1);
    const weightY = Math.max(0, Math.min(1, sourceY - top));
    for (let targetX = 0; targetX < width; targetX += 1) {
      const sourceX = (targetX + 0.5) * scaleX - 0.5;
      const left = Math.max(0, Math.min(buffer.width - 1, Math.floor(sourceX)));
      const right = Math.min(buffer.width - 1, left + 1);
      const weightX = Math.max(0, Math.min(1, sourceX - left));
      const topLeft = (top * buffer.width + left) * 4;
      const topRight = (top * buffer.width + right) * 4;
      const bottomLeft = (bottom * buffer.width + left) * 4;
      const bottomRight = (bottom * buffer.width + right) * 4;
      const target = (targetY * width + targetX) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const topValue =
          buffer.data[topLeft + channel]! * (1 - weightX) +
          buffer.data[topRight + channel]! * weightX;
        const bottomValue =
          buffer.data[bottomLeft + channel]! * (1 - weightX) +
          buffer.data[bottomRight + channel]! * weightX;
        output[target + channel] =
          topValue * (1 - weightY) + bottomValue * weightY;
      }
    }
    if ((targetY + 1) % 16 === 0) {
      await yieldToEventLoop();
    }
  }
  return { data: output, width, height };
}

async function resizeInvisibleWatermarkPixelsNearestAsync(
  buffer: InvisibleWatermarkPixelBuffer,
  width: number,
  height: number
): Promise<InvisibleWatermarkPixelBuffer> {
  const output = new Uint8ClampedArray(width * height * 4);
  for (let targetY = 0; targetY < height; targetY += 1) {
    const sourceY = Math.min(
      buffer.height - 1,
      Math.floor(((targetY + 0.5) * buffer.height) / height)
    );
    for (let targetX = 0; targetX < width; targetX += 1) {
      const sourceX = Math.min(
        buffer.width - 1,
        Math.floor(((targetX + 0.5) * buffer.width) / width)
      );
      const source = (sourceY * buffer.width + sourceX) * 4;
      const target = (targetY * width + targetX) * 4;
      output[target] = buffer.data[source]!;
      output[target + 1] = buffer.data[source + 1]!;
      output[target + 2] = buffer.data[source + 2]!;
      output[target + 3] = buffer.data[source + 3]!;
    }
    if ((targetY + 1) % 32 === 0) {
      await yieldToEventLoop();
    }
  }
  return { data: output, width, height };
}

function emptyDetectionResult(): InvisibleWatermarkDetectionResult {
  return {
    detected: false,
    confidence: 0,
    algorithm: INVISIBLE_WATERMARK_ALGORITHM,
  };
}

export function detectInvisibleWatermarkPixels(
  buffer: InvisibleWatermarkPixelBuffer,
  options: Pick<DetectInvisibleWatermarkOptions, 'key' | 'strength' | 'search'>
): InvisibleWatermarkDetectionResult {
  validatePixelBuffer(buffer);
  const context = createDetectionContext(options);
  const search = validateSearch(options.search);
  const scales =
    search === 'robust'
      ? ([1, ...INVISIBLE_WATERMARK_RESIZE_SCALES] as const)
      : ([1] as const);
  for (const scale of scales) {
    const target = scale === 1 ? null : resizeTarget(buffer, scale);
    if (scale !== 1 && !target) continue;
    const candidateBuffer = target
      ? scale < 1
        ? resizeInvisibleWatermarkPixelsNearest(
            buffer,
            target.width,
            target.height
          )
        : resizeInvisibleWatermarkPixels(buffer, target.width, target.height)
      : buffer;
    const candidate = target
      ? detectResizedCandidate(candidateBuffer, context, scale)
      : detectAtScale(candidateBuffer, context, 'fast', scale);
    if (candidate) return toPublicDetectionResult(candidate);
  }
  if (search === 'robust') {
    const candidate = detectAtScale(buffer, context, 'robust');
    if (candidate) return toPublicDetectionResult(candidate);
  }
  return emptyDetectionResult();
}

export async function detectInvisibleWatermarkPixelsAsync(
  buffer: InvisibleWatermarkPixelBuffer,
  options: Pick<DetectInvisibleWatermarkOptions, 'key' | 'strength' | 'search'>
): Promise<InvisibleWatermarkDetectionResult> {
  validatePixelBuffer(buffer);
  const context = createDetectionContext(options);
  const search = validateSearch(options.search);
  const scales =
    search === 'robust'
      ? ([1, ...INVISIBLE_WATERMARK_RESIZE_SCALES] as const)
      : ([1] as const);
  for (const scale of scales) {
    const target = scale === 1 ? null : resizeTarget(buffer, scale);
    if (scale !== 1 && !target) continue;
    const candidateBuffer = target
      ? scale < 1
        ? await resizeInvisibleWatermarkPixelsNearestAsync(
            buffer,
            target.width,
            target.height
          )
        : await resizeInvisibleWatermarkPixelsAsync(
            buffer,
            target.width,
            target.height
          )
      : buffer;
    const candidate = target
      ? await detectResizedCandidateAsync(candidateBuffer, context, scale)
      : await detectAtScaleAsync(candidateBuffer, context, 'fast', scale);
    if (candidate) return toPublicDetectionResult(candidate);
  }
  if (search === 'robust') {
    const candidate = await detectAtScaleAsync(buffer, context, 'robust');
    if (candidate) return toPublicDetectionResult(candidate);
  }
  return emptyDetectionResult();
}
