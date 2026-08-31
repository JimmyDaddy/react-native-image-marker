import { createMarkerImageInfo, parseEncodedImageInfo } from '../image-info';
import type { MarkerImageFormat, MarkerImageInfo } from '../image-info';

export interface WebCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): WebCanvasContext | null;
  toDataURL(type?: string, quality?: number): string;
  toBlob(
    callback: (blob: Blob | null) => void,
    type?: string,
    quality?: number
  ): void;
}

export interface WebCanvasContext {
  [key: string]: unknown;
  canvas: WebCanvas;
  globalAlpha: number;
  globalCompositeOperation: string;
  fillStyle: unknown;
  font: string;
  textAlign: string;
  textBaseline: string;
  direction?: string;
  letterSpacing?: string;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  imageSmoothingEnabled: boolean;
  lineJoin: string;
  lineWidth: number;
  strokeStyle: unknown;
  save(): void;
  restore(): void;
  beginPath(): void;
  closePath(): void;
  clip(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  rect(x: number, y: number, width: number, height: number): void;
  fill(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ): void;
  drawImage(...args: unknown[]): void;
  fillText(text: string, x: number, y: number): void;
  strokeText(text: string, x: number, y: number): void;
  measureText(text: string): WebTextMetrics;
  getImageData(sx: number, sy: number, sw: number, sh: number): WebImageData;
  putImageData(imageData: WebImageData, dx: number, dy: number): void;
}

export interface WebImageData {
  data: Uint8Array | Uint8ClampedArray;
  width?: number;
  height?: number;
}

export interface WebTextMetrics {
  width: number;
  actualBoundingBoxAscent?: number;
  actualBoundingBoxDescent?: number;
  fontBoundingBoxAscent?: number;
  fontBoundingBoxDescent?: number;
}

export interface WebImageElement {
  src: string;
  crossOrigin?: string | null;
  complete?: boolean;
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  onload: (() => void) | null;
  onerror: ((event?: unknown) => void) | null;
  decode?: () => Promise<void>;
}

interface BrowserRuntime {
  document?: {
    createElement(name: string): unknown;
  };
  Image?: new () => WebImageElement;
  URL?: {
    createObjectURL?: (source: unknown) => string;
    revokeObjectURL?: (url: string) => void;
  };
}

/**
 * DOM-adjacent resources used by a Web Marker instance. Providing this object
 * keeps object-URL ownership with the instance and makes browser APIs
 * replaceable by a desktop host without changing rendering algorithms.
 */
export interface WebResourceAdapter {
  /** Standard `new Image()` and `document.createElement('img')` both fit. */
  createImage?: () => unknown;
  /** Standard `document.createElement('canvas')` fits without a cast. */
  createCanvas?: (width: number, height: number) => unknown;
  createObjectURL?: (source: Blob) => string;
  revokeObjectURL?: (url: string) => void;
  /** Optional byte reader for File/Blob policy boundaries. */
  readBlobBytes?: (source: Blob) => Promise<ArrayBuffer>;
}

export interface LoadedWebImage {
  image: unknown;
  width: number;
  height: number;
  cleanup(): void;
}

function getBrowserRuntime(): BrowserRuntime {
  return globalThis as unknown as BrowserRuntime;
}

function getImageDimensions(image: WebImageElement): {
  width: number;
  height: number;
} | null {
  const width = image.naturalWidth ?? image.width ?? 0;
  const height = image.naturalHeight ?? image.height ?? 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

function isImageLike(value: unknown): value is WebImageElement {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<WebImageElement> & {
    close?: unknown;
    getContext?: unknown;
    videoWidth?: unknown;
  };
  const hasDrawableIdentity =
    'naturalWidth' in candidate ||
    'complete' in candidate ||
    typeof candidate.decode === 'function' ||
    typeof candidate.close === 'function' ||
    typeof candidate.getContext === 'function' ||
    typeof candidate.videoWidth === 'number';
  return (
    hasDrawableIdentity &&
    Boolean(getImageDimensions(candidate as WebImageElement))
  );
}

function isBlobLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const tag = Object.prototype.toString.call(value);
  if (tag === '[object Blob]' || tag === '[object File]') {
    return true;
  }
  const candidate = value as {
    arrayBuffer?: unknown;
    size?: unknown;
    type?: unknown;
  };
  return (
    typeof candidate.arrayBuffer === 'function' &&
    typeof candidate.size === 'number' &&
    typeof candidate.type === 'string'
  );
}

function resolveImageUri(source: unknown): string | null {
  if (typeof source === 'string') {
    return source;
  }
  if (!source || typeof source !== 'object') {
    return null;
  }

  const candidate = source as {
    uri?: unknown;
    src?: unknown;
    href?: unknown;
    default?: unknown;
  };
  if (typeof candidate.uri === 'string') {
    return candidate.uri;
  }
  if (typeof candidate.src === 'string') {
    return candidate.src;
  }
  if (typeof candidate.href === 'string') {
    return candidate.href;
  }
  if (typeof candidate.default === 'string') {
    return candidate.default;
  }
  if (candidate.default && candidate.default !== source) {
    return resolveImageUri(candidate.default);
  }
  return null;
}

function inferImageFormat(
  uri: string | null,
  mimeType?: string
): MarkerImageFormat {
  const normalizedMimeType = mimeType?.split(';', 1)[0]?.toLowerCase();
  if (normalizedMimeType === 'image/jpeg') return 'jpeg';
  if (normalizedMimeType === 'image/png') return 'png';
  if (normalizedMimeType === 'image/webp') return 'webp';
  if (normalizedMimeType === 'image/gif') return 'gif';
  if (
    normalizedMimeType === 'image/heif' ||
    normalizedMimeType === 'image/heic' ||
    normalizedMimeType === 'image/avif'
  ) {
    return 'heif';
  }
  if (normalizedMimeType === 'image/bmp') return 'bmp';

  const pathname = uri?.split(/[?#]/u, 1)[0]?.toLowerCase() ?? '';
  if (/\.(?:jpe?g)$/u.test(pathname)) return 'jpeg';
  if (/\.png$/u.test(pathname)) return 'png';
  if (/\.webp$/u.test(pathname)) return 'webp';
  if (/\.gif$/u.test(pathname)) return 'gif';
  if (/\.(?:heic|heif|avif)$/u.test(pathname)) return 'heif';
  if (/\.bmp$/u.test(pathname)) return 'bmp';
  return 'unknown';
}

function decodeDataUrl(
  uri: string
): { data: ArrayBuffer; mimeType?: string } | null {
  const match = /^data:([^,]*?),(.*)$/su.exec(uri);
  if (!match) return null;
  const metadata = match[1] ?? '';
  const payload = match[2] ?? '';
  const mimeType = metadata.split(';', 1)[0] || undefined;
  try {
    if (/(?:^|;)base64(?:;|$)/iu.test(metadata)) {
      const decode = (
        globalThis as unknown as {
          atob?: (value: string) => string;
        }
      ).atob;
      if (!decode) return null;
      const decoded = decode(payload.replace(/\s/gu, ''));
      const bytes = Uint8Array.from(decoded, (character) =>
        character.charCodeAt(0)
      );
      return { data: bytes.buffer as ArrayBuffer, mimeType };
    }
    return { data: decodePercentEncodedDataUrl(payload), mimeType };
  } catch {
    return null;
  }
}

function encodeUtf8(value: string): ArrayBuffer {
  const TextEncoderClass = (
    globalThis as unknown as {
      TextEncoder?: new () => { encode(value: string): Uint8Array };
    }
  ).TextEncoder;
  if (TextEncoderClass) {
    return new TextEncoderClass().encode(value).buffer as ArrayBuffer;
  }

  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    const second = value.charCodeAt(index + 1);
    let codePoint = first;
    if (
      first >= 0xd800 &&
      first <= 0xdbff &&
      second >= 0xdc00 &&
      second <= 0xdfff
    ) {
      index += 1;
      codePoint = (first - 0xd800) * 0x400 + second - 0xdc00 + 0x10000;
    }
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(
        0xc0 + Math.floor(codePoint / 0x40),
        0x80 + (codePoint % 0x40)
      );
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 + Math.floor(codePoint / 0x1000),
        0x80 + (Math.floor(codePoint / 0x40) % 0x40),
        0x80 + (codePoint % 0x40)
      );
    } else {
      bytes.push(
        0xf0 + Math.floor(codePoint / 0x40000),
        0x80 + (Math.floor(codePoint / 0x1000) % 0x40),
        0x80 + (Math.floor(codePoint / 0x40) % 0x40),
        0x80 + (codePoint % 0x40)
      );
    }
  }
  return Uint8Array.from(bytes).buffer as ArrayBuffer;
}

/** Decode `%xx` as bytes, keeping unescaped Unicode text encoded as UTF-8. */
function decodePercentEncodedDataUrl(payload: string): ArrayBuffer {
  const bytes: number[] = [];
  let text = '';
  const appendText = (): void => {
    if (!text) return;
    bytes.push(...new Uint8Array(encodeUtf8(text)));
    text = '';
  };

  for (let index = 0; index < payload.length; index += 1) {
    if (payload[index] !== '%' || index + 2 >= payload.length) {
      text += payload[index];
      continue;
    }
    const encoded = payload.slice(index + 1, index + 3);
    if (!/^[\da-f]{2}$/iu.test(encoded)) {
      text += payload[index];
      continue;
    }
    appendText();
    bytes.push(Number.parseInt(encoded, 16));
    index += 2;
  }
  appendText();
  return Uint8Array.from(bytes).buffer as ArrayBuffer;
}

async function readEncodedImageSource(
  source: unknown,
  resources?: WebResourceAdapter,
  signal?: AbortSignal
): Promise<{ data: ArrayBuffer; mimeType?: string } | null> {
  if (signal?.aborted) throw createAbortError();
  if (isBlobLike(source)) {
    const blob = source as {
      arrayBuffer(): Promise<ArrayBuffer>;
      type?: string;
    };
    const data = resources?.readBlobBytes
      ? await resources.readBlobBytes(source as Blob)
      : await blob.arrayBuffer();
    if (signal?.aborted) throw createAbortError();
    return { data, mimeType: blob.type || undefined };
  }

  const uri = resolveImageUri(source);
  if (uri?.startsWith('data:')) {
    if (signal?.aborted) throw createAbortError();
    return decodeDataUrl(uri);
  }
  const fetchImage = (globalThis as { fetch?: typeof fetch }).fetch;
  if (!uri || !fetchImage) {
    return null;
  }
  try {
    const response = signal
      ? await fetchImage(uri, { signal })
      : await fetchImage(uri);
    if (!response.ok && !uri.startsWith('data:')) {
      return null;
    }
    const data = await response.arrayBuffer();
    if (signal?.aborted) throw createAbortError();
    return {
      data,
      mimeType: response.headers.get('content-type') ?? undefined,
    };
  } catch {
    if (signal?.aborted) throw createAbortError();
    return null;
  }
}

/**
 * Read dimensions, encoded format, and orientation without rendering a
 * composition. Encoded bytes are preferred so EXIF orientation remains
 * observable; drawable dimensions are the cross-origin fallback.
 */
export async function getWebImageInfo(
  source: unknown,
  resources?: WebResourceAdapter,
  signal?: AbortSignal
): Promise<MarkerImageInfo> {
  if (signal?.aborted) throw createAbortError();
  const encoded = await readEncodedImageSource(source, resources, signal);
  if (encoded) {
    try {
      const info = parseEncodedImageInfo(encoded.data);
      return encoded.mimeType && !info.mimeType
        ? { ...info, mimeType: encoded.mimeType }
        : info;
    } catch {
      // SVG and browser-specific formats can still be drawable. Continue with
      // decoded dimensions rather than rejecting a valid browser image.
    }
  }

  const loaded = await loadWebImage(source, resources, signal);
  try {
    const uri = resolveImageUri(source);
    const mimeType =
      encoded?.mimeType ||
      (isBlobLike(source)
        ? (source as { type?: string }).type || undefined
        : undefined);
    return createMarkerImageInfo({
      width: Math.round(loaded.width),
      height: Math.round(loaded.height),
      format: inferImageFormat(uri, mimeType),
      mimeType,
      orientation: 1,
    });
  } finally {
    loaded.cleanup();
  }
}

function createImageElement(resources?: WebResourceAdapter): WebImageElement {
  if (resources?.createImage) {
    const image = resources.createImage();
    if (!image || typeof image !== 'object' || !('src' in image)) {
      throw new Error('Web Marker resource adapter returned an invalid image.');
    }
    return image as WebImageElement;
  }
  const runtime = getBrowserRuntime();
  if (runtime.Image) {
    return new runtime.Image();
  }
  const element = runtime.document?.createElement('img');
  if (element && typeof element === 'object') {
    return element as WebImageElement;
  }
  throw new Error(
    'WebMarker requires a browser image runtime. Importing it during SSR is supported, but mark*() must run in the browser.'
  );
}

function remoteUrl(uri: string): boolean {
  return /^(?:https?:)?\/\//i.test(uri);
}

function createAbortError(): Error {
  const error = new Error('Web image loading was aborted.');
  error.name = 'AbortError';
  return error;
}

/** Load a browser drawable from a URL, data URL, {uri}, Blob/File, or image element. */
export async function loadWebImage(
  source: unknown,
  resources?: WebResourceAdapter,
  signal?: AbortSignal
): Promise<LoadedWebImage> {
  if (signal?.aborted) {
    throw createAbortError();
  }
  if (isImageLike(source)) {
    const dimensions = getImageDimensions(source);
    if (!dimensions) {
      throw new Error('The supplied image has no drawable dimensions.');
    }
    return { image: source, ...dimensions, cleanup() {} };
  }

  let objectUrl: string | undefined;
  let uri = resolveImageUri(source);

  if (!uri && isBlobLike(source)) {
    const runtime = getBrowserRuntime();
    const createObjectURL =
      resources?.createObjectURL ?? runtime.URL?.createObjectURL;
    if (!createObjectURL) {
      throw new Error('This browser cannot load Blob/File image sources.');
    }
    objectUrl = createObjectURL(source as Blob);
    uri = objectUrl;
  }

  if (!uri) {
    if (typeof source === 'number') {
      throw new Error(
        'Numeric React Native asset IDs are not available on web. Pass the bundler-resolved URL, { uri }, a data URL, Blob, or File instead.'
      );
    }
    throw new Error(
      'Unsupported web image source. Expected a URL, data URL, { uri }, Blob, File, or loaded image element.'
    );
  }

  let image: WebImageElement;
  try {
    image = createImageElement(resources);
  } catch (error) {
    if (objectUrl) {
      const runtime = getBrowserRuntime();
      try {
        (resources?.revokeObjectURL ?? runtime.URL?.revokeObjectURL)?.(
          objectUrl
        );
      } catch {
        // Preserve the image-factory error; cleanup must not conceal it.
      }
    }
    throw error;
  }
  if (remoteUrl(uri)) {
    image.crossOrigin = 'anonymous';
  }

  let cleanedUp = false;
  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    image.onload = null;
    image.onerror = null;
    signal?.removeEventListener('abort', abort);
    if (objectUrl) {
      const runtime = getBrowserRuntime();
      (resources?.revokeObjectURL ?? runtime.URL?.revokeObjectURL)?.(objectUrl);
      objectUrl = undefined;
    }
  };
  let rejectLoading: ((reason: unknown) => void) | undefined;
  const abort = (): void => {
    image.src = '';
    cleanup();
    rejectLoading?.(createAbortError());
  };

  try {
    await new Promise<void>((resolve, reject) => {
      rejectLoading = reject;
      image.onload = () => resolve();
      image.onerror = () => {
        const corsHint = remoteUrl(uri as string)
          ? ' The server must allow cross-origin image access with Access-Control-Allow-Origin.'
          : '';
        reject(new Error(`Unable to load web image.${corsHint}`));
      };
      image.src = uri as string;

      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) {
        abort();
        return;
      }

      if (image.complete && getImageDimensions(image)) {
        resolve();
      }
    });

    if (image.decode) {
      try {
        await image.decode();
      } catch {
        // onload already proved that the image is drawable. Some browsers reject
        // decode() after resolving cached images, so this is intentionally best effort.
      }
    }

    const dimensions = getImageDimensions(image);
    if (!dimensions) {
      throw new Error('The loaded image has no drawable dimensions.');
    }

    return {
      image,
      ...dimensions,
      cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  } finally {
    image.onload = null;
    image.onerror = null;
  }
}

export function createWebCanvas(
  width: number,
  height: number,
  resources?: WebResourceAdapter
): WebCanvas {
  const runtime = getBrowserRuntime();
  const canvas =
    resources?.createCanvas?.(width, height) ??
    runtime.document?.createElement('canvas');
  if (!canvas || typeof canvas !== 'object') {
    throw new Error(
      'WebMarker requires Canvas 2D. Importing it during SSR is supported, but mark*() must run in a browser with canvas support.'
    );
  }

  const result = canvas as WebCanvas;
  if (typeof result.getContext !== 'function') {
    throw new Error('Web Marker resource adapter returned an invalid canvas.');
  }
  result.width = Math.max(Math.round(width), 1);
  result.height = Math.max(Math.round(height), 1);
  if (!result.getContext('2d')) {
    throw new Error('Canvas 2D is unavailable in this browser.');
  }
  return result;
}

export function getCanvasContext(canvas: WebCanvas): WebCanvasContext {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D is unavailable in this browser.');
  }
  return context;
}

export function getSecurityErrorMessage(operation: string): string {
  return `Unable to ${operation} because a remote image tainted the canvas. Configure Access-Control-Allow-Origin on the image server or use a local file/data URL.`;
}
