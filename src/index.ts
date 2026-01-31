/**
 * Unified API interface for react-native-image-marker
 * Supports both legacy bridge and new architecture (TurboModules) with Fabric integration
 */
import { ArchitectureDetector } from './ArchitectureDetector';
import { TurboModuleImpl } from './TurboModuleImpl';
import { LegacyImpl } from './LegacyImpl';
import { ErrorHandler } from './ErrorHandler';
import { FabricImageLoader } from './FabricImageLoader';

// Re-export all types and enums for backward compatibility
export {
  Position,
  TextBackgroundType,
  ImageFormat,
  type Padding,
  type PositionOptions,
  type TextStyle,
  type ShadowLayerStyle,
  type RadiusValue,
  type CornerRadius,
  type TextBackgroundStyle,
  type TextOptions,
  type ImageOptions,
  type WatermarkImageOptions,
  type TextMarkOptions,
  type ImageMarkOptions,
  // Generic type aliases
  type ImageSource,
  type NumericValue,
  type OptionalNumericValue,
  type ColorValue,
  type FontName,
  // Standard type aliases
  type StandardTextMarkOptions,
  type StandardImageMarkOptions,
  type StrictTextMarkOptions,
  type StrictImageMarkOptions,
  type URITextMarkOptions,
  type URIImageMarkOptions,
  // Utility types
  type BackgroundImageType,
  type WatermarkTextType,
  type WatermarkImageType,
  type InferNumericType,
  type InferSourceType,
} from './types';

class ImageMarker {
  /** @ignore ignore constructors for typedoc only */
  constructor() {}

  /**
   * Get the appropriate implementation based on architecture detection
   * @returns Implementation class (TurboModule or Legacy)
   */
  private static getImplementation() {
    try {
      if (ArchitectureDetector.isNewArchitecture()) {
        return TurboModuleImpl;
      }
    } catch (error) {
      // If architecture detection fails, fall back to legacy
      ErrorHandler.handleArchitectureDetectionError(error);
    }
    return LegacyImpl;
  }

  /**
   * @description mark text on image with full generic type support
   * @template T - The type of numeric values (number | string)
   * @template S - The type of image source
   * @param options - Text marking configuration
   * @returns {Promise<string>} image url or base64 string
   * @example
   * const options: StandardTextMarkOptions = {
   *  backgroundImage: {
   *   src: require('./images/test.jpg'),
   *   scale: 1,
   *   rotate: 20,
   *   alpha: 0.5,
   *  },
   *  watermarkTexts: [
   *  {
   *    text: 'hello',
   *    positionOptions: {
   *      position: Position.center,
   *    },
   *    style: {
   *      color: '#ff00ff',
   *      fontSize: 30,
   *      fontName: 'Arial',
   *      rotate: 30,
   *      shadowStyle: {
   *        dx: 10,
   *        dy: 10,
   *        radius: 10,
   *        color: '#ffaa22',
   *      },
   *      textBackgroundStyle: {
   *        paddingX: 10,
   *        paddingY: 10,
   *        type: TextBackgroundType.none,
   *        color: '#faaaff',
   *      },
   *      underline: true,
   *      strikeThrough: true,
   *      textAlign: 'left',
   *      italic: true,
   *      bold: true,
   *    },
   *  },
   *  {
   *    text: 'world',
   *    positionOptions: {
   *      X: 10,
   *      Y: 10,
   *    },
   *    style: {
   *     color: '#AAFFDD',
   *     fontSize: 30,
   *     fontName: 'Arial',
   *     rotate: 170,
   *     shadowStyle: {
   *      dx: 10,
   *      dy: 10,
   *      radius: 10,
   *      color: '#ffaa22',
   *     },
   *     textBackgroundStyle: {
   *      paddingX: 10,
   *      paddingY: 10,
   *      type: TextBackgroundType.stretchX,
   *      color: '#faaaff',
   *     },
   *     textAlign: 'right',
   *     skewX: 10,
   *  ],
   *  scale: 1,
   *  quality: 100,
   *  filename: 'test',
   *  saveFormat: ImageFormat.png,
   * };
   * ImageMarker.markText(options).then((res) => {
   *  console.log(res);
   * }).catch((err) => {
   *  console.log(err);
   * });
   * // or
   * await ImageMarker.markText(options);
   */
  static async markText<
    T extends import('./types').NumericValue = number,
    S = any
  >(options: import('./types').TextMarkOptions<T, S>): Promise<string> {
    const implementation = this.getImplementation();
    return implementation.markText(options);
  }

  /**
   * @description mark image on background image with full generic type support
   * @template T - The type of numeric values (number | string)
   * @template S - The type of image source
   * @param options - Image marking configuration
   * @returns {Promise<string>} image url or base64 string
   * @example
   * const options: StandardImageMarkOptions = {
   *  backgroundImage: {
   *    src: require('./images/test.jpg'),
   *    scale: 1,
   *    rotate: 20,
   *    alpha: 0.5,
   *  },
   *  quality: 100,
   *  filename: 'test',
   *  saveFormat: ImageFormat.png,
   *  watermarkImages: [
   *    {
   *      src: require('./images/logo.png'),
   *      scale: 0.5,
   *      rotate: 45,
   *      alpha: 0.5,
   *      position: {
   *        X: 10,
   *        Y: 10,
   *      },
   *    },
   *    {
   *      src: require('./images/logo1.png'),
   *      scale: 0.5,
   *      rotate: 45,
   *      alpha: 0.5,
   *      position: {
   *        position: Position.center,
   *     },
   *    },
   *  ],
   * };
   * ImageMarker.markImage(options).then((res) => {
   *  console.log(res);
   * }).catch((err) => {
   *  console.log(err);
   * });
   * // or
   * await ImageMarker.markImage(options);
   */
  static async markImage<
    T extends import('./types').NumericValue = number,
    S = any
  >(options: import('./types').ImageMarkOptions<T, S>): Promise<string> {
    const implementation = this.getImplementation();
    return implementation.markImage(options);
  }

  /**
   * Check if new architecture (TurboModules) is enabled
   * @returns {boolean} true if new architecture is enabled
   */
  static isNewArchitecture(): boolean {
    return ArchitectureDetector.isNewArchitecture();
  }

  /**
   * Check if Fabric renderer is enabled
   * @returns {boolean} true if Fabric renderer is enabled
   */
  static isFabricEnabled(): boolean {
    return FabricImageLoader.isFabricEnabled();
  }

  /**
   * Clear Fabric image cache
   * Useful for memory management in long-running applications
   */
  static clearImageCache(): void {
    FabricImageLoader.clearCache();
  }

  /**
   * Get Fabric image cache statistics
   * @returns {object} Cache statistics including size and keys
   */
  static getImageCacheStats(): { size: number; keys: string[] } {
    return FabricImageLoader.getCacheStats();
  }
}

export default ImageMarker;
