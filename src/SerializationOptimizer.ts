/**
 * Serialization optimization utilities for TurboModule communication
 * Reduces JSI communication overhead by optimizing data structures
 */
import type {
  TextMarkOptions,
  ImageMarkOptions,
  TextOptions,
  ImageOptions,
  WatermarkImageOptions,
} from './types';

export class SerializationOptimizer {
  /**
   * General optimization method for any data structure
   * Automatically detects the type and applies appropriate optimization
   */
  static optimizeForTransmission(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Detect if it's a TextMarkOptions
    if (data.watermarkTexts && Array.isArray(data.watermarkTexts)) {
      return this.optimizeTextMarkOptions(data as TextMarkOptions);
    }

    // Detect if it's an ImageMarkOptions
    if (data.watermarkImages && Array.isArray(data.watermarkImages)) {
      return this.optimizeImageMarkOptions(data as ImageMarkOptions);
    }

    // For other objects, perform generic optimization
    return this.optimizeGenericObject(data);
  }

  /**
   * Generic object optimization - removes undefined values and empty objects
   */
  private static optimizeGenericObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.optimizeForTransmission(item));
    }

    if (obj && typeof obj === 'object') {
      const optimized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            const optimizedValue = this.optimizeForTransmission(value);
            if (
              optimizedValue !== undefined &&
              (!Array.isArray(optimizedValue) || optimizedValue.length > 0) &&
              (Array.isArray(optimizedValue) ||
                Object.keys(optimizedValue).length > 0)
            ) {
              optimized[key] = optimizedValue;
            }
          } else {
            optimized[key] = value;
          }
        }
      }

      return optimized;
    }

    return obj;
  }

  /**
   * Optimizes text mark options for JSI serialization
   * Removes undefined values and flattens nested structures where possible
   */
  static optimizeTextMarkOptions(options: TextMarkOptions): TextMarkOptions {
    const optimized: TextMarkOptions = {
      backgroundImage: this.optimizeImageOptions(options.backgroundImage),
      watermarkTexts: options.watermarkTexts.map((text) =>
        this.optimizeTextOptions(text)
      ),
    };

    // Only include optional fields if they have meaningful values
    if (options.quality !== undefined && options.quality > 0) {
      optimized.quality = options.quality;
    }

    if (options.filename && options.filename.trim().length > 0) {
      optimized.filename = options.filename.trim();
    }

    if (options.saveFormat) {
      optimized.saveFormat = options.saveFormat;
    }

    if (options.maxSize !== undefined && options.maxSize > 0) {
      optimized.maxSize = options.maxSize;
    }

    return optimized;
  }

  /**
   * Optimizes image mark options for JSI serialization
   */
  static optimizeImageMarkOptions(options: ImageMarkOptions): ImageMarkOptions {
    const optimized: ImageMarkOptions = {
      backgroundImage: this.optimizeImageOptions(options.backgroundImage),
      watermarkImages: options.watermarkImages.map((img) =>
        this.optimizeWatermarkImageOptions(img)
      ),
    };

    // Handle legacy watermarkImage field
    if (options.watermarkImage) {
      optimized.watermarkImage = this.optimizeImageOptions(
        options.watermarkImage
      );
    }

    // Handle legacy watermarkPositions field
    if (options.watermarkPositions) {
      optimized.watermarkPositions = this.optimizePositionOptions(
        options.watermarkPositions
      );
    }

    // Only include optional fields if they have meaningful values
    if (options.quality !== undefined && options.quality > 0) {
      optimized.quality = options.quality;
    }

    if (options.filename && options.filename.trim().length > 0) {
      optimized.filename = options.filename.trim();
    }

    if (options.saveFormat) {
      optimized.saveFormat = options.saveFormat;
    }

    if (options.maxSize !== undefined && options.maxSize > 0) {
      optimized.maxSize = options.maxSize;
    }

    return optimized;
  }

  /**
   * Optimizes text options by removing undefined values and optimizing nested structures
   */
  private static optimizeTextOptions(textOptions: TextOptions): TextOptions {
    const optimized: TextOptions = {
      text: textOptions.text,
    };

    // Optimize position options
    if (textOptions.position) {
      optimized.position = this.optimizePositionOptions(textOptions.position);
    }

    // Handle legacy positionOptions field
    if (textOptions.positionOptions) {
      optimized.positionOptions = this.optimizePositionOptions(
        textOptions.positionOptions
      );
    }

    // Optimize text style
    if (textOptions.style) {
      optimized.style = this.optimizeTextStyle(textOptions.style);
    }

    return optimized;
  }

  /**
   * Optimizes image options by removing undefined values
   */
  private static optimizeImageOptions(
    imageOptions: ImageOptions
  ): ImageOptions {
    const optimized: ImageOptions = {
      src: imageOptions.src,
    };

    if (imageOptions.scale !== undefined && imageOptions.scale !== 1.0) {
      optimized.scale = imageOptions.scale;
    }

    if (imageOptions.rotate !== undefined && imageOptions.rotate !== 0) {
      optimized.rotate = imageOptions.rotate;
    }

    if (imageOptions.alpha !== undefined && imageOptions.alpha !== 1.0) {
      optimized.alpha = imageOptions.alpha;
    }

    return optimized;
  }

  /**
   * Optimizes watermark image options
   */
  private static optimizeWatermarkImageOptions(
    watermarkOptions: WatermarkImageOptions
  ): WatermarkImageOptions {
    const optimized: WatermarkImageOptions = {
      ...this.optimizeImageOptions(watermarkOptions),
    };

    if (watermarkOptions.position) {
      optimized.position = this.optimizePositionOptions(
        watermarkOptions.position
      );
    }

    return optimized;
  }

  /**
   * Optimizes position options by removing undefined values
   */
  private static optimizePositionOptions(positionOptions: any): any {
    const optimized: any = {};

    if (positionOptions.position !== undefined) {
      optimized.position = positionOptions.position;
    }

    if (positionOptions.X !== undefined) {
      optimized.X =
        typeof positionOptions.X === 'string'
          ? parseFloat(positionOptions.X) || positionOptions.X
          : positionOptions.X;
    }

    if (positionOptions.Y !== undefined) {
      optimized.Y =
        typeof positionOptions.Y === 'string'
          ? parseFloat(positionOptions.Y) || positionOptions.Y
          : positionOptions.Y;
    }

    return Object.keys(optimized).length > 0 ? optimized : undefined;
  }

  /**
   * Optimizes text style by removing undefined values and flattening structures
   */
  private static optimizeTextStyle(style: any): any {
    const optimized: any = {};

    // Basic text properties
    if (style.color && style.color.trim().length > 0) {
      optimized.color = style.color.trim();
    }

    if (style.fontName && style.fontName.trim().length > 0) {
      optimized.fontName = style.fontName.trim();
    }

    if (style.fontSize !== undefined && style.fontSize > 0) {
      optimized.fontSize = style.fontSize;
    }

    // Boolean properties (only include if true to reduce payload)
    if (style.bold === true) {
      optimized.bold = true;
    }

    if (style.italic === true) {
      optimized.italic = true;
    }

    if (style.underline === true) {
      optimized.underline = true;
    }

    if (style.strikeThrough === true) {
      optimized.strikeThrough = true;
    }

    // Numeric properties (only include if non-zero)
    if (style.rotate !== undefined && style.rotate !== 0) {
      optimized.rotate = style.rotate;
    }

    if (style.skewX !== undefined && style.skewX !== 0) {
      optimized.skewX = style.skewX;
    }

    // Text alignment
    if (style.textAlign && style.textAlign !== 'left') {
      optimized.textAlign = style.textAlign;
    }

    // Shadow style optimization
    if (style.shadowStyle) {
      const shadowOptimized = this.optimizeShadowStyle(style.shadowStyle);
      if (shadowOptimized) {
        optimized.shadowStyle = shadowOptimized;
      }
    }

    // Text background style optimization
    if (style.textBackgroundStyle) {
      const backgroundOptimized = this.optimizeTextBackgroundStyle(
        style.textBackgroundStyle
      );
      if (backgroundOptimized) {
        optimized.textBackgroundStyle = backgroundOptimized;
      }
    }

    return Object.keys(optimized).length > 0 ? optimized : undefined;
  }

  /**
   * Optimizes shadow style by removing zero values
   */
  private static optimizeShadowStyle(shadowStyle: any): any | undefined {
    const optimized: any = {};

    if (shadowStyle.dx !== undefined && shadowStyle.dx !== 0) {
      optimized.dx = shadowStyle.dx;
    }

    if (shadowStyle.dy !== undefined && shadowStyle.dy !== 0) {
      optimized.dy = shadowStyle.dy;
    }

    if (shadowStyle.radius !== undefined && shadowStyle.radius > 0) {
      optimized.radius = shadowStyle.radius;
    }

    if (shadowStyle.color && shadowStyle.color.trim().length > 0) {
      optimized.color = shadowStyle.color.trim();
    }

    // Only return shadow style if it has meaningful values
    return Object.keys(optimized).length >= 3 ? optimized : undefined;
  }

  /**
   * Optimizes text background style by removing default values
   */
  private static optimizeTextBackgroundStyle(
    backgroundStyle: any
  ): any | undefined {
    const optimized: any = {};

    if (backgroundStyle.type && backgroundStyle.type !== 'fit') {
      optimized.type = backgroundStyle.type;
    }

    if (backgroundStyle.color && backgroundStyle.color.trim().length > 0) {
      optimized.color = backgroundStyle.color.trim();
    }

    // Optimize padding
    const paddingOptimized = this.optimizePadding(backgroundStyle);
    if (paddingOptimized) {
      Object.assign(optimized, paddingOptimized);
    }

    // Optimize corner radius
    if (backgroundStyle.cornerRadius) {
      const cornerRadiusOptimized = this.optimizeCornerRadius(
        backgroundStyle.cornerRadius
      );
      if (cornerRadiusOptimized) {
        optimized.cornerRadius = cornerRadiusOptimized;
      }
    }

    // Special case: if type is 'fit' (none) and only color is set, remove it
    // because a background with type 'none' doesn't actually show anything
    if (
      optimized.type === 'fit' &&
      Object.keys(optimized).length <= 2 &&
      optimized.color
    ) {
      return undefined;
    }

    // Only return background style if it has meaningful properties beyond just color
    // A background style with only color is not very useful without type or other properties
    const hasNonColorProperties = Object.keys(optimized).some(
      (key) => key !== 'color'
    );

    return hasNonColorProperties ? optimized : undefined;
  }

  /**
   * Optimizes padding by consolidating values where possible
   */
  private static optimizePadding(paddingStyle: any): any | undefined {
    const optimized: any = {};

    // Use consolidated padding if all sides are the same
    if (paddingStyle.padding !== undefined && paddingStyle.padding > 0) {
      optimized.padding = paddingStyle.padding;
      return optimized;
    }

    // Use horizontal/vertical padding if applicable
    if (
      paddingStyle.paddingHorizontal !== undefined &&
      paddingStyle.paddingHorizontal > 0
    ) {
      optimized.paddingHorizontal = paddingStyle.paddingHorizontal;
    } else if (
      paddingStyle.paddingX !== undefined &&
      paddingStyle.paddingX > 0
    ) {
      optimized.paddingX = paddingStyle.paddingX;
    } else {
      // Individual horizontal padding
      if (
        paddingStyle.paddingLeft !== undefined &&
        paddingStyle.paddingLeft > 0
      ) {
        optimized.paddingLeft = paddingStyle.paddingLeft;
      }
      if (
        paddingStyle.paddingRight !== undefined &&
        paddingStyle.paddingRight > 0
      ) {
        optimized.paddingRight = paddingStyle.paddingRight;
      }
    }

    if (
      paddingStyle.paddingVertical !== undefined &&
      paddingStyle.paddingVertical > 0
    ) {
      optimized.paddingVertical = paddingStyle.paddingVertical;
    } else if (
      paddingStyle.paddingY !== undefined &&
      paddingStyle.paddingY > 0
    ) {
      optimized.paddingY = paddingStyle.paddingY;
    } else {
      // Individual vertical padding
      if (
        paddingStyle.paddingTop !== undefined &&
        paddingStyle.paddingTop > 0
      ) {
        optimized.paddingTop = paddingStyle.paddingTop;
      }
      if (
        paddingStyle.paddingBottom !== undefined &&
        paddingStyle.paddingBottom > 0
      ) {
        optimized.paddingBottom = paddingStyle.paddingBottom;
      }
    }

    return Object.keys(optimized).length > 0 ? optimized : undefined;
  }

  /**
   * Optimizes corner radius by consolidating values where possible
   */
  private static optimizeCornerRadius(cornerRadius: any): any | undefined {
    const optimized: any = {};

    // Use consolidated radius if all corners are the same
    if (cornerRadius.all) {
      const radiusValue = this.optimizeRadiusValue(cornerRadius.all);
      if (radiusValue) {
        optimized.all = radiusValue;
        return optimized;
      }
    }

    // Individual corner radius
    if (cornerRadius.topLeft) {
      const radiusValue = this.optimizeRadiusValue(cornerRadius.topLeft);
      if (radiusValue) {
        optimized.topLeft = radiusValue;
      }
    }

    if (cornerRadius.topRight) {
      const radiusValue = this.optimizeRadiusValue(cornerRadius.topRight);
      if (radiusValue) {
        optimized.topRight = radiusValue;
      }
    }

    if (cornerRadius.bottomLeft) {
      const radiusValue = this.optimizeRadiusValue(cornerRadius.bottomLeft);
      if (radiusValue) {
        optimized.bottomLeft = radiusValue;
      }
    }

    if (cornerRadius.bottomRight) {
      const radiusValue = this.optimizeRadiusValue(cornerRadius.bottomRight);
      if (radiusValue) {
        optimized.bottomRight = radiusValue;
      }
    }

    return Object.keys(optimized).length > 0 ? optimized : undefined;
  }

  /**
   * Optimizes radius value by converting strings to numbers where possible
   */
  private static optimizeRadiusValue(radiusValue: any): any | undefined {
    if (!radiusValue) return undefined;

    const optimized: any = {};

    if (radiusValue.x !== undefined) {
      const xValue =
        typeof radiusValue.x === 'string'
          ? parseFloat(radiusValue.x) || radiusValue.x
          : radiusValue.x;

      // Only include non-zero values
      if (xValue !== 0) {
        optimized.x = xValue;
      }
    }

    if (radiusValue.y !== undefined) {
      const yValue =
        typeof radiusValue.y === 'string'
          ? parseFloat(radiusValue.y) || radiusValue.y
          : radiusValue.y;

      // Only include non-zero values
      if (yValue !== 0) {
        optimized.y = yValue;
      }
    }

    return Object.keys(optimized).length > 0 ? optimized : undefined;
  }

  /**
   * Calculates the approximate serialization size of an object
   * Used for performance monitoring and optimization decisions
   */
  static calculateSerializationSize(obj: any): number {
    return JSON.stringify(obj).length;
  }

  /**
   * Compares serialization sizes before and after optimization
   */
  static compareOptimization(
    original: any,
    optimized: any
  ): {
    originalSize: number;
    optimizedSize: number;
    reduction: number;
    reductionPercentage: number;
  } {
    const originalSize = this.calculateSerializationSize(original);
    const optimizedSize = this.calculateSerializationSize(optimized);
    const reduction = originalSize - optimizedSize;
    const reductionPercentage =
      originalSize > 0 ? (reduction / originalSize) * 100 : 0;

    return {
      originalSize,
      optimizedSize,
      reduction,
      reductionPercentage,
    };
  }
}
