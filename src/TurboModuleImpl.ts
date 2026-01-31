/**
 * TurboModule implementation wrapper for new architecture
 */
import type { TextMarkOptions, ImageMarkOptions } from './types';
import { ErrorHandler } from './ErrorHandler';
import { FabricImageLoader } from './FabricImageLoader';
import { SerializationOptimizer } from './SerializationOptimizer';

// Dynamic import to handle TurboModule availability
let turboModulePromise: Promise<any> | null = null;

async function getTurboModule() {
  if (turboModulePromise === null) {
    turboModulePromise = (async () => {
      try {
        // Use dynamic import for better error handling
        const module = await import('../specs/NativeImageMarker');
        return module.default;
      } catch (error) {
        // In test environments or when TurboModule is not available,
        // throw a descriptive error
        throw ErrorHandler.handleTurboModuleLoadError(error);
      }
    })();
  }
  return turboModulePromise;
}

export class TurboModuleImpl {
  /**
   * Mark text on image using TurboModule with Fabric integration and optimized serialization
   */
  static async markText(options: TextMarkOptions): Promise<string> {
    return ErrorHandler.wrapAsyncOperation(async () => {
      // Validate input parameters
      ErrorHandler.validateInput(options, 'markText');

      // Process image sources through Fabric pipeline
      const processedOptions = await this.processFabricImageSources(options);

      // Optimize serialization to reduce JSI communication overhead
      const optimizedOptions =
        SerializationOptimizer.optimizeTextMarkOptions(processedOptions);

      // Log optimization results in development
      if (__DEV__) {
        const comparison = SerializationOptimizer.compareOptimization(
          processedOptions,
          optimizedOptions
        );
        if (comparison.reduction > 0) {
          console.log(
            `TurboModule serialization optimized: ${
              comparison.reduction
            } bytes (${comparison.reductionPercentage.toFixed(1)}%) reduction`
          );
        }
      }

      const turboModule = await getTurboModule();
      return turboModule.markWithText(optimizedOptions);
    }, 'TurboModule markText');
  }

  /**
   * Mark image on background image using TurboModule with Fabric integration and optimized serialization
   */
  static async markImage(options: ImageMarkOptions): Promise<string> {
    return ErrorHandler.wrapAsyncOperation(async () => {
      // Validate input parameters
      ErrorHandler.validateInput(options, 'markImage');

      // Process image sources through Fabric pipeline
      const processedOptions = await this.processFabricImageSources(options);

      // Optimize serialization to reduce JSI communication overhead
      const optimizedOptions =
        SerializationOptimizer.optimizeImageMarkOptions(processedOptions);

      // Log optimization results in development
      if (__DEV__) {
        const comparison = SerializationOptimizer.compareOptimization(
          processedOptions,
          optimizedOptions
        );
        if (comparison.reduction > 0) {
          console.log(
            `TurboModule serialization optimized: ${
              comparison.reduction
            } bytes (${comparison.reductionPercentage.toFixed(1)}%) reduction`
          );
        }
      }

      const turboModule = await getTurboModule();
      return turboModule.markWithImage(optimizedOptions);
    }, 'TurboModule markImage');
  }

  /**
   * Processes image sources through Fabric-compatible pipeline
   */
  private static async processFabricImageSources<
    T extends TextMarkOptions | ImageMarkOptions
  >(options: T): Promise<T> {
    const processedOptions = { ...options };

    // Process background image
    if (processedOptions.backgroundImage) {
      const fabricSource = await FabricImageLoader.loadImage(
        processedOptions.backgroundImage,
        {
          enableCaching: true,
          retryAttempts: 3,
        }
      );

      processedOptions.backgroundImage = {
        ...processedOptions.backgroundImage,
        src: fabricSource,
      };
    }

    // Process watermark images for ImageMarkOptions
    if (
      'watermarkImages' in processedOptions &&
      processedOptions.watermarkImages
    ) {
      const processedWatermarkImages = await Promise.all(
        processedOptions.watermarkImages.map(async (watermarkImage) => {
          const fabricSource = await FabricImageLoader.loadImage(
            watermarkImage,
            {
              enableCaching: true,
              retryAttempts: 2, // Fewer retries for watermarks
            }
          );

          return {
            ...watermarkImage,
            src: fabricSource,
          };
        })
      );

      processedOptions.watermarkImages = processedWatermarkImages;
    }

    // Process single watermark image for legacy compatibility
    if (
      'watermarkImage' in processedOptions &&
      processedOptions.watermarkImage
    ) {
      const fabricSource = await FabricImageLoader.loadImage(
        processedOptions.watermarkImage,
        {
          enableCaching: true,
          retryAttempts: 2,
        }
      );

      processedOptions.watermarkImage = {
        ...processedOptions.watermarkImage,
        src: fabricSource,
      };
    }

    return processedOptions;
  }
}
