import { Buffer } from 'node:buffer';

export const DEFAULT_MAX_BODY_BYTES = 12 * 1024 * 1024;
const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png']);

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
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new HttpError(400, 'image.base64 must be valid padded base64.');
  }
  const output = Buffer.from(value, 'base64');
  if (
    output.length === 0 ||
    output.toString('base64').replace(/=+$/u, '') !==
      value.replace(/=+$/u, '')
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
  return {
    buffer: decodeBase64(image.base64),
    mimeType: image.mimeType,
  };
}

/** @param {unknown} value @param {string} mimeType */
function parseClaim(value, mimeType) {
  const claim = requireObject(value, 'claim');
  if (typeof claim.title !== 'string' || !claim.title.trim()) {
    throw new HttpError(400, 'claim.title must not be empty.');
  }
  if (claim.format !== undefined && claim.format !== mimeType) {
    throw new HttpError(400, 'claim.format must match image.mimeType.');
  }
  if (
    claim.generator !== undefined &&
    (typeof claim.generator !== 'string' || !claim.generator.trim())
  ) {
    throw new HttpError(400, 'claim.generator must be a non-empty string.');
  }
  if (
    claim.metadata !== undefined &&
    (!claim.metadata ||
      typeof claim.metadata !== 'object' ||
      Array.isArray(claim.metadata))
  ) {
    throw new HttpError(400, 'claim.metadata must be an object.');
  }
  return {
    title: claim.title.trim(),
    format: mimeType,
    generator:
      typeof claim.generator === 'string' ? claim.generator.trim() : undefined,
    metadata:
      claim.metadata === undefined
        ? undefined
        : { .../** @type {Record<string, unknown>} */ (claim.metadata) },
  };
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

/**
 * @typedef {{
 *   sign(input: {image: Buffer, mimeType: string, locator: string, claim: Record<string, unknown>}): Promise<{image: Buffer, mimeType: string, manifestId?: string}>,
 *   verify(input: {image: Buffer, mimeType: string}): Promise<{valid: boolean, manifestId?: string, validationStatus?: string[], manifest?: unknown}>
 * }} C2paEngine
 */

/**
 * @param {{engine: C2paEngine, maxBodyBytes?: number}} options
 */
export function createRequestHandler({
  engine,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
}) {
  if (!engine || typeof engine.sign !== 'function' || typeof engine.verify !== 'function') {
    throw new Error('A C2PA engine with sign() and verify() is required.');
  }
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new Error('maxBodyBytes must be a positive integer.');
  }

  /**
   * @param {import('node:http').IncomingMessage} request
   * @param {import('node:http').ServerResponse} response
   */
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
      if (request.url === '/sign') {
        const image = parseImage(body.image);
        if (
          typeof body.locator !== 'string' ||
          Buffer.byteLength(body.locator, 'utf8') < 1 ||
          Buffer.byteLength(body.locator, 'utf8') > 12
        ) {
          throw new HttpError(400, 'locator must contain 1 to 12 UTF-8 bytes.');
        }
        if (body.algorithm !== 'dct-qim-v1') {
          throw new HttpError(400, 'algorithm must be dct-qim-v1.');
        }
        const result = await engine.sign({
          image: image.buffer,
          mimeType: image.mimeType,
          locator: body.locator,
          claim: parseClaim(body.claim, image.mimeType),
        });
        response.statusCode = 200;
        response.end(
          JSON.stringify({
            image: {
              base64: result.image.toString('base64'),
              mimeType: result.mimeType,
            },
            manifestId: result.manifestId,
          })
        );
        return;
      }
      if (request.url === '/verify') {
        const image = parseImage(body.image);
        const result = await engine.verify({
          image: image.buffer,
          mimeType: image.mimeType,
        });
        response.statusCode = 200;
        response.end(JSON.stringify(result));
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
              : 'C2PA operation failed.',
        })
      );
    }
  };
}
