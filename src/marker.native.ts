import { NativeModules, Platform } from 'react-native';
import type { Spec } from './NativeImageMarker';
import NativeImageMarker from './NativeImageMarker';
import {
  createNativeMarkOptions,
  normalizeImageMarkOptions,
  normalizeTextMarkOptions,
} from './normalize';
import type { ImageMarkOptions, MarkOptions, TextMarkOptions } from './index';
import { createWatermarkRecipe } from './recipe';
import type { WatermarkRecipe, WatermarkRecipeOptions } from './recipe';
import {
  validateImageMarkOptions,
  validateMarkOptions,
  validateTextMarkOptions,
} from './validate';

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

/** Native iOS and Android implementation of the public Marker API. */
class Marker {
  /** Save ordered layers and output settings for reuse across one or many images. */
  static createRecipe(options: WatermarkRecipeOptions): WatermarkRecipe {
    return createWatermarkRecipe(
      options,
      (markOptions) => Marker.mark(markOptions),
      1
    );
  }

  /** Mark text-only watermarks on an image. */
  static markText(options: TextMarkOptions): Promise<string> {
    const { backgroundImage, watermarkTexts } = options;

    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }

    if (!watermarkTexts || watermarkTexts.length === 0) {
      throw new Error('please set watermark text!');
    }

    validateTextMarkOptions(options);

    return getImageMarker().markWithText(normalizeTextMarkOptions(options));
  }

  /** Mark image-only watermarks on an image. */
  static markImage(options: ImageMarkOptions): Promise<string> {
    const { backgroundImage, watermarkImage, watermarkImages = [] } = options;

    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }
    if (!watermarkImage?.src && watermarkImages.length === 0) {
      throw new Error('please set mark image!');
    }
    if (watermarkImages.some((item) => !item.src)) {
      throw new Error('please set mark image!');
    }

    validateImageMarkOptions(options);

    return getImageMarker().markWithImage(normalizeImageMarkOptions(options));
  }

  /** Mark ordered text and image watermark layers in one render pass. */
  static mark(options: MarkOptions): Promise<string> {
    const { backgroundImage } = options;

    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }

    const nativeOptions = createNativeMarkOptions(options);
    if (!nativeOptions.watermarks || nativeOptions.watermarks.length === 0) {
      throw new Error('please set watermark text or image!');
    }
    validateMarkOptions(options);
    return getImageMarker().markWithWatermarks(nativeOptions);
  }
}

export default Marker;
