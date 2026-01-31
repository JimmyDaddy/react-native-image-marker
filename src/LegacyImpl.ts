/**
 * Legacy bridge implementation wrapper
 */
import { NativeModules, Platform, Image } from 'react-native';
import type { TextMarkOptions, ImageMarkOptions } from './types';
import { ErrorHandler } from './ErrorHandler';

const { resolveAssetSource } = Image;
const LINKING_ERROR =
  `The package 'react-native-image-marker' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const ImageMarker = NativeModules.ImageMarker
  ? NativeModules.ImageMarker
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export class LegacyImpl {
  /**
   * Mark text on image using legacy bridge
   */
  static async markText(options: TextMarkOptions): Promise<string> {
    return ErrorHandler.wrapAsyncOperation(async () => {
      // Validate input parameters
      ErrorHandler.validateInput(options, 'markText');

      const { backgroundImage } = options;

      let srcObj: any = resolveAssetSource(backgroundImage.src);
      if (!srcObj) {
        srcObj = {
          uri: backgroundImage.src,
          __packager_asset: false,
        };
      }

      // Process watermark texts to handle position options
      options.watermarkTexts.forEach((item) => {
        item.position = item.position || item.positionOptions;
        delete item.positionOptions;
      });

      options.backgroundImage.src = srcObj;
      options.maxSize = options.maxSize || 2048;

      return ImageMarker.markWithText(options);
    }, 'Legacy markText');
  }

  /**
   * Mark image on background image using legacy bridge
   */
  static async markImage(options: ImageMarkOptions): Promise<string> {
    return ErrorHandler.wrapAsyncOperation(async () => {
      // Validate input parameters
      ErrorHandler.validateInput(options, 'markImage');

      const {
        backgroundImage,
        watermarkImage = {} as any,
        watermarkImages = [],
      } = options;

      let srcObj: any = resolveAssetSource(backgroundImage.src);
      if (!srcObj) {
        srcObj = {
          uri: backgroundImage.src,
          __packager_asset: false,
        };
      }

      if (watermarkImage && options.watermarkImage) {
        let markerObj: any = resolveAssetSource(watermarkImage.src);
        if (!markerObj) {
          markerObj = {
            uri: watermarkImage.src,
            __packager_asset: false,
          };
        }

        options.watermarkImage.src = markerObj;
      }

      if (watermarkImages.length > 0) {
        for (const myWi of watermarkImages) {
          let markerObj: any = resolveAssetSource(myWi.src);
          if (!markerObj) {
            markerObj = {
              uri: myWi.src,
              __packager_asset: false,
            };
          }
          myWi.src = markerObj;
        }
      } else {
        options.watermarkImages = [];
      }

      options.backgroundImage.src = srcObj;
      options.maxSize = options.maxSize || 2048;

      return ImageMarker.markWithImage(options);
    }, 'Legacy markImage');
  }
}
