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
import {
  validateImageMarkOptions,
  validateMarkOptions,
  validateTextMarkOptions,
} from '../validate';

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
