/**
 * Fabric-compatible image loading pipeline for new architecture
 * Provides enhanced image loading with caching and compatibility
 */
import { Image } from 'react-native';
import type { ImageOptions } from './types';

const { resolveAssetSource } = Image;

export interface FabricImageSource {
  uri: string;
  width?: number;
  height?: number;
  scale?: number;
  __packager_asset?: boolean;
  bundle?: string;
}

export interface FabricImageLoadOptions {
  enableCaching?: boolean;
  maxCacheSize?: number;
  retryAttempts?: number;
  timeout?: number;
}

/**
 * Fabric-compatible image loader with enhanced caching and error handling
 */
export class FabricImageLoader {
  private static imageCache = new Map<string, Promise<FabricImageSource>>();
  private static readonly DEFAULT_OPTIONS: FabricImageLoadOptions = {
    enableCaching: true,
    maxCacheSize: 100,
    retryAttempts: 3,
    timeout: 30000, // 30 seconds
  };

  /**
   * Detects if Fabric renderer is available
   */
  static isFabricEnabled(): boolean {
    try {
      // Check for Fabric-specific APIs
      return (
        typeof global !== 'undefined' &&
        (global as any).nativeFabricUIManager !== undefined
      );
    } catch {
      return false;
    }
  }

  /**
   * Loads image with Fabric-compatible pipeline
   */
  static async loadImage(
    imageOptions: ImageOptions,
    options: FabricImageLoadOptions = {}
  ): Promise<FabricImageSource> {
    const loadOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const cacheKey = this.generateCacheKey(imageOptions);

    // Check cache first if enabled
    if (loadOptions.enableCaching && this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    const loadPromise = this.performImageLoad(imageOptions, loadOptions);

    // Cache the promise if caching is enabled
    if (loadOptions.enableCaching) {
      this.imageCache.set(cacheKey, loadPromise);
      this.cleanupCache(loadOptions.maxCacheSize!);
    }

    return loadPromise;
  }

  /**
   * Loads multiple images concurrently with Fabric pipeline
   */
  static async loadImages(
    imageOptionsList: ImageOptions[],
    options: FabricImageLoadOptions = {}
  ): Promise<FabricImageSource[]> {
    const loadPromises = imageOptionsList.map((imageOptions, index) =>
      this.loadImage(imageOptions, options).catch((error) => {
        throw new Error(
          `Failed to load image at index ${index}: ${error.message}`
        );
      })
    );

    return Promise.all(loadPromises);
  }

  /**
   * Performs the actual image loading with retry mechanism
   */
  private static async performImageLoad(
    imageOptions: ImageOptions,
    options: FabricImageLoadOptions
  ): Promise<FabricImageSource> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= options.retryAttempts!; attempt++) {
      try {
        return await this.loadImageWithTimeout(imageOptions, options.timeout!);
      } catch (error) {
        lastError = error as Error;

        // Don't retry for certain types of errors
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }

        // Wait before retry with exponential backoff
        if (attempt < options.retryAttempts!) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw (
      lastError || new Error('Failed to load image after all retry attempts')
    );
  }

  /**
   * Loads image with timeout support
   */
  private static async loadImageWithTimeout(
    imageOptions: ImageOptions,
    timeout: number
  ): Promise<FabricImageSource> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image loading timeout after ${timeout}ms`));
      }, timeout);

      try {
        const fabricSource = this.processFabricImageSource(imageOptions);

        // For Fabric, we need to ensure the image source is properly formatted
        if (this.isFabricEnabled()) {
          this.validateFabricImageSource(fabricSource);
        }

        clearTimeout(timeoutId);
        resolve(fabricSource);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Processes image source for Fabric compatibility
   */
  private static processFabricImageSource(
    imageOptions: ImageOptions
  ): FabricImageSource {
    const { src, scale = 1 } = imageOptions;

    // Handle different source types
    if (typeof src === 'string') {
      // Handle base64 images
      if (src.startsWith('data:image/')) {
        return {
          uri: src,
          scale,
          __packager_asset: false,
        };
      }

      // Handle remote URLs
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return {
          uri: src,
          scale,
          __packager_asset: false,
        };
      }

      // Handle local file paths
      if (src.startsWith('file://')) {
        return {
          uri: src,
          scale,
          __packager_asset: false,
        };
      }

      // Handle asset names (fallback to legacy resolution)
      return {
        uri: src,
        scale,
        __packager_asset: false,
      };
    }

    // Handle asset objects (from require() or import)
    if (typeof src === 'object' && src !== null) {
      const resolvedSource = resolveAssetSource(src);

      if (resolvedSource) {
        return {
          uri: resolvedSource.uri,
          width: resolvedSource.width,
          height: resolvedSource.height,
          scale: resolvedSource.scale || scale,
          __packager_asset: true,
          ...((resolvedSource as any).bundle && {
            bundle: (resolvedSource as any).bundle,
          }),
        };
      }
    }

    // Handle numeric asset IDs (legacy)
    if (typeof src === 'number') {
      const resolvedSource = resolveAssetSource(src);

      if (resolvedSource) {
        return {
          uri: resolvedSource.uri,
          width: resolvedSource.width,
          height: resolvedSource.height,
          scale: resolvedSource.scale || scale,
          __packager_asset: true,
          ...((resolvedSource as any).bundle && {
            bundle: (resolvedSource as any).bundle,
          }),
        };
      }
    }

    throw new Error(`Unsupported image source type: ${typeof src}`);
  }

  /**
   * Validates Fabric image source format
   */
  private static validateFabricImageSource(source: FabricImageSource): void {
    if (!source.uri) {
      throw new Error('Fabric image source must have a valid URI');
    }

    // Validate URI format for Fabric
    if (source.__packager_asset && !source.width && !source.height) {
      console.warn(
        'Fabric: Asset image missing dimensions, may affect performance'
      );
    }

    // Validate scale values
    if (source.scale && (source.scale <= 0 || source.scale > 10)) {
      throw new Error(
        `Invalid scale value: ${source.scale}. Must be between 0 and 10`
      );
    }
  }

  /**
   * Generates cache key for image options
   */
  private static generateCacheKey(imageOptions: ImageOptions): string {
    const { src, scale = 1, rotate = 0, alpha = 1 } = imageOptions;

    let srcKey: string;
    if (typeof src === 'string') {
      srcKey = src;
    } else if (typeof src === 'number') {
      srcKey = `asset_${src}`;
    } else if (typeof src === 'object' && src !== null) {
      // For asset objects, use a stable identifier
      srcKey = JSON.stringify(src);
    } else {
      srcKey = String(src);
    }

    return `${srcKey}_${scale}_${rotate}_${alpha}`;
  }

  /**
   * Cleans up cache when it exceeds max size
   */
  private static cleanupCache(maxSize: number): void {
    if (this.imageCache.size > maxSize) {
      // Remove oldest entries (simple FIFO strategy)
      const keysToRemove = Array.from(this.imageCache.keys()).slice(
        0,
        this.imageCache.size - maxSize
      );
      keysToRemove.forEach((key) => this.imageCache.delete(key));
    }
  }

  /**
   * Determines if an error should not be retried
   */
  private static isNonRetryableError(error: Error): boolean {
    const nonRetryableMessages = [
      'Unsupported image source type',
      'Invalid scale value',
      'Fabric image source must have a valid URI',
    ];

    return nonRetryableMessages.some((message) =>
      error.message.includes(message)
    );
  }

  /**
   * Clears the image cache
   */
  static clearCache(): void {
    this.imageCache.clear();
  }

  /**
   * Gets cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.imageCache.size,
      keys: Array.from(this.imageCache.keys()),
    };
  }
}
