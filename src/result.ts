export type MarkerOperation =
  | 'mark'
  | 'markText'
  | 'markImage'
  | 'embedInvisible'
  | 'detectInvisible';

export type MarkerOutputFormat = 'png' | 'jpeg' | 'webp';

export interface MarkerMetadataResult {
  /** Source orientation is applied to pixels and output orientation is upright. */
  orientation: 'normalized';
  /**
   * Core v2 strips EXIF/GPS and other source metadata by default so stale or
   * sensitive source claims are not copied onto newly rendered pixels.
   */
  policy: 'strip';
}

export interface MarkerResult {
  /** Stable identifier shared by progress, errors, and native cancellation. */
  jobId: string;
  /** Public operation that produced this result. */
  operation: MarkerOperation;
  /** File path/URI on native or data URL in a browser/base64 request. */
  uri: string;
  /** Whether `uri` points at a file or embeds the encoded bytes. */
  output: 'file' | 'data-url';
  format: MarkerOutputFormat;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Total JavaScript-observed operation duration. */
  durationMs: number;
  metadata: MarkerMetadataResult;
  /** Requested output basename, when supplied. */
  filename?: string;
}

export interface MarkerResultDescriptor {
  operation: MarkerOperation;
  saveFormat?: 'png' | 'jpg' | 'webp' | 'base64';
  filename?: string;
}

function resolveFormat(
  saveFormat?: MarkerResultDescriptor['saveFormat'],
  uri?: string
): MarkerOutputFormat {
  if (uri?.startsWith('data:image/png')) return 'png';
  if (uri?.startsWith('data:image/jpeg')) return 'jpeg';
  if (uri?.startsWith('data:image/webp')) return 'webp';
  if (saveFormat === 'webp') return 'webp';
  return saveFormat === 'png' || saveFormat === 'base64' ? 'png' : 'jpeg';
}

export function createMarkerResult(
  jobId: string,
  uri: string,
  durationMs: number,
  descriptor: MarkerResultDescriptor
): MarkerResult {
  if (typeof uri !== 'string' || !uri) {
    throw new Error('The renderer returned an empty output URI.');
  }
  const format = resolveFormat(descriptor.saveFormat, uri);
  const result: MarkerResult = {
    jobId,
    operation: descriptor.operation,
    uri,
    output: uri.startsWith('data:') ? 'data-url' : 'file',
    format,
    mimeType:
      format === 'png'
        ? 'image/png'
        : format === 'webp'
        ? 'image/webp'
        : 'image/jpeg',
    durationMs: Math.max(0, durationMs),
    metadata: {
      orientation: 'normalized',
      policy: 'strip',
    },
  };
  if (descriptor.filename !== undefined) {
    result.filename = descriptor.filename;
  }
  return result;
}
