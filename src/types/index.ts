/**
 * Shared type definitions for both legacy and new architecture implementations
 * These types are generated from Codegen specifications and provide full type safety
 */

/**
 * @description Position enum for text watermark and image watermark
 * @enum
 * Note: Codegen generates C++ code based on enum KEYS
 * Keys must use PascalCase for C++ compatibility, values use camelCase for JS
 */
export enum Position {
  TopLeft = 'topLeft',
  TopCenter = 'topCenter',
  TopRight = 'topRight',
  BottomLeft = 'bottomLeft',
  BottomCenter = 'bottomCenter',
  BottomRight = 'bottomRight',
  Center = 'center',
}

/**
 * @description TextBackgroundType enum for text watermark
 * @enum
 * Note: Codegen generates C++ code based on enum KEYS
 * Keys must use PascalCase for C++ compatibility, values use camelCase for JS
 */
export enum TextBackgroundType {
  StretchX = 'stretchX',
  StretchY = 'stretchY',
  Fit = 'fit',
}

/**
 * @description ImageFormat enum for save image format
 * @enum
 * Note: Codegen generates C++ code based on enum KEYS
 * Keys must use PascalCase for C++ compatibility, values use camelCase for JS
 */
export enum ImageFormat {
  Png = 'png',
  Jpg = 'jpg',
  // base64 string
  Base64 = 'base64',
}

/**
 * Generic type for image source that can be a require() statement, URI string, or base64 data
 * @template T - The type of the image source
 */
export type ImageSource<T = any> =
  | T
  | string
  | { uri: string }
  | { data: string };

/**
 * Generic type for numeric values that can be numbers or string representations
 */
export type NumericValue = number | string;

/**
 * Generic type for optional numeric values
 */
export type OptionalNumericValue = NumericValue | undefined;

/**
 * Generic type for color values (hex strings, named colors, etc.)
 */
export type ColorValue = string;

/**
 * Generic type for font names
 */
export type FontName = string;

/**
 * @description Padding style for text background with generic numeric values
 * @template T - The type of padding values (number | string)
 */
export interface Padding<T extends NumericValue = NumericValue> {
  padding?: T;
  paddingLeft?: T;
  paddingRight?: T;
  paddingTop?: T;
  paddingBottom?: T;
  paddingHorizontal?: T;
  paddingVertical?: T;
  paddingX?: T;
  paddingY?: T;
}

/**
 * @description PositionOptions for text watermark and image watermark with generic coordinates
 * @template T - The type of coordinate values (number | string)
 */
export interface PositionOptions<T extends NumericValue = NumericValue> {
  X?: T;
  Y?: T;
  position?: Position;
}

/**
 * @description ShadowLayer style for text watermark with type-safe properties
 */
export interface ShadowLayerStyle {
  /** Horizontal offset of the shadow */
  dx: number;
  /** Vertical offset of the shadow */
  dy: number;
  /** Blur radius of the shadow */
  radius: number;
  /** Color of the shadow */
  color: ColorValue;
}

/**
 * @description Radius value with generic numeric type
 * @template T - The type of radius values (number | string)
 */
export interface RadiusValue<T extends NumericValue = NumericValue> {
  x: T;
  y: T;
}

/**
 * @description Corner radius configuration with generic numeric type
 * @template T - The type of radius values (number | string)
 */
export interface CornerRadius<T extends NumericValue = NumericValue> {
  topLeft?: RadiusValue<T>;
  topRight?: RadiusValue<T>;
  bottomLeft?: RadiusValue<T>;
  bottomRight?: RadiusValue<T>;
  all?: RadiusValue<T>;
}

/**
 * @description Background style for text watermark with generic types
 * @template T - The type of numeric values (number | string)
 */
export interface TextBackgroundStyle<T extends NumericValue = NumericValue>
  extends Padding<T> {
  /** Background type for text */
  type?: TextBackgroundType | null;
  /** Background color */
  color: ColorValue;
  /** Corner radius configuration */
  cornerRadius?: CornerRadius<T>;
}

/**
 * @description TextStyle for text watermark with comprehensive type safety
 * @template T - The type of numeric values (number | string)
 */
export interface TextStyle<T extends NumericValue = NumericValue> {
  /** Text color */
  color?: ColorValue;
  /** Font family name */
  fontName?: FontName;
  /** Font size */
  fontSize?: number;
  /** Shadow style configuration */
  shadowStyle?: ShadowLayerStyle | null;
  /** Text background style configuration */
  textBackgroundStyle?: TextBackgroundStyle<T> | null;
  /** Whether text should be underlined */
  underline?: boolean;
  /** Horizontal skew transformation */
  skewX?: number;
  /** Whether text should have strikethrough */
  strikeThrough?: boolean;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** Whether text should be italic */
  italic?: boolean;
  /** Whether text should be bold */
  bold?: boolean;
  /** Rotation angle in degrees */
  rotate?: number;
}

/**
 * @description Text options for text watermark with generic types
 * @template T - The type of numeric values (number | string)
 */
export interface TextOptions<T extends NumericValue = NumericValue> {
  /** The text content to render */
  text: string;
  /** Position options (deprecated, use position instead) */
  positionOptions?: PositionOptions<T>;
  /** Position configuration */
  position?: PositionOptions<T>;
  /** Text styling configuration */
  style?: TextStyle<T>;
}

/**
 * @description Image options for background image or watermark image with generic source type
 * @template S - The type of image source
 */
export interface ImageOptions<S = any> {
  /** Image source (require(), URI, or base64) */
  src: ImageSource<S>;
  /** Scale factor for the image */
  scale?: number;
  /** Rotation angle in degrees */
  rotate?: number;
  /** Alpha/opacity value (0.0 to 1.0) */
  alpha?: number;
}

/**
 * @description Watermark image options with position and generic types
 * @template T - The type of numeric values (number | string)
 * @template S - The type of image source
 */
export interface WatermarkImageOptions<
  T extends NumericValue = NumericValue,
  S = any
> extends ImageOptions<S> {
  /** Position configuration for the watermark */
  position?: PositionOptions<T>;
}

/**
 * @description Options for text watermark with comprehensive generic type support
 * @template T - The type of numeric values (number | string)
 * @template S - The type of image source
 */
export interface TextMarkOptions<
  T extends NumericValue = NumericValue,
  S = any
> {
  /** Background image configuration */
  backgroundImage: ImageOptions<S>;
  /** Array of text watermarks to apply */
  watermarkTexts: TextOptions<T>[];
  /** Image quality (0-100) */
  quality?: number;
  /** Output filename (without extension) */
  filename?: string;
  /** Output image format */
  saveFormat?: ImageFormat;
  /** Maximum output image size */
  maxSize?: number;
}

/**
 * @description Options for image watermark with comprehensive generic type support
 * @template T - The type of numeric values (number | string)
 * @template S - The type of image source
 */
export interface ImageMarkOptions<
  T extends NumericValue = NumericValue,
  S = any
> {
  /** Background image configuration */
  backgroundImage: ImageOptions<S>;
  /** Single watermark image (deprecated, use watermarkImages instead) */
  watermarkImage?: ImageOptions<S>;
  /** Position for single watermark (deprecated, use watermarkImages instead) */
  watermarkPositions?: PositionOptions<T>;
  /** Image quality (0-100) */
  quality?: number;
  /** Output filename (without extension) */
  filename?: string;
  /** Output image format */
  saveFormat?: ImageFormat;
  /** Maximum output image size */
  maxSize?: number;
  /** Array of watermark images to apply */
  watermarkImages: WatermarkImageOptions<T, S>[];
}

// Type aliases for common use cases
/**
 * Standard text mark options with number coordinates and any image source
 */
export type StandardTextMarkOptions = TextMarkOptions<number, any>;

/**
 * Standard image mark options with number coordinates and any image source
 */
export type StandardImageMarkOptions = ImageMarkOptions<number, any>;

/**
 * Strict text mark options with number coordinates and require() image sources
 */
export type StrictTextMarkOptions = TextMarkOptions<number, number>;

/**
 * Strict image mark options with number coordinates and require() image sources
 */
export type StrictImageMarkOptions = ImageMarkOptions<number, number>;

/**
 * URI-based text mark options with string coordinates and URI image sources
 */
export type URITextMarkOptions = TextMarkOptions<string, string>;

/**
 * URI-based image mark options with string coordinates and URI image sources
 */
export type URIImageMarkOptions = ImageMarkOptions<string, string>;

// Utility types for extracting specific configurations
/**
 * Extract the background image type from text mark options
 */
export type BackgroundImageType<T extends TextMarkOptions<any, any>> =
  T['backgroundImage'];

/**
 * Extract the watermark text type from text mark options
 */
export type WatermarkTextType<T extends TextMarkOptions<any, any>> =
  T['watermarkTexts'][0];

/**
 * Extract the watermark image type from image mark options
 */
export type WatermarkImageType<T extends ImageMarkOptions<any, any>> =
  T['watermarkImages'][0];

// Conditional types for better type inference
/**
 * Infer the numeric type from options
 */
export type InferNumericType<T> = T extends TextMarkOptions<infer N, any>
  ? N
  : T extends ImageMarkOptions<infer N, any>
  ? N
  : NumericValue;

/**
 * Infer the source type from options
 */
export type InferSourceType<T> = T extends TextMarkOptions<any, infer S>
  ? S
  : T extends ImageMarkOptions<any, infer S>
  ? S
  : any;
