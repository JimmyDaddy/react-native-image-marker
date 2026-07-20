import type {
  ImageMarkOptions,
  MarkOptions,
  TextMarkOptions,
  TextOptions,
  WatermarkImageOptions,
  WatermarkLayer,
} from '../index';
import { createWatermarkRecipe } from '../recipe';
import type {
  WatermarkBlobRecipeResultOptions,
  WatermarkRecipe,
  WatermarkRecipeOptions,
  WatermarkRecipeResultOptions,
} from '../recipe';
import { renderWebComposition, renderWebCompositionToCanvas } from './renderer';
import type { WebRenderLayer } from './renderer';
import { encodeCanvasToBlob } from './helpers';
import { encodeCanvas } from './helpers';
import {
  validateImageMarkOptions,
  validateMarkOptions,
  validateTextMarkOptions,
} from '../validate';
import type {
  DetectInvisibleWatermarkOptions,
  EmbedInvisibleWatermarkOptions,
  InvisibleWatermarkDetectionResult,
} from '../invisible-watermark';
import { detectInvisibleWatermarkInWorker } from './invisible-worker-client';
import { runWatermarkBatch } from '../batch';
import type { WatermarkBatchOptions, WatermarkBatchResult } from '../batch';
import {
  embedInvisibleWithCredentials,
  verifyContentCredentials,
} from '../content-credentials';
import type {
  ContentCredentialsVerificationResult,
  EmbedInvisibleWithCredentialsOptions,
  EmbedInvisibleWithCredentialsResult,
  VerifyContentCredentialsOptions,
} from '../content-credentials';
import {
  detectInvisibleWatermarkPixelsAsync,
  embedInvisibleWatermarkPixels,
  validateDetectInvisibleOptions,
  validateEmbedInvisibleOptions,
} from '../invisible-watermark';

function getPixelContext(
  canvas: Awaited<ReturnType<typeof renderWebCompositionToCanvas>>
) {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('The browser did not provide a 2D canvas context.');
  }
  return context;
}

function readImageData(
  canvas: Awaited<ReturnType<typeof renderWebCompositionToCanvas>>
) {
  try {
    return getPixelContext(canvas).getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
  } catch (error) {
    const errorName =
      error && typeof error === 'object' && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';
    if (errorName === 'SecurityError') {
      throw new Error(
        'Unable to read image pixels because a remote image tainted the canvas. Configure CORS (Access-Control-Allow-Origin) or use a local file/data URL.'
      );
    }
    throw error;
  }
}

function createTextLayer(options: TextOptions): WebRenderLayer {
  return { type: 'text', options };
}

function createImageLayer(options: WatermarkImageOptions): WebRenderLayer {
  return { type: 'image', options };
}

function createOrderedLayer(layer: WatermarkLayer): WebRenderLayer {
  if (layer.type === 'text') {
    return createTextLayer(layer);
  }
  if (layer.type === 'image') {
    return createImageLayer(layer);
  }
  throw new Error('watermark type must be either "text" or "image".');
}

function appendCompatibilityLayers(
  layers: WebRenderLayer[],
  options: MarkOptions | ImageMarkOptions
) {
  if ('watermarkTexts' in options) {
    options.watermarkTexts?.forEach((text) =>
      layers.push(createTextLayer(text))
    );
  }
  options.watermarkImages?.forEach((image) =>
    layers.push(createImageLayer(image))
  );
  if (options.watermarkImage?.src) {
    layers.push(
      createImageLayer({
        ...options.watermarkImage,
        position: options.watermarkPositions,
      })
    );
  }
}

function createMarkLayers(options: MarkOptions): WebRenderLayer[] {
  if (!options?.backgroundImage?.src) {
    throw new Error('please set image!');
  }

  const layers =
    (options.watermarks?.length ?? 0) > 0
      ? options.watermarks!.map(createOrderedLayer)
      : [];
  if (layers.length === 0) {
    appendCompatibilityLayers(layers, options);
  }
  if (layers.length === 0) {
    throw new Error('please set watermark text or image!');
  }
  if (layers.some((layer) => layer.type === 'image' && !layer.options.src)) {
    throw new Error('please set mark image!');
  }
  validateMarkOptions(options);
  return layers;
}

/**
 * Public image-marking API shared by native and Web targets.
 *
 * Metro selects the native TurboModule implementation on iOS and Android.
 * React Native Web and standard browser bundlers select this SSR-safe Canvas
 * 2D implementation, which only touches DOM globals when a method is called.
 */
class Marker {
  /** Embed a locator first, then ask the supplied adapter to sign the result. */
  static embedInvisibleWithCredentials(
    options: EmbedInvisibleWithCredentialsOptions
  ): Promise<EmbedInvisibleWithCredentialsResult> {
    return embedInvisibleWithCredentials(
      (watermark) => Marker.embedInvisible(watermark),
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
    options?: WatermarkBatchOptions<string>
  ): Promise<Array<WatermarkBatchResult<string>>> {
    const snapshots = Array.isArray(inputs)
      ? inputs.map((input) => ({ ...input, image: { ...input?.image } }))
      : inputs;
    return runWatermarkBatch(
      snapshots,
      (input) => Marker.embedInvisible(input),
      options,
      4,
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
      4,
      'detectInvisibleMany'
    );
  }

  /**
   * Embed a short, authenticated locator into the final image pixels.
   *
   * This Beta API supports distribution tracing. It is not DRM, encryption,
   * or proof that the image was never edited.
   */
  static async embedInvisible(
    options: EmbedInvisibleWatermarkOptions
  ): Promise<string> {
    validateEmbedInvisibleOptions(options);
    const canvas = await renderWebCompositionToCanvas(options.image, [], {
      quality: options.quality,
      saveFormat: options.saveFormat,
      maxSize: options.maxSize,
    });
    const context = getPixelContext(canvas);
    const imageData = readImageData(canvas);
    embedInvisibleWatermarkPixels(
      { data: imageData.data, width: canvas.width, height: canvas.height },
      options
    );
    context.putImageData(imageData, 0, 0);
    return encodeCanvas(canvas, options.saveFormat, options.quality);
  }

  /** Detect and authenticate an invisible locator in an image without writing a file. */
  static async detectInvisible(
    options: DetectInvisibleWatermarkOptions
  ): Promise<InvisibleWatermarkDetectionResult> {
    validateDetectInvisibleOptions(options);
    const canvas = await renderWebCompositionToCanvas(options.image, [], {
      saveFormat: undefined,
      maxSize: options.maxSize,
    });
    const imageData = readImageData(canvas);
    if (options.worker) {
      return detectInvisibleWatermarkInWorker(
        { data: imageData.data, width: canvas.width, height: canvas.height },
        options,
        options.worker
      );
    }
    return detectInvisibleWatermarkPixelsAsync(
      { data: imageData.data, width: canvas.width, height: canvas.height },
      options
    );
  }

  /** Save ordered layers and output settings for reuse across one or many images. */
  static createRecipe<
    ResultOptions extends WatermarkRecipeResultOptions | undefined = undefined
  >(
    options: WatermarkRecipeOptions,
    resultOptions?: ResultOptions
  ): WatermarkRecipe<
    ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : string
  > {
    if (resultOptions?.resultType === 'blob') {
      return createWatermarkRecipe(
        options,
        async (markOptions) => {
          const canvas = await renderWebCompositionToCanvas(
            markOptions.backgroundImage,
            createMarkLayers(markOptions),
            markOptions
          );
          return encodeCanvasToBlob(
            canvas,
            markOptions.saveFormat,
            markOptions.quality
          );
        },
        4
      ) as WatermarkRecipe<
        ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : string
      >;
    }
    if (
      resultOptions?.resultType !== undefined &&
      resultOptions.resultType !== 'string'
    ) {
      throw new Error(
        `Unsupported recipe result type: ${resultOptions.resultType}.`
      );
    }
    return createWatermarkRecipe(
      options,
      (markOptions) => Marker.mark(markOptions),
      4
    ) as WatermarkRecipe<
      ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : string
    >;
  }

  /** Render one or more text watermark layers. */
  static async markText(options: TextMarkOptions): Promise<string> {
    if (!options?.backgroundImage?.src) {
      throw new Error('please set image!');
    }
    if (!options.watermarkTexts || options.watermarkTexts.length === 0) {
      throw new Error('please set watermark text!');
    }
    validateTextMarkOptions(options);

    return renderWebComposition(
      options.backgroundImage,
      options.watermarkTexts.map(createTextLayer),
      options
    );
  }

  /** Render one or more image watermark layers. */
  static async markImage(options: ImageMarkOptions): Promise<string> {
    if (!options?.backgroundImage?.src) {
      throw new Error('please set image!');
    }
    const watermarkImages = options.watermarkImages ?? [];
    if (!options.watermarkImage?.src && watermarkImages.length === 0) {
      throw new Error('please set mark image!');
    }
    if (watermarkImages.some((watermark) => !watermark.src)) {
      throw new Error('please set mark image!');
    }
    validateImageMarkOptions(options);

    const layers: WebRenderLayer[] = [];
    appendCompatibilityLayers(layers, options);
    return renderWebComposition(options.backgroundImage, layers, options);
  }

  /** Render ordered mixed text and image watermark layers. */
  static async mark(options: MarkOptions): Promise<string> {
    return renderWebComposition(
      options.backgroundImage,
      createMarkLayers(options),
      options
    );
  }
}

export { Marker, Marker as WebMarker };
export {
  degreesToRadians,
  encodeCanvas,
  encodeCanvasToBlob,
  fitSizeWithinMax,
  getExpandedCanvasSize,
  getRotatedBounds,
  normalizeOutputFormat,
  normalizeQuality,
  resolveAnchoredPosition,
  resolveSpreadValue,
} from './helpers';
export type {
  CanvasEncoder,
  Point,
  RotatedBounds,
  Size,
  WebOutputFormat,
} from './helpers';
export default Marker;
