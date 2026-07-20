import { runWatermarkBatch } from './batch';
import type { WatermarkBatchOptions, WatermarkBatchResult } from './batch';
import {
  detectInvisibleWatermarkPixelsAsync,
  embedInvisibleWatermarkPixels,
  validateDetectInvisibleOptions,
  validateEmbedInvisibleOptions,
} from './invisible-watermark';
import type {
  DetectInvisibleWatermarkOptions,
  EmbedInvisibleWatermarkOptions,
  InvisibleWatermarkDetectionResult,
  InvisibleWatermarkPixelBuffer,
} from './invisible-watermark';

const DEFAULT_RUNTIME_MAX_SIZE = 2048;

/** RGBA pixels decoded in display orientation by a server-side image codec. */
export interface InvisibleWatermarkDecodedImage
  extends InvisibleWatermarkPixelBuffer {}

/** Image I/O boundary used by the dependency-free trace runtime. */
export interface InvisibleWatermarkCodec<Source, Output> {
  decode(
    source: Source,
    options: { maxSize: number }
  ): Promise<InvisibleWatermarkDecodedImage>;
  encode(
    image: InvisibleWatermarkDecodedImage,
    options: {
      format: 'jpeg' | 'png';
      quality: number;
      filename?: string;
    }
  ): Promise<Output>;
}

export interface InvisibleWatermarkRuntimeOptions<Source, Output> {
  codec: InvisibleWatermarkCodec<Source, Output>;
  /** Hard upper bound for parallel codec/CPU work. @defaultValue 4 */
  maxConcurrency?: number;
}

export type RuntimeEmbedInvisibleWatermarkOptions<Source> = Omit<
  EmbedInvisibleWatermarkOptions,
  'image' | 'saveFormat'
> & {
  image: { src: Source };
  saveFormat?: 'png' | 'jpg';
};

export type RuntimeDetectInvisibleWatermarkOptions<Source> = Omit<
  DetectInvisibleWatermarkOptions,
  'image' | 'worker'
> & {
  image: { src: Source };
};

export interface InvisibleWatermarkRuntime<Source, Output> {
  embedInvisible(
    options: RuntimeEmbedInvisibleWatermarkOptions<Source>
  ): Promise<Output>;
  detectInvisible(
    options: RuntimeDetectInvisibleWatermarkOptions<Source>
  ): Promise<InvisibleWatermarkDetectionResult>;
  embedInvisibleMany(
    inputs: readonly RuntimeEmbedInvisibleWatermarkOptions<Source>[],
    options?: WatermarkBatchOptions<Output>
  ): Promise<Array<WatermarkBatchResult<Output>>>;
  detectInvisibleMany(
    inputs: readonly RuntimeDetectInvisibleWatermarkOptions<Source>[],
    options?: WatermarkBatchOptions<InvisibleWatermarkDetectionResult>
  ): Promise<Array<WatermarkBatchResult<InvisibleWatermarkDetectionResult>>>;
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite integer.`);
  }
}

function validateDecodedImage(
  image: InvisibleWatermarkDecodedImage,
  maxSize: number
): void {
  if (
    !image ||
    !(
      image.data instanceof Uint8Array ||
      image.data instanceof Uint8ClampedArray
    )
  ) {
    throw new Error('codec.decode() must return RGBA Uint8Array pixels.');
  }
  validatePositiveInteger(image.width, 'decoded image width');
  validatePositiveInteger(image.height, 'decoded image height');
  if (Math.max(image.width, image.height) > maxSize) {
    throw new Error('codec.decode() returned an image larger than maxSize.');
  }
  if (image.data.length !== image.width * image.height * 4) {
    throw new Error(
      'codec.decode() RGBA byte length must exactly match width × height × 4.'
    );
  }
}

function snapshotEmbedOptions<Source>(
  options: RuntimeEmbedInvisibleWatermarkOptions<Source>
): RuntimeEmbedInvisibleWatermarkOptions<Source> {
  return { ...options, image: { ...options?.image } };
}

function snapshotDetectOptions<Source>(
  options: RuntimeDetectInvisibleWatermarkOptions<Source>
): RuntimeDetectInvisibleWatermarkOptions<Source> {
  return { ...options, image: { ...options?.image } };
}

/**
 * Create a DOM-free invisible watermark runtime around an injected image codec.
 * The core package does not install or choose a server-side image dependency.
 */
export function createInvisibleWatermarkRuntime<Source, Output>(
  options: InvisibleWatermarkRuntimeOptions<Source, Output>
): InvisibleWatermarkRuntime<Source, Output> {
  if (!options?.codec || typeof options.codec.decode !== 'function') {
    throw new Error('codec.decode must be a function.');
  }
  if (typeof options.codec.encode !== 'function') {
    throw new Error('codec.encode must be a function.');
  }
  const maximumConcurrency = options.maxConcurrency ?? 4;
  validatePositiveInteger(maximumConcurrency, 'maxConcurrency');

  const embedInvisible = async (
    input: RuntimeEmbedInvisibleWatermarkOptions<Source>
  ): Promise<Output> => {
    const snapshot = snapshotEmbedOptions(input);
    validateEmbedInvisibleOptions(snapshot as EmbedInvisibleWatermarkOptions);
    const saveFormat = snapshot.saveFormat as string | undefined;
    if (saveFormat === 'base64') {
      throw new Error(
        'The generic invisible watermark runtime does not support base64 output.'
      );
    }
    const maxSize = snapshot.maxSize ?? DEFAULT_RUNTIME_MAX_SIZE;
    const decoded = await options.codec.decode(snapshot.image.src, { maxSize });
    validateDecodedImage(decoded, maxSize);
    const outputPixels: InvisibleWatermarkDecodedImage = {
      data: new Uint8ClampedArray(decoded.data),
      width: decoded.width,
      height: decoded.height,
    };
    embedInvisibleWatermarkPixels(outputPixels, snapshot);
    return options.codec.encode(outputPixels, {
      format: saveFormat === 'png' ? 'png' : 'jpeg',
      quality: snapshot.quality ?? 90,
      filename: snapshot.filename,
    });
  };

  const detectInvisible = async (
    input: RuntimeDetectInvisibleWatermarkOptions<Source>
  ): Promise<InvisibleWatermarkDetectionResult> => {
    const snapshot = snapshotDetectOptions(input);
    validateDetectInvisibleOptions(snapshot as DetectInvisibleWatermarkOptions);
    const maxSize = snapshot.maxSize ?? DEFAULT_RUNTIME_MAX_SIZE;
    const decoded = await options.codec.decode(snapshot.image.src, { maxSize });
    validateDecodedImage(decoded, maxSize);
    return detectInvisibleWatermarkPixelsAsync(decoded, snapshot);
  };

  return {
    embedInvisible,
    detectInvisible,
    embedInvisibleMany(inputs, batchOptions) {
      const snapshots: readonly RuntimeEmbedInvisibleWatermarkOptions<Source>[] =
        Array.isArray(inputs)
          ? (
              inputs as readonly RuntimeEmbedInvisibleWatermarkOptions<Source>[]
            ).map((input) => snapshotEmbedOptions<Source>(input))
          : inputs;
      return runWatermarkBatch(
        snapshots,
        embedInvisible,
        batchOptions,
        maximumConcurrency,
        'trace runtime embedInvisibleMany'
      );
    },
    detectInvisibleMany(inputs, batchOptions) {
      const snapshots: readonly RuntimeDetectInvisibleWatermarkOptions<Source>[] =
        Array.isArray(inputs)
          ? (
              inputs as readonly RuntimeDetectInvisibleWatermarkOptions<Source>[]
            ).map((input) => snapshotDetectOptions<Source>(input))
          : inputs;
      return runWatermarkBatch(
        snapshots,
        detectInvisible,
        batchOptions,
        maximumConcurrency,
        'trace runtime detectInvisibleMany'
      );
    },
  };
}
