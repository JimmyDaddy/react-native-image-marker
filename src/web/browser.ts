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
  fillStyle: unknown;
  font: string;
  textAlign: string;
  textBaseline: string;
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
  getImageData(
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): { data: ArrayLike<number> };
}

export interface WebTextMetrics {
  width: number;
  actualBoundingBoxAscent?: number;
  actualBoundingBoxDescent?: number;
  fontBoundingBoxAscent?: number;
  fontBoundingBoxDescent?: number;
}

interface WebImageElement {
  [key: string]: unknown;
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

function createImageElement(): WebImageElement {
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

/** Load a browser drawable from a URL, data URL, {uri}, Blob/File, or image element. */
export async function loadWebImage(source: unknown): Promise<LoadedWebImage> {
  if (isImageLike(source)) {
    const dimensions = getImageDimensions(source);
    if (!dimensions) {
      throw new Error('The supplied image has no drawable dimensions.');
    }
    return { image: source, ...dimensions, cleanup() {} };
  }

  const runtime = getBrowserRuntime();
  let objectUrl: string | undefined;
  let uri = resolveImageUri(source);

  if (!uri && isBlobLike(source)) {
    const createObjectURL = runtime.URL?.createObjectURL;
    if (!createObjectURL) {
      throw new Error('This browser cannot load Blob/File image sources.');
    }
    objectUrl = createObjectURL(source);
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

  const image = createImageElement();
  if (remoteUrl(uri)) {
    image.crossOrigin = 'anonymous';
  }

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => {
        const corsHint = remoteUrl(uri as string)
          ? ' The server must allow cross-origin image access with Access-Control-Allow-Origin.'
          : '';
        reject(new Error(`Unable to load web image.${corsHint}`));
      };
      image.src = uri as string;

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
      cleanup() {
        if (objectUrl) {
          runtime.URL?.revokeObjectURL?.(objectUrl);
        }
      },
    };
  } catch (error) {
    if (objectUrl) {
      runtime.URL?.revokeObjectURL?.(objectUrl);
    }
    throw error;
  } finally {
    image.onload = null;
    image.onerror = null;
  }
}

export function createWebCanvas(width: number, height: number): WebCanvas {
  const runtime = getBrowserRuntime();
  const canvas = runtime.document?.createElement('canvas');
  if (!canvas || typeof canvas !== 'object') {
    throw new Error(
      'WebMarker requires Canvas 2D. Importing it during SSR is supported, but mark*() must run in a browser with canvas support.'
    );
  }

  const result = canvas as WebCanvas;
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
