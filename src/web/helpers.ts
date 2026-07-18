import type { PositionOptions } from '../index';

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface RotatedBounds extends Size {
  left: number;
  top: number;
}

export interface CanvasEncoder {
  width: number;
  height: number;
  toDataURL(type?: string, quality?: number): string;
  toBlob?(
    callback: (blob: Blob | null) => void,
    type?: string,
    quality?: number
  ): void;
}

export type WebOutputFormat = 'png' | 'jpg' | 'base64';

const DEFAULT_EDGE_INSET = 20;
export const DEFAULT_WEB_MAX_SIZE = 2048;

/** Fit an image inside the same square pixel bound used by native loaders. */
export function fitSizeWithinMax(
  size: Size,
  maxSize = DEFAULT_WEB_MAX_SIZE
): Size {
  if (!Number.isFinite(maxSize) || !Number.isInteger(maxSize) || maxSize <= 0) {
    throw new Error('maxSize must be a positive finite integer.');
  }
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new Error('image dimensions must be finite numbers greater than 0.');
  }

  const largestDimension = Math.max(size.width, size.height);
  if (largestDimension <= maxSize) {
    return { ...size };
  }

  const ratio = maxSize / largestDimension;
  return {
    width: Math.max(Math.min(Math.round(size.width * ratio), maxSize), 1),
    height: Math.max(Math.min(Math.round(size.height * ratio), maxSize), 1),
  };
}

/** Resolve a pixel or percentage value against one canvas axis. */
export function resolveSpreadValue(
  value: number | string | undefined,
  relativeTo: number
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = value.trim();
  const parsed = Number.parseFloat(
    normalized.endsWith('%') ? normalized.slice(0, -1) : normalized
  );
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return normalized.endsWith('%') ? (relativeTo * parsed) / 100 : parsed;
}

/**
 * Resolve the top-left point of an item using the same directional semantics
 * as the native renderers. Named anchors default to a 20px inset; explicit
 * X/Y values replace the inset on their respective axes.
 */
export function resolveAnchoredPosition(
  options: PositionOptions | undefined,
  canvas: Size,
  item: Size,
  unanchoredDefaultInset = DEFAULT_EDGE_INSET
): Point {
  const explicitX = resolveSpreadValue(options?.X, canvas.width);
  const explicitY = resolveSpreadValue(options?.Y, canvas.height);
  const configuredInsetX = resolveSpreadValue(options?.edgeInset, canvas.width);
  const configuredInsetY = resolveSpreadValue(
    options?.edgeInset,
    canvas.height
  );
  const anchor = options?.position as string | undefined;

  if (!anchor) {
    return {
      x: explicitX ?? Math.max(configuredInsetX ?? unanchoredDefaultInset, 0),
      y: explicitY ?? Math.max(configuredInsetY ?? unanchoredDefaultInset, 0),
    };
  }

  const insetX = Math.max(configuredInsetX ?? DEFAULT_EDGE_INSET, 0);
  const insetY = Math.max(configuredInsetY ?? DEFAULT_EDGE_INSET, 0);
  const centeredX = (canvas.width - item.width) / 2;
  const centeredY = (canvas.height - item.height) / 2;

  let x = centeredX;
  let y = centeredY;

  switch (anchor) {
    case 'topLeft':
    case 'bottomLeft':
      x = insetX;
      break;
    case 'topRight':
    case 'bottomRight':
      x = canvas.width - item.width - insetX;
      break;
    case 'topCenter':
    case 'bottomCenter':
    case 'center':
      x = centeredX;
      break;
    default:
      return {
        x: explicitX ?? Math.max(configuredInsetX ?? unanchoredDefaultInset, 0),
        y: explicitY ?? Math.max(configuredInsetY ?? unanchoredDefaultInset, 0),
      };
  }

  switch (anchor) {
    case 'topLeft':
    case 'topCenter':
    case 'topRight':
      y = insetY;
      break;
    case 'bottomLeft':
    case 'bottomCenter':
    case 'bottomRight':
      y = canvas.height - item.height - insetY;
      break;
    case 'center':
      y = centeredY;
      break;
  }

  if (explicitX !== undefined) {
    if (anchor === 'topRight' || anchor === 'bottomRight') {
      x = canvas.width - item.width - explicitX;
    } else if (
      anchor === 'topCenter' ||
      anchor === 'bottomCenter' ||
      anchor === 'center'
    ) {
      x = centeredX + explicitX;
    } else {
      x = explicitX;
    }
  }

  if (explicitY !== undefined) {
    if (
      anchor === 'bottomLeft' ||
      anchor === 'bottomCenter' ||
      anchor === 'bottomRight'
    ) {
      y = canvas.height - item.height - explicitY;
    } else if (anchor === 'center') {
      y = centeredY + explicitY;
    } else {
      y = explicitY;
    }
  }

  return { x, y };
}

export function degreesToRadians(degrees: number): number {
  if (!Number.isFinite(degrees)) {
    return 0;
  }
  return ((degrees % 360) * Math.PI) / 180;
}

/** Bounds of a rectangle rotated around its top-left origin. */
export function getRotatedBounds(size: Size, degrees: number): RotatedBounds {
  const radians = degreesToRadians(degrees);
  if (radians === 0) {
    return { left: 0, top: 0, ...size };
  }

  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const points = [
    { x: 0, y: 0 },
    { x: size.width * cosine, y: size.width * sine },
    { x: -size.height * sine, y: size.height * cosine },
    {
      x: size.width * cosine - size.height * sine,
      y: size.width * sine + size.height * cosine,
    },
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

export function getExpandedCanvasSize(size: Size, degrees: number): Size {
  const bounds = getRotatedBounds(size, degrees);
  return {
    width: Math.max(Math.ceil(bounds.width - 1e-7), 1),
    height: Math.max(Math.ceil(bounds.height - 1e-7), 1),
  };
}

export function normalizeQuality(quality: number | undefined): number {
  const resolved = quality ?? 100;
  if (
    !Number.isFinite(resolved) ||
    !Number.isInteger(resolved) ||
    resolved < 0 ||
    resolved > 100
  ) {
    throw new Error('quality must be a finite integer between 0 and 100.');
  }
  return resolved;
}

export function normalizeOutputFormat(
  format: string | undefined
): WebOutputFormat {
  const resolved = format ?? 'jpg';
  if (resolved !== 'png' && resolved !== 'jpg' && resolved !== 'base64') {
    throw new Error(`Unsupported web image format: ${resolved}.`);
  }
  return resolved;
}

/** Serialize a rendered canvas and turn browser security failures into a useful CORS error. */
export function encodeCanvas(
  canvas: CanvasEncoder,
  format: string | undefined,
  quality: number | undefined
): string {
  const normalizedFormat = normalizeOutputFormat(format);
  const normalizedQuality = normalizeQuality(quality);
  const mimeType = normalizedFormat === 'jpg' ? 'image/jpeg' : 'image/png';

  try {
    const dataUrl = canvas.toDataURL(mimeType, normalizedQuality / 100);
    if (!dataUrl.startsWith('data:image/')) {
      throw new Error('The browser could not encode the rendered canvas.');
    }
    return dataUrl;
  } catch (error) {
    const errorName =
      error && typeof error === 'object' && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';
    if (errorName === 'SecurityError') {
      throw new Error(
        'Unable to export the canvas because an image tainted it. Configure CORS on remote images (Access-Control-Allow-Origin) or use a local file/data URL.'
      );
    }
    throw error;
  }
}

/** Encode a rendered canvas without expanding its bytes into a data URL. */
export function encodeCanvasToBlob(
  canvas: CanvasEncoder,
  format: string | undefined,
  quality: number | undefined
): Promise<Blob> {
  const normalizedFormat = normalizeOutputFormat(format);
  const normalizedQuality = normalizeQuality(quality);
  const mimeType = normalizedFormat === 'jpg' ? 'image/jpeg' : 'image/png';
  if (typeof canvas.toBlob !== 'function') {
    return Promise.reject(
      new Error('This browser does not support Canvas toBlob() encoding.')
    );
  }

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob!(
        (blob) => {
          if (!blob) {
            reject(
              new Error('The browser could not encode the rendered canvas.')
            );
            return;
          }
          if (blob.type !== mimeType) {
            reject(
              new Error(
                `The browser encoded an unexpected MIME type: ${
                  blob.type || 'empty'
                }.`
              )
            );
            return;
          }
          resolve(blob);
        },
        mimeType,
        normalizedQuality / 100
      );
    } catch (error) {
      const errorName =
        error && typeof error === 'object' && 'name' in error
          ? String((error as { name?: unknown }).name)
          : '';
      if (errorName === 'SecurityError') {
        reject(
          new Error(
            'Unable to export the canvas because an image tainted it. Configure CORS on remote images (Access-Control-Allow-Origin) or use a local file/data URL.'
          )
        );
        return;
      }
      reject(error);
    }
  });
}
