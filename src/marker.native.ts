import { NativeModules, Platform } from 'react-native';
import type { Spec } from './NativeImageMarker';
import NativeImageMarker from './NativeImageMarker';
import {
  createNativeDetectInvisibleOptions,
  createNativeEmbedInvisibleOptions,
  createNativeMarkOptions,
  normalizeImageMarkOptions,
  normalizeTextMarkOptions,
} from './normalize';
import type { ImageMarkOptions, MarkOptions, TextMarkOptions } from './index';
import { createWatermarkRecipe, importWatermarkRecipe } from './recipe';
import type {
  WatermarkBlobRecipeResultOptions,
  WatermarkRecipe,
  WatermarkRecipeDocument,
  WatermarkRecipeOptions,
  WatermarkRecipeResultOptions,
} from './recipe';
import {
  validateImageMarkOptions,
  validateMarkOptions,
  validateTextMarkOptions,
} from './validate';
import type {
  DetectInvisibleWatermarkOptions,
  EmbedInvisibleWatermarkOptions,
  InvisibleWatermarkDetectionData,
  InvisibleWatermarkDetectionResult,
} from './invisible-watermark';
import { runControlledMarkerJob, runMarkerJob } from './job';
import type { MarkerJobOptions } from './job';
import type { MarkerResult } from './result';
import { runWatermarkBatch } from './batch';
import type { WatermarkBatchOptions, WatermarkBatchResult } from './batch';
import {
  embedInvisibleWithCredentials,
  verifyContentCredentials,
} from './content-credentials';
import type {
  ContentCredentialsVerificationResult,
  EmbedInvisibleWithCredentialsOptions,
  EmbedInvisibleWithCredentialsResult,
  VerifyContentCredentialsOptions,
} from './content-credentials';
import {
  INVISIBLE_WATERMARK_ALGORITHM,
  INVISIBLE_WATERMARK_RESIZE_SCALES,
  validateDetectInvisibleOptions,
  validateEmbedInvisibleOptions,
} from './invisible-watermark';

const LINKING_ERROR =
  `The package 'react-native-image-marker' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

function getImageMarker(): Spec {
  return (NativeImageMarker ??
    NativeModules.ImageMarker ??
    new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    )) as Spec;
}

function cancelNativeJob(jobId: string): Promise<boolean> {
  const nativeModule = getImageMarker() as Spec & {
    cancel?: (id: string) => Promise<boolean>;
  };
  return nativeModule.cancel?.(jobId) ?? Promise.resolve(false);
}

/** Native iOS and Android implementation of the public Marker API. */
class Marker {
  /** Embed a locator first, then ask the supplied adapter to sign the result. */
  static embedInvisibleWithCredentials(
    options: EmbedInvisibleWithCredentialsOptions,
    control?: MarkerJobOptions
  ): Promise<EmbedInvisibleWithCredentialsResult> {
    return embedInvisibleWithCredentials(
      (watermark) => Marker.embedInvisible(watermark, control),
      options
    );
  }

  /** Verify Content Credentials through an application-supplied adapter. */
  static verifyContentCredentials(
    options: VerifyContentCredentialsOptions
  ): Promise<ContentCredentialsVerificationResult> {
    return verifyContentCredentials(options);
  }

  /** Embed authenticated locators into many images while preserving input order. */
  static embedInvisibleMany(
    inputs: readonly EmbedInvisibleWatermarkOptions[],
    options?: WatermarkBatchOptions<MarkerResult>
  ): Promise<Array<WatermarkBatchResult<MarkerResult>>> {
    const snapshots = Array.isArray(inputs)
      ? inputs.map((input) => ({ ...input, image: { ...input?.image } }))
      : inputs;
    return runWatermarkBatch(
      snapshots,
      (input) => Marker.embedInvisible(input),
      options,
      1,
      'embedInvisibleMany'
    );
  }

  /** Detect authenticated locators in many images while preserving input order. */
  static detectInvisibleMany(
    inputs: readonly DetectInvisibleWatermarkOptions[],
    options?: WatermarkBatchOptions<InvisibleWatermarkDetectionResult>
  ): Promise<Array<WatermarkBatchResult<InvisibleWatermarkDetectionResult>>> {
    const snapshots = Array.isArray(inputs)
      ? inputs.map((input) => ({ ...input, image: { ...input?.image } }))
      : inputs;
    return runWatermarkBatch(
      snapshots,
      (input) => Marker.detectInvisible(input),
      options,
      1,
      'detectInvisibleMany'
    );
  }

  /**
   * Embed a short, authenticated locator into the final image pixels.
   *
   * This Beta API supports distribution tracing. It is not DRM, encryption,
   * or proof that the image was never edited.
   */
  static embedInvisible(
    options: EmbedInvisibleWatermarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> {
    validateEmbedInvisibleOptions(options);
    return runMarkerJob({
      descriptor: {
        operation: 'embedInvisible',
        saveFormat: options?.saveFormat,
        filename: options?.filename,
      },
      control,
      cancel: cancelNativeJob,
      task: (jobId) =>
        getImageMarker().embedInvisible({
          ...createNativeEmbedInvisibleOptions(options),
          jobId,
        }),
    });
  }

  /** Detect and authenticate an invisible locator in an image without writing a file. */
  static async detectInvisible(
    options: DetectInvisibleWatermarkOptions,
    control?: MarkerJobOptions
  ): Promise<InvisibleWatermarkDetectionResult> {
    validateDetectInvisibleOptions(options);
    const job = await runControlledMarkerJob({
      operation: 'detectInvisible',
      control,
      cancel: cancelNativeJob,
      workPhase: 'detecting',
      task: async (jobId): Promise<InvisibleWatermarkDetectionData> => {
        const serialized = await getImageMarker().detectInvisible({
          ...createNativeDetectInvisibleOptions(options),
          jobId,
        });
        let result: unknown;
        try {
          result = JSON.parse(serialized);
        } catch {
          throw new Error(
            'Native invisible watermark detector returned invalid JSON.'
          );
        }
        const detection = result as {
          detected?: unknown;
          payload?: unknown;
          confidence?: unknown;
          bitErrorRate?: unknown;
          algorithm?: unknown;
          scale?: unknown;
        };
        if (
          !result ||
          typeof result !== 'object' ||
          typeof detection.detected !== 'boolean' ||
          typeof detection.confidence !== 'number' ||
          !Number.isFinite(detection.confidence) ||
          detection.confidence < 0 ||
          detection.confidence > 1 ||
          detection.algorithm !== INVISIBLE_WATERMARK_ALGORITHM ||
          (detection.detected && typeof detection.payload !== 'string') ||
          (detection.bitErrorRate !== undefined &&
            (typeof detection.bitErrorRate !== 'number' ||
              !Number.isFinite(detection.bitErrorRate) ||
              detection.bitErrorRate < 0 ||
              detection.bitErrorRate > 1)) ||
          (detection.scale !== undefined &&
            (typeof detection.scale !== 'number' ||
              !INVISIBLE_WATERMARK_RESIZE_SCALES.includes(
                detection.scale as (typeof INVISIBLE_WATERMARK_RESIZE_SCALES)[number]
              )))
        ) {
          throw new Error(
            'Native invisible watermark detector returned invalid data.'
          );
        }
        return detection as InvisibleWatermarkDetectionData;
      },
    });
    return {
      ...job.value,
      jobId: job.jobId,
      operation: 'detectInvisible',
      durationMs: job.durationMs,
    };
  }

  /** Save ordered layers and output settings for reuse across one or many images. */
  static createRecipe<
    ResultOptions extends WatermarkRecipeResultOptions | undefined = undefined
  >(
    options: WatermarkRecipeOptions,
    resultOptions?: ResultOptions
  ): WatermarkRecipe<
    ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : MarkerResult
  > {
    if (resultOptions?.resultType === 'blob') {
      throw new Error('Blob recipe output is only supported on Web.');
    }
    if (
      resultOptions?.resultType !== undefined &&
      resultOptions.resultType !== 'result'
    ) {
      throw new Error(
        `Unsupported recipe result type: ${resultOptions.resultType}.`
      );
    }
    return createWatermarkRecipe(
      options,
      (markOptions, control) => Marker.mark(markOptions, control),
      1
    ) as WatermarkRecipe<
      ResultOptions extends WatermarkBlobRecipeResultOptions
        ? Blob
        : MarkerResult
    >;
  }

  /** Import a persisted Recipe v1/v2 document, migrating v1 to v2 first. */
  static importRecipe<
    ResultOptions extends WatermarkRecipeResultOptions | undefined = undefined
  >(
    document: WatermarkRecipeDocument,
    resultOptions?: ResultOptions
  ): WatermarkRecipe<
    ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : MarkerResult
  > {
    if (resultOptions?.resultType === 'blob') {
      throw new Error('Blob recipe output is only supported on Web.');
    }
    if (
      resultOptions?.resultType !== undefined &&
      resultOptions.resultType !== 'result'
    ) {
      throw new Error(
        `Unsupported recipe result type: ${resultOptions.resultType}.`
      );
    }
    return importWatermarkRecipe(
      document,
      (markOptions, control) => Marker.mark(markOptions, control),
      1
    ) as WatermarkRecipe<
      ResultOptions extends WatermarkBlobRecipeResultOptions
        ? Blob
        : MarkerResult
    >;
  }

  /** Mark text-only watermarks on an image. */
  static markText(
    options: TextMarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> {
    const { backgroundImage, watermarkTexts } = options;
    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }
    if (!watermarkTexts || watermarkTexts.length === 0) {
      throw new Error('please set watermark text!');
    }
    validateTextMarkOptions(options);
    return runMarkerJob({
      descriptor: {
        operation: 'markText',
        saveFormat: options?.saveFormat,
        filename: options?.filename,
      },
      control,
      cancel: cancelNativeJob,
      task: (jobId) =>
        getImageMarker().markWithText({
          ...normalizeTextMarkOptions(options),
          jobId,
        }),
    });
  }

  /** Mark image-only watermarks on an image. */
  static markImage(
    options: ImageMarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> {
    const { backgroundImage, watermarkImages = [] } = options;
    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }
    validateImageMarkOptions(options);
    if (watermarkImages.length === 0) {
      throw new Error('please set mark image!');
    }
    if (watermarkImages.some((item) => !item.src)) {
      throw new Error('please set mark image!');
    }
    return runMarkerJob({
      descriptor: {
        operation: 'markImage',
        saveFormat: options?.saveFormat,
        filename: options?.filename,
      },
      control,
      cancel: cancelNativeJob,
      task: (jobId) =>
        getImageMarker().markWithImage({
          ...normalizeImageMarkOptions(options),
          jobId,
        }),
    });
  }

  /** Mark ordered text and image watermark layers in one render pass. */
  static mark(
    options: MarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> {
    const { backgroundImage } = options;
    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }
    const nativeOptions = createNativeMarkOptions(options);
    if (!nativeOptions.watermarks || nativeOptions.watermarks.length === 0) {
      throw new Error('please set watermark text or image!');
    }
    validateMarkOptions(options);
    return runMarkerJob({
      descriptor: {
        operation: 'mark',
        saveFormat: options?.saveFormat,
        filename: options?.filename,
      },
      control,
      cancel: cancelNativeJob,
      task: (jobId) =>
        getImageMarker().markWithWatermarks({
          ...nativeOptions,
          jobId,
        }),
    });
  }
}

export default Marker;
