/* eslint-disable no-bitwise */

export type ImageOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type MarkerImageFormat =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'gif'
  | 'heif'
  | 'bmp'
  | 'unknown';

export interface MarkerImageInfo {
  /** Display width after applying the encoded orientation. */
  width: number;
  /** Display height after applying the encoded orientation. */
  height: number;
  /** Width stored in the encoded pixel data before orientation is applied. */
  encodedWidth: number;
  /** Height stored in the encoded pixel data before orientation is applied. */
  encodedHeight: number;
  format: MarkerImageFormat;
  mimeType?: string;
  orientation: ImageOrientation;
  rotationDegrees: 0 | 90 | 180 | 270;
  mirrored: boolean;
  requiresNormalization: boolean;
}

interface EncodedImageMetadata {
  width: number;
  height: number;
  format: MarkerImageFormat;
  mimeType?: string;
  orientation?: ImageOrientation;
}

const FORMAT_MIME_TYPES: Partial<Record<MarkerImageFormat, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heif: 'image/heif',
  bmp: 'image/bmp',
};

function assertPositiveDimension(value: unknown, name: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    !Number.isInteger(value)
  ) {
    throw new Error(`Image info ${name} must be a positive integer.`);
  }
  return value;
}

function isOrientation(value: unknown): value is ImageOrientation {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 8
  );
}

function orientationTransform(orientation: ImageOrientation): {
  rotationDegrees: 0 | 90 | 180 | 270;
  mirrored: boolean;
} {
  switch (orientation) {
    case 2:
      return { rotationDegrees: 0, mirrored: true };
    case 3:
      return { rotationDegrees: 180, mirrored: false };
    case 4:
      return { rotationDegrees: 180, mirrored: true };
    case 5:
      return { rotationDegrees: 90, mirrored: true };
    case 6:
      return { rotationDegrees: 90, mirrored: false };
    case 7:
      return { rotationDegrees: 270, mirrored: true };
    case 8:
      return { rotationDegrees: 270, mirrored: false };
    default:
      return { rotationDegrees: 0, mirrored: false };
  }
}

export function createMarkerImageInfo(
  metadata: EncodedImageMetadata
): MarkerImageInfo {
  const encodedWidth = assertPositiveDimension(metadata.width, 'encodedWidth');
  const encodedHeight = assertPositiveDimension(
    metadata.height,
    'encodedHeight'
  );
  const orientation = metadata.orientation ?? 1;
  const transform = orientationTransform(orientation);
  const swapsDimensions = orientation >= 5;
  return {
    width: swapsDimensions ? encodedHeight : encodedWidth,
    height: swapsDimensions ? encodedWidth : encodedHeight,
    encodedWidth,
    encodedHeight,
    format: metadata.format,
    mimeType: metadata.mimeType ?? FORMAT_MIME_TYPES[metadata.format],
    orientation,
    ...transform,
    requiresNormalization: orientation !== 1,
  };
}

function readUint16(
  view: DataView,
  offset: number,
  littleEndian: boolean
): number | undefined {
  return offset >= 0 && offset + 2 <= view.byteLength
    ? view.getUint16(offset, littleEndian)
    : undefined;
}

function readUint32(
  view: DataView,
  offset: number,
  littleEndian: boolean
): number | undefined {
  return offset >= 0 && offset + 4 <= view.byteLength
    ? view.getUint32(offset, littleEndian)
    : undefined;
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || offset + length > bytes.length) {
    return '';
  }
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function parseExifOrientation(
  view: DataView,
  tiffOffset: number,
  endOffset: number
): ImageOrientation | undefined {
  if (tiffOffset + 8 > endOffset) {
    return undefined;
  }
  const byteOrder = view.getUint16(tiffOffset, false);
  const littleEndian =
    byteOrder === 0x4949 ? true : byteOrder === 0x4d4d ? false : undefined;
  if (littleEndian === undefined) {
    return undefined;
  }
  if (readUint16(view, tiffOffset + 2, littleEndian) !== 42) {
    return undefined;
  }
  const ifdRelative = readUint32(view, tiffOffset + 4, littleEndian);
  if (ifdRelative === undefined) {
    return undefined;
  }
  const ifdOffset = tiffOffset + ifdRelative;
  const entryCount = readUint16(view, ifdOffset, littleEndian);
  if (entryCount === undefined) {
    return undefined;
  }
  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (entryOffset + 12 > endOffset) {
      break;
    }
    if (readUint16(view, entryOffset, littleEndian) !== 0x0112) {
      continue;
    }
    const value = readUint16(view, entryOffset + 8, littleEndian);
    return isOrientation(value) ? value : undefined;
  }
  return undefined;
}

function parseJpeg(
  bytes: Uint8Array,
  view: DataView
): EncodedImageMetadata | undefined {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return undefined;
  }
  let offset = 2;
  let orientation: ImageOrientation | undefined;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    let markerOffset = offset + 1;
    while (bytes[markerOffset] === 0xff) {
      markerOffset += 1;
    }
    const marker = bytes[markerOffset];
    offset = markerOffset + 1;
    if (marker === undefined || marker === 0xd9 || marker === 0xda) {
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    const segmentLength = readUint16(view, offset, false);
    if (!segmentLength || segmentLength < 2) {
      break;
    }
    const dataOffset = offset + 2;
    const segmentEnd = offset + segmentLength;
    if (segmentEnd > bytes.length) {
      break;
    }
    if (marker === 0xe1 && ascii(bytes, dataOffset, 6) === 'Exif\u0000\u0000') {
      orientation =
        parseExifOrientation(view, dataOffset + 6, segmentEnd) ?? orientation;
    }
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame && dataOffset + 5 <= segmentEnd) {
      const height = readUint16(view, dataOffset + 1, false);
      const width = readUint16(view, dataOffset + 3, false);
      if (width && height) {
        return {
          width,
          height,
          format: 'jpeg',
          mimeType: 'image/jpeg',
          orientation,
        };
      }
    }
    offset = segmentEnd;
  }
  return undefined;
}

function parsePng(
  bytes: Uint8Array,
  view: DataView
): EncodedImageMetadata | undefined {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === 'PNG' &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    const width = readUint32(view, 16, false);
    const height = readUint32(view, 20, false);
    if (width && height) {
      return { width, height, format: 'png', mimeType: 'image/png' };
    }
  }
  return undefined;
}

function parseGif(
  bytes: Uint8Array,
  view: DataView
): EncodedImageMetadata | undefined {
  const signature = ascii(bytes, 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') {
    return undefined;
  }
  const width = readUint16(view, 6, true);
  const height = readUint16(view, 8, true);
  return width && height
    ? { width, height, format: 'gif', mimeType: 'image/gif' }
    : undefined;
}

function parseWebp(
  bytes: Uint8Array,
  view: DataView
): EncodedImageMetadata | undefined {
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    return undefined;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === 'VP8X' && bytes.length >= 30) {
    const width =
      1 + (bytes[24] ?? 0) + ((bytes[25] ?? 0) << 8) + ((bytes[26] ?? 0) << 16);
    const height =
      1 + (bytes[27] ?? 0) + ((bytes[28] ?? 0) << 8) + ((bytes[29] ?? 0) << 16);
    return { width, height, format: 'webp', mimeType: 'image/webp' };
  }
  if (chunk === 'VP8 ' && bytes.length >= 30) {
    const width = (readUint16(view, 26, true) ?? 0) & 0x3fff;
    const height = (readUint16(view, 28, true) ?? 0) & 0x3fff;
    return width && height
      ? { width, height, format: 'webp', mimeType: 'image/webp' }
      : undefined;
  }
  if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits = readUint32(view, 21, true) ?? 0;
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height, format: 'webp', mimeType: 'image/webp' };
  }
  return undefined;
}

function parseBmp(
  bytes: Uint8Array,
  view: DataView
): EncodedImageMetadata | undefined {
  if (ascii(bytes, 0, 2) !== 'BM' || bytes.length < 26) {
    return undefined;
  }
  const width = view.getInt32(18, true);
  const height = Math.abs(view.getInt32(22, true));
  return width > 0 && height > 0
    ? { width, height, format: 'bmp', mimeType: 'image/bmp' }
    : undefined;
}

const HEIF_BRANDS = new Set([
  'avif',
  'avis',
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'mif1',
  'msf1',
]);

function parseHeif(
  bytes: Uint8Array,
  view: DataView
): EncodedImageMetadata | undefined {
  if (ascii(bytes, 4, 4) !== 'ftyp' || !HEIF_BRANDS.has(ascii(bytes, 8, 4))) {
    return undefined;
  }
  let offset = 0;
  while (offset + 16 <= bytes.length) {
    let size = readUint32(view, offset, false) ?? 0;
    const type = ascii(bytes, offset + 4, 4);
    let headerSize = 8;
    if (size === 1 && offset + 16 <= bytes.length) {
      const high = readUint32(view, offset + 8, false) ?? 0;
      const low = readUint32(view, offset + 12, false) ?? 0;
      if (high !== 0) {
        break;
      }
      size = low;
      headerSize = 16;
    }
    if (size < headerSize || offset + size > bytes.length) {
      break;
    }
    if (type === 'ispe' && size >= headerSize + 12) {
      const width = readUint32(view, offset + headerSize + 4, false);
      const height = readUint32(view, offset + headerSize + 8, false);
      if (width && height) {
        return { width, height, format: 'heif', mimeType: 'image/heif' };
      }
    }
    // `ispe` is nested, so inspect child bytes instead of requiring a full ISO
    // BMFF parser. This is safe because the dimensions are validated below.
    const nestedIndex = bytes.subarray(offset + headerSize, offset + size);
    for (let index = 0; index + 20 <= nestedIndex.length; index += 1) {
      if (ascii(nestedIndex, index + 4, 4) === 'ispe') {
        const width = readUint32(
          new DataView(
            nestedIndex.buffer,
            nestedIndex.byteOffset,
            nestedIndex.byteLength
          ),
          index + 12,
          false
        );
        const height = readUint32(
          new DataView(
            nestedIndex.buffer,
            nestedIndex.byteOffset,
            nestedIndex.byteLength
          ),
          index + 16,
          false
        );
        if (width && height) {
          return { width, height, format: 'heif', mimeType: 'image/heif' };
        }
      }
    }
    offset += size;
  }
  return undefined;
}

/** Parse encoded metadata without decoding the image pixels. */
export function parseEncodedImageInfo(
  input: ArrayBuffer | ArrayBufferView
): MarkerImageInfo {
  const bytes =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const metadata =
    parseJpeg(bytes, view) ??
    parsePng(bytes, view) ??
    parseGif(bytes, view) ??
    parseWebp(bytes, view) ??
    parseBmp(bytes, view) ??
    parseHeif(bytes, view);
  if (!metadata) {
    throw new Error('Unsupported or invalid encoded image.');
  }
  return createMarkerImageInfo(metadata);
}

export function parseNativeImageInfo(serialized: string): MarkerImageInfo {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error('Native image metadata reader returned invalid JSON.');
  }
  if (!value || typeof value !== 'object') {
    throw new Error('Native image metadata reader returned invalid data.');
  }
  const candidate = value as Partial<MarkerImageInfo>;
  const allowedFormats: readonly MarkerImageFormat[] = [
    'jpeg',
    'png',
    'webp',
    'gif',
    'heif',
    'bmp',
    'unknown',
  ];
  if (
    !allowedFormats.includes(candidate.format as MarkerImageFormat) ||
    !isOrientation(candidate.orientation) ||
    (candidate.mimeType !== undefined && typeof candidate.mimeType !== 'string')
  ) {
    throw new Error('Native image metadata reader returned invalid data.');
  }
  const info = createMarkerImageInfo({
    width: assertPositiveDimension(candidate.encodedWidth, 'encodedWidth'),
    height: assertPositiveDimension(candidate.encodedHeight, 'encodedHeight'),
    format: candidate.format as MarkerImageFormat,
    mimeType: candidate.mimeType,
    orientation: candidate.orientation,
  });
  if (
    candidate.width !== info.width ||
    candidate.height !== info.height ||
    candidate.rotationDegrees !== info.rotationDegrees ||
    candidate.mirrored !== info.mirrored ||
    candidate.requiresNormalization !== info.requiresNormalization
  ) {
    throw new Error('Native image metadata reader returned inconsistent data.');
  }
  return info;
}
