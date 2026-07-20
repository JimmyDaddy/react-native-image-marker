import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { createMemoryTraceStore } from './store.mjs';

export const DEFAULT_MAX_BODY_BYTES = 20 * 1024 * 1024;
const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png']);
const STRENGTHS = new Set(['subtle', 'balanced', 'robust']);
const SEARCHES = new Set(['fast', 'robust']);

export class HttpError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** @param {unknown} value @param {string} label */
function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${label} must be an object.`);
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/** @param {unknown} value */
function decodeBase64(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)
  ) {
    throw new HttpError(400, 'image.base64 must be valid padded base64.');
  }
  const output = Buffer.from(value, 'base64');
  if (
    output.length === 0 ||
    output.toString('base64').replace(/=+$/u, '') !== value.replace(/=+$/u, '')
  ) {
    throw new HttpError(400, 'image.base64 must be valid padded base64.');
  }
  return output;
}

/** @param {unknown} value */
function parseImage(value) {
  const image = requireObject(value, 'image');
  if (
    typeof image.mimeType !== 'string' ||
    !SUPPORTED_MEDIA_TYPES.has(image.mimeType)
  ) {
    throw new HttpError(415, 'image.mimeType must be image/jpeg or image/png.');
  }
  return { buffer: decodeBase64(image.base64), mimeType: image.mimeType };
}

/** @param {unknown} value */
function parseLocator(value) {
  if (
    typeof value !== 'string' ||
    Buffer.byteLength(value, 'utf8') < 1 ||
    Buffer.byteLength(value, 'utf8') > 12
  ) {
    throw new HttpError(400, 'locator must contain 1 to 12 UTF-8 bytes.');
  }
  return value;
}

/** @param {unknown} value */
function parseMetadata(value) {
  if (value === undefined) return undefined;
  return { ...requireObject(value, 'metadata') };
}

/** @param {unknown} value @param {Set<string>} allowed @param {string} label */
function parseEnum(value, allowed, label) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new HttpError(
      400,
      `${label} must be one of: ${Array.from(allowed).join(', ')}.`
    );
  }
  return value;
}

/** @param {unknown} value @param {string} label @param {number} min @param {number} max */
function parseInteger(value, label, min, max) {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new HttpError(
      400,
      `${label} must be an integer from ${min} to ${max}.`
    );
  }
  return /** @type {number} */ (value);
}

/** @param {import('node:http').IncomingMessage} request @param {number} limit */
async function readJsonBody(request, limit) {
  const contentType = request.headers['content-type']?.split(';', 1)[0];
  if (contentType !== 'application/json') {
    throw new HttpError(415, 'Content-Type must be application/json.');
  }
  /** @type {Buffer[]} */
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) {
      throw new HttpError(413, `Request body exceeds ${limit} bytes.`);
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body must contain valid JSON.');
  }
}

/** @param {Buffer} image @param {string} mimeType */
function responseImage(image, mimeType) {
  return { base64: image.toString('base64'), mimeType };
}

/**
 * @typedef {{
 *   embedInvisible(options: Record<string, unknown>): Promise<Buffer>,
 *   detectInvisible(options: Record<string, unknown>): Promise<{detected: boolean, payload?: string, confidence: number, algorithm: string}>
 * }} TraceRuntime
 * @typedef {{put(locator: string, record: Record<string, unknown>): Promise<void>, get(locator: string): Promise<Record<string, unknown> | null>}} TraceStore
 * @typedef {{sign?(input: Record<string, unknown>): Promise<{image: Buffer, mimeType: string, manifestId?: string}>, verify?(input: Record<string, unknown>): Promise<Record<string, unknown>>}} CredentialsAdapter
 */

/**
 * @param {{
 *   runtime: TraceRuntime,
 *   keyProvider: () => Promise<string> | string,
 *   store?: TraceStore,
 *   credentials?: CredentialsAdapter,
 *   maxBodyBytes?: number
 * }} options
 */
export function createRequestHandler({
  runtime,
  keyProvider,
  store = createMemoryTraceStore(),
  credentials,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
}) {
  if (
    !runtime ||
    typeof runtime.embedInvisible !== 'function' ||
    typeof runtime.detectInvisible !== 'function'
  ) {
    throw new Error(
      'A trace runtime with embedInvisible() and detectInvisible() is required.'
    );
  }
  if (typeof keyProvider !== 'function') {
    throw new Error('keyProvider must be a function.');
  }
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new Error('maxBodyBytes must be a positive integer.');
  }

  /** @param {Record<string, unknown>} body */
  async function detect(body) {
    const image = parseImage(body.image);
    const key = await keyProvider();
    const result = await runtime.detectInvisible({
      image: { src: image.buffer },
      key,
      strength: parseEnum(body.strength, STRENGTHS, 'strength'),
      search: parseEnum(body.search, SEARCHES, 'search'),
      maxSize: parseInteger(body.maxSize, 'maxSize', 128, 4096),
    });
    const record =
      result.detected && result.payload
        ? await store.get(result.payload)
        : null;
    return { image, result, record };
  }

  /** @param {import('node:http').IncomingMessage} request @param {import('node:http').ServerResponse} response */
  return async function handle(request, response) {
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('cache-control', 'no-store');
    response.setHeader('x-content-type-options', 'nosniff');
    try {
      if (request.method !== 'POST') {
        throw new HttpError(405, 'Only POST is supported.');
      }
      const body = requireObject(
        await readJsonBody(request, maxBodyBytes),
        'request body'
      );

      if (request.url === '/v1/traces/embed') {
        const image = parseImage(body.image);
        const locator = parseLocator(body.locator);
        const metadata = parseMetadata(body.metadata);
        const strength = parseEnum(body.strength, STRENGTHS, 'strength');
        const format =
          parseEnum(body.format, new Set(['jpeg', 'png']), 'format') ?? 'png';
        const key = await keyProvider();
        let output = await runtime.embedInvisible({
          image: { src: image.buffer },
          payload: locator,
          key,
          strength,
          saveFormat: format === 'png' ? 'png' : 'jpg',
          quality: parseInteger(body.quality, 'quality', 0, 100),
          maxSize: parseInteger(body.maxSize, 'maxSize', 128, 4096),
        });
        const record = {
          id: randomUUID(),
          locator,
          algorithm: 'dct-qim-v1',
          metadata,
          createdAt: new Date().toISOString(),
        };
        await store.put(locator, record);
        let mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        let manifestId;
        if (credentials?.sign) {
          const signed = await credentials.sign({
            image: output,
            mimeType,
            locator,
            claim: body.claim,
          });
          output = signed.image;
          mimeType = signed.mimeType;
          manifestId = signed.manifestId;
        }
        response.statusCode = 200;
        response.end(
          JSON.stringify({
            image: responseImage(output, mimeType),
            algorithm: 'dct-qim-v1',
            locator,
            recordId: record.id,
            manifestId,
          })
        );
        return;
      }

      if (request.url === '/v1/traces/detect') {
        const { result, record } = await detect(body);
        response.statusCode = 200;
        response.end(JSON.stringify({ trace: result, record }));
        return;
      }

      if (request.url === '/v1/traces/verify') {
        const { image, result, record } = await detect(body);
        let verification = null;
        if (credentials?.verify) {
          try {
            verification = await credentials.verify({
              image: image.buffer,
              mimeType: image.mimeType,
            });
          } catch {
            verification = {
              valid: false,
              error: 'Content Credentials verification failed.',
            };
          }
        }
        response.statusCode = 200;
        response.end(
          JSON.stringify({ trace: result, record, credentials: verification })
        );
        return;
      }

      throw new HttpError(404, 'Route not found.');
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      response.statusCode = status;
      response.end(
        JSON.stringify({
          error:
            error instanceof HttpError
              ? error.message
              : 'Trace service operation failed.',
        })
      );
    }
  };
}
