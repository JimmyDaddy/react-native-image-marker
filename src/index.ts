import { NativeModules, Platform, Image } from 'react-native';
import NativeImageMarker from './NativeImageMarker';

const { resolveAssetSource } = Image;
const LINKING_ERROR =
  `The package 'react-native-image-marker' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

/**
 * Position enum for text watermark and image watermark
 * @enum
 */
export enum Position {
  topLeft = 'topLeft',
  topCenter = 'topCenter',
  topRight = 'topRight',
  bottomLeft = 'bottomLeft',
  bottomCenter = 'bottomCenter',
  bottomRight = 'bottomRight',
  center = 'center',
}

/**
 * TextBackgroundType enum for text watermark
 * @enum
 */
export enum TextBackgroundType {
  stretchX = 'stretchX',
  stretchY = 'stretchY',
  none = 'fit',
}

/**
 * ImageFormat enum for save image format
 * @enum
 */
export enum ImageFormat {
  png = 'png',
  jpg = 'jpg',
  // base64 string
  base64 = 'base64',
}

/**
 * Padding style for text background
 * @example
 * padding: 10
 * // or
 * padding: '10%'
 * // or
 * padding: '10% 20%'
 * // or
 * padding: '10% 20% 30%'
 * // or
 * paddingLeft: '10%'
 * // or
 * paddingVertical: '10%'
 */
interface Padding {
  /**
   * padding for text background
   * @example
   * padding: 10
   * // or
   * padding: '10%'
   * // or
   * padding: '10% 20%'
   * // or
   * padding: '10% 20% 30%'
   * // or
   * padding: '10% 20% 30% 40%'
   * // or
   * padding: '10 20% 30 40%'
   * // or
   * padding: '10 20 30'
   */
  padding?: number | string;
  /**
   * padding left for text background
   * @example
   * paddingLeft: 10
   * // or
   * paddingLeft: '10%'
   */
  paddingLeft?: number | string;
  /**
   * padding right for text background
   * @example
   * paddingRight: 10
   * // or
   * paddingRight: '10%'
   */
  paddingRight?: number | string;
  /**
   * padding top for text background
   * @example
   * paddingTop: 10
   * // or
   * paddingTop: '10%'
   */
  paddingTop?: number | string;
  /**
   * padding bottom for text background
   * @example
   * paddingBottom: 10
   * // or
   * paddingBottom: '10%'
   */
  paddingBottom?: number | string;
  /**
   * padding left and right (horizontal) for text background
   * @example
   * paddingHorizontal: 10
   * // or
   * paddingHorizontal: '10%'
   * @since 2.0.0
   **/
  paddingHorizontal?: number | string;
  /**
   * padding top and bottom (vertical) for text background
   * @example
   * paddingVertical: 10
   * // or
   * paddingVertical: '10%'
   * @since 2.0.0
   */
  paddingVertical?: number | string;

  /**
   * padding x, alias of paddingHorizontal
   * @example
   * paddingX: 10
   * // or
   * paddingX: '10%'
   **/
  paddingX?: number | string;

  /**
   * padding y, alias of paddingVertical
   * @example
   * paddingY: 10
   * // or
   * paddingY: '10%'
   **/
  paddingY?: number | string;
}

/**
 * PositionOptions for text watermark and image watermark. When `position` is set, `X` and `Y` are treated as offsets from that anchor.
 * @example
 * positionOptions: {
 *  X: 10,
 *  Y: 10,
 * }
 * // or
 * positionOptions: {
 *  position: Position.topLeft,
 * }
 * // or
 * positionOptions: {
 *  position: Position.topRight,
 *  X: 60, // 60px from the right edge
 *  Y: 60, // 60px from the top edge
 * }
 * // or
 * positionOptions: {
 *  X: '10%', // relative to the width of the background image
 *  Y: '10%', // relative to the width of the background image
 * }
 */
export interface PositionOptions {
  X?: number | string;
  Y?: number | string;
  position?: Position;
}

/**
 * TextStyle for text watermark
 * @example
 *  textStyle: {
 *    color: '#aacc22',
 *    fontName: 'Arial',
 *    fontSize: 12,
 *    shadowStyle: {
 *      dx: 10,
 *      dy: 10,
 *      radius: 10,
 *      color: '#aacc22'
 *    },
 *    textBackgroundStyle: {
 *      paddingX: 10,
 *      paddingY: 10,
 *      type: TextBackgroundType.stretchX,
 *      color: '#aacc22'
 *    },
 *    underline: true,
 *    skewX: 45,
 *    strikeThrough: true,
 *    textAlign: 'left',
 *    italic: true,
 *    bold: true,
 *    rotate: 45
 *  }
 */
export interface TextStyle {
  /**
   * font color
   * @example
   *  color: '#aacc22'
   */
  color?: string;
  /**
   * font name
   * @example
   *  fontName: 'Arial'
   */
  fontName?: string;
  /**
   * font size used when rendering text onto the output image
   * @example
   *  fontSize: 12
   */
  fontSize?: number;
  /**
   * font size ratio relative to the background image width
   * @example
   *  fontSizeRatio: 0.03
   */
  fontSizeRatio?: number;
  /**
   * text shadow style
   * @example
   *  shadowStyle: {
   *    dx: 10,
   *    dy: 10,
   *    radius: 10,
   *    color: '#aacc22'
   *  }
   */
  shadowStyle?: ShadowLayerStyle | null;
  /**
   * text background style
   * @example
   *  textBackgroundStyle: {
   *    paddingX: 10,
   *    paddingY: 10,
   *    type: TextBackgroundType.stretchX,
   *    color: '#aacc22'
   *  }
   */
  textBackgroundStyle?: TextBackgroundStyle | null;
  /**
   * text underline style
   * @defaultValue false
   * @example
   *  underline: true
   */
  underline?: boolean;
  /**
   * css italic with degree, you can use italic instead
   * @example
   *  skewX: 45
   */
  skewX?: number;
  /**
   * text stroke
   * @defaultValue false
   * @example
   *  strikeThrough: true
   */
  strikeThrough?: boolean;
  /**
   * text align
   * @defaultValue 'left'
   * @example
   *  textAlign: 'left'
   */
  textAlign?: 'left' | 'center' | 'right';
  /**
   * text italic
   * @defaultValue false
   * @example
   *  italic: true
   */
  italic?: boolean;
  /**
   * text bold
   * @defaultValue false
   * @example
   *  bold: true
   */
  bold?: boolean;
  /**
   * rotate text
   * @defaultValue 0
   * @example
   *  rotate: 45
   */
  rotate?: number;
}

/**
 * ShadowLayer style for text watermark
 * @example
 * shadowStyle: {
 *  dx: 10,
 *  dy: 10,
 *  radius: 10,
 *  color: '#aacc22'
 * }
 */
export interface ShadowLayerStyle {
  /**
   * shadow offset x
   * @example
   *  dx: 10
   */
  dx: number;
  /**
   * shadow offset y
   * @example
   *  dy: 10
   **/
  dy: number;
  /**
   * shadow radius
   * @example
   *  radius: 10
   **/
  radius: number;
  /**
   * shadow color
   * @example
   * color: '#aacc22'
   **/
  color: string;
}

export interface RadiusValue {
  x: number | string;
  y: number | string;
}

export interface CornerRadius {
  topLeft?: RadiusValue;
  topRight?: RadiusValue;
  bottomLeft?: RadiusValue;
  bottomRight?: RadiusValue;
  all?: RadiusValue;
}

/**
 * background style for text watermark
 * > thanks [@onka13](https://github.com/onka13) for [#38](https://github.com/JimmyDaddy/react-native-image-marker/pull/38)
 * @example
 * textBackgroundStyle: {
 *  paddingX: 10,
 *  paddingY: 10,
 *  type: TextBackgroundType.stretchX,
 *  color: '#aacc22'
 * }
 * // or
 * textBackgroundStyle: {
 *  padding: '10% 50 15%',
 *  color: '#aacc22'
 * }
 * // or
 * textBackgroundStyle: {
 *  padding: 10,
 *  color: '#aacc22',
 *  cornerRadius: {
 *    topLeft: {
 *      x: '10%',
 *      y: 10,
 *    },
 *    topRight: {
 *      x: 10,
 *      y: 10,
 *    },
 *  }
 * }
 */
export interface TextBackgroundStyle extends Padding {
  /**
   * background type
   * @defaultValue TextBackgroundType.stretchX
   * @example
   *  type: TextBackgroundType.stretchX
   **/
  type?: TextBackgroundType | null;
  /**
   * background color
   * @example
   * color: '#aacc22'
   **/
  color: string;

  /**
   * background corner radius
   * @example
   * cornerRadius: {
   *  topLeft: {
   *    x: '10%',
   *    y: 10,
   *  },
   *  topRight: {
   *    x: 10,
   *    y: 10,
   *  },
   *  bottomLeft: {
   *    x: 10,
   *    y: 10,
   *  },
   *  bottomRight: {
   *    x: '10%',
   *    y: 10,
   *  },
   * }
   **/
  cornerRadius?: CornerRadius;
}

/**
 * Text options for text watermark
 * @example
 *  text: 'hello world',
 *  positionOptions: {
 *    X: 10,
 *    Y: 10,
 *    // or
 *    // position: Position.center
 *  },
 *  style: {
 *    color: '#aacc22',
 *    fontName: 'Arial',
 *    fontSize: 12,
 *    shadowStyle: {
 *      dx: 10,
 *      dy: 10,
 *      radius: 10,
 *      color: '#aacc22'
 *    },
 *    textBackgroundStyle: {
 *      paddingX: 10,
 *      paddingY: 10,
 *      type: TextBackgroundType.stretchX,
 *      color: '#aacc22'
 *    },
 *    underline: true,
 *    skewX: 45,
 *    strikeThrough: true,
 *    textAlign: 'left',
 *    italic: true,
 *    bold: true,
 *    rotate: 45
 *  }
 */
export interface TextOptions {
  /**
   * text content
   * @example
   * text: 'hello world'
   **/
  text: string;
  /**
   * @deprecated since 1.2.4 use position instead
   * text position options
   * @example
   *  positionOptions: {
   *   X: 10,
   *   Y: 10,
   *   // or
   *   // position: Position.center
   * }
   */
  positionOptions?: PositionOptions;

  /**
   * text position options
   * @example
   *  positionOptions: {
   *   X: 10,
   *   Y: 10,
   *   // or
   *   // position: Position.center
   * }
   */
  position?: PositionOptions;

  /**
   * text style
   * @example
   * style: {
   *  color: '#aacc22',
   *  fontName: 'Arial',
   *  fontSize: 12,
   *  shadowStyle: {
   *    dx: 10,
   *    dy: 10,
   *    radius: 10,
   *    color: '#aacc22'
   *  },
   *  textBackgroundStyle: {
   *    paddingX: 10,
   *    paddingY: 10,
   *    type: TextBackgroundType.stretchX,
   *    color: '#aacc22'
   *  },
   *  underline: true,
   *  strikeThrough: true,
   *  textAlign: 'left',
   *  italic: true,
   *  // or
   *  // skewX: 45,
   *  bold: true,
   *  rotate: 45
   * }
   */
  style?: TextStyle;
}

/**
 * Options for text watermark
 * @example
 *  backgroundImage: {
 *    src: require('./images/logo.png'),
 *    scale: 0.5,
 *    rotate: 45,
 *    alpha: 0.5
 *  },
 *  watermarkTexts: [
 *  {
 *    text: 'hello world',
 *    positionOptions: {
 *      X: 10,
 *      Y: 10,
 *      // or
 *      // position: Position.center
 *    },
 *    style: {
 *      color: '#aacc22',
 *      fontName: 'Arial',
 *      fontSize: 12,
 *      shadowStyle: {
 *        dx: 10,
 *        dy: 10,
 *        radius: 10,
 *        color: '#aacc22'
 *      },
 *      textBackgroundStyle: {
 *        paddingX: 10,
 *        paddingY: 10,
 *        type: TextBackgroundType.stretchX,
 *        color: '#aacc22'
 *      },
 *      underline: true,
 *      strikeThrough: true,
 *      textAlign: 'left',
 *      italic: true,
 *      //or
 *      // skewX: 45,
 *      bold: true,
 *      rotate: 45
 *    }
 *  }],
 *  quality: 1,
 *  filename: 'test',
 *  saveFormat: ImageFormat.jpg,
 */
export interface TextMarkOptions {
  /**
   * FIXME: ImageSourcePropType type define bug
   * background image options
   * @example
   * backgroundImage: {
   *  src: require('./images/logo.png'),
   *  scale: 0.5,
   *  rotate: 45,
   *  alpha: 0.5
   * }
   **/
  backgroundImage: ImageOptions;
  /**
   * text options
   * @example
   * watermarkTexts: [
   * {
   *  text: 'hello world',
   *  positionOptions: {
   *    X: 10,
   *    Y: 10,
   *    // or
   *    // position: Position.center
   *  },
   *  style: {
   *    color: '#aacc22',
   *    fontName: 'Arial',
   *    fontSize: 12,
   *    shadowStyle: {
   *      dx: 10,
   *      dy: 10,
   *      radius: 10,
   *      color: '#aacc22'
   *    },
   *    textBackgroundStyle: {
   *      paddingX: 10,
   *      paddingY: 10,
   *      type: TextBackgroundType.stretchX,
   *      color: '#aacc22'
   *    },
   *    underline: true,
   *    strikeThrough: true,
   *    textAlign: 'left',
   *    italic: true,
   *    //or
   *    // skewX: 45,
   *    bold: true,
   *    rotate: 45
   *  }
   * }]
   **/
  watermarkTexts: TextOptions[];
  /**
   * image quality `0-100`, `100` is best quality. If you want the quality to have more effect, try to set the image export format to the compressible format `jpg`. see #159
   * @defaultValue 100
   * @example
   * quality: 100
   */
  quality?: number;
  /**
   * save image name
   * @example
   * filename: 'test'
   **/
  filename?: string;
  /**
   * save image format
   * @defaultValue `jpg`
   * @example
   * saveFormat: ImageFormat.png
   */
  saveFormat?: ImageFormat;
  /**
   * @deprecated since 1.2.0
   * max image size see #49 #42
   * android only
   * **need RN version >= 0.60.0**,  fresco `MaxBitmapSize` [`ImagePipelineConfig.Builder.experiment().setMaxBitmapSize()`](https://github.com/facebook/fresco/blob/08ca5f40cc0b60b4db16d15e45552cafeae39ccb/imagepipeline/src/main/java/com/facebook/imagepipeline/core/ImagePipelineExperiments.java#L282), see [#49](https://github.com/JimmyDaddy/react-native-image-marker/issues/49#issuecomment-535303838)
   * @defaultValue 2048
   * @example
   * maxSize: 2048
   */
  maxSize?: number;
}

/**
 * Image options for background image or watermark image
 * @example
 * {
 *  src: require('./images/logo.png'),
 *  scale: 0.5,
 *  rotate: 45,
 *  alpha: 0.5
 * }
 */
export interface ImageOptions {
  /**
   * image src, local image
   * @example
   * src: require('./images/logo.png')
   */
  src: any;
  /**
   * image scale `>0`
   * @defaultValue 1
   * @example
   * scale: 1
   */
  scale?: number;
  /**
   * rotate image rotate `0-360`
   * @defaultValue 0
   * @example
   * rotate: 45
   */
  rotate?: number;
  /**
   * transparent of background image `0 - 1`
   * @defaultValue 1
   * @example
   * alpha: 0.5
   */
  alpha?: number;
}

/**
 * Text options for image watermark
 * @example
 *  src: require('./images/logo.png'),
 *  scale: 0.5,
 *  rotate: 45,
 *  alpha: 0.5
 *  position: {
 *   X: 10,
 *   Y: 10,
 *   // or
 *   // position: Position.center
 * }
 **/
export interface WatermarkImageOptions extends ImageOptions {
  position?: PositionOptions;
}

/**
 * Text options for image watermark
 * @example
 *
 *  backgroundImage: {
 *    src: require('./images/bg.png'),
 *    scale: 0.5,
 *    rotate: 45,
 *    alpha: 0.5
 *  },
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
 *  quality: 1,
 *  filename: 'test',
 *  saveFormat: ImageFormat.jpg,
 *
 */
export interface ImageMarkOptions {
  /**
   * FIXME: ImageSourcePropType type define bug
   * background image options
   * @example
   *  backgroundImage: {
   *    src: require('./images/bg.png'),
   *    scale: 0.5,
   *    rotate: 45,
   *    alpha: 0.5
   *  }
   **/
  backgroundImage: ImageOptions;
  /**
   * @since 1.1.0
   * @deprecated use watermarkImages instead
   * watermark image options
   * @example
   *  watermarkImage: {
   *    src: require('./images/logo.png'),
   *    scale: 0.5,
   *    rotate: 45,
   *    alpha: 0.5
   *  }
   */
  watermarkImage?: ImageOptions;
  /**
   * @since 1.1.0
   * @deprecated use watermarkImages instead
   * watermark position options
   * @example
   * watermarkPositions: {
   *  X: 10,
   *  Y: 10,
   *  // or
   *  position: Position.center
   * }
   * Note: use watermarkImages instead
   */
  watermarkPositions?: PositionOptions; // watermark position options see @PositionOptions
  /**
   * image quality `0-1`
   * @defaultValue 1
   * @example
   * quality: 1
   */
  quality?: number;
  /**
   * save image name
   * @example
   * filename: 'test'
   **/
  filename?: string;
  /**
   * save image format
   * @defaultValue `jpg`
   * @example
   * saveFormat: ImageFormat.jpg
   */
  saveFormat?: ImageFormat;
  /**
   * @deprecated since 1.2.0
   * max image size see #49 #42
   * android only
   * **need RN version >= 0.60.0**,  fresco `MaxBitmapSize` [`ImagePipelineConfig.Builder.experiment().setMaxBitmapSize()`](https://github.com/facebook/fresco/blob/08ca5f40cc0b60b4db16d15e45552cafeae39ccb/imagepipeline/src/main/java/com/facebook/imagepipeline/core/ImagePipelineExperiments.java#L282), see [#49](https://github.com/JimmyDaddy/react-native-image-marker/issues/49#issuecomment-535303838)
   * @defaultValue 2048
   * @example
   * maxSize: 2048
   */
  maxSize?: number;
  /**
   * watermark images
   * @example
   * watermarkImages: [
   * {
   *  src: require('./images/logo.png'),
   *  scale: 0.5,
   *  rotate: 45,
   *  alpha: 0.5,
   *  position: {
   *    X: 10,
   *    Y: 10,
   *    // or
   *    position: Position.center
   *  }
   * }]
   **/
  watermarkImages: Array<WatermarkImageOptions>;
}

export interface TextWatermarkLayer extends TextOptions {
  type: 'text';
}

export interface ImageWatermarkLayer extends WatermarkImageOptions {
  type: 'image';
}

export type WatermarkLayer = TextWatermarkLayer | ImageWatermarkLayer;

/**
 * Options for marking text and image watermarks with a single call.
 * @example
 * await Marker.mark({
 *   backgroundImage: {
 *     src: require('./images/bg.png'),
 *   },
 *   watermarks: [
 *     {
 *       type: 'text',
 *       text: 'hello world',
 *       position: {
 *         position: Position.bottomCenter,
 *         Y: 24,
 *       },
 *       style: {
 *         color: '#FFFFFF',
 *         fontSize: 32,
 *       },
 *     },
 *     {
 *       type: 'image',
 *       src: require('./images/logo.png'),
 *       position: {
 *         position: Position.topRight,
 *         X: 24,
 *         Y: 24,
 *       },
 *       scale: 0.5,
 *     },
 *   ],
 *   saveFormat: ImageFormat.png,
 * });
 */
export interface MarkOptions {
  /**
   * Background image options.
   */
  backgroundImage: ImageOptions;
  /**
   * Ordered watermark layers. Layers are rendered in array order, so later layers draw over earlier layers.
   */
  watermarks?: WatermarkLayer[];
  /**
   * Text watermark options. Kept for compatibility; use watermarks instead for ordered mixed layers.
   */
  watermarkTexts?: TextOptions[];
  /**
   * @deprecated use watermarkImages instead
   * Legacy single image watermark options.
   */
  watermarkImage?: ImageOptions;
  /**
   * @deprecated use position on watermarkImages instead
   * Legacy single image watermark position options.
   */
  watermarkPositions?: PositionOptions;
  /**
   * Image watermark options. Kept for compatibility; use watermarks instead for ordered mixed layers.
   */
  watermarkImages?: Array<WatermarkImageOptions>;
  /**
   * image quality `0-100`, `100` is best quality.
   * @defaultValue 100
   */
  quality?: number;
  /**
   * save image name
   */
  filename?: string;
  /**
   * save image format
   * @defaultValue `jpg`
   */
  saveFormat?: ImageFormat;
  /**
   * @deprecated since 1.2.0
   * max image size
   * android only
   * @defaultValue 2048
   */
  maxSize?: number;
}

const ImageMarker =
  NativeImageMarker ??
  NativeModules.ImageMarker ??
  new Proxy(
    {},
    {
      get() {
        throw new Error(LINKING_ERROR);
      },
    }
  );

type OutputOptions = Pick<
  MarkOptions,
  'quality' | 'filename' | 'saveFormat' | 'maxSize'
>;

function clonePositionOptions(
  position?: PositionOptions
): PositionOptions | undefined {
  return position ? { ...position } : position;
}

function cloneCornerRadius(
  cornerRadius?: CornerRadius
): CornerRadius | undefined {
  if (!cornerRadius) {
    return cornerRadius;
  }

  return {
    topLeft: cornerRadius.topLeft ? { ...cornerRadius.topLeft } : undefined,
    topRight: cornerRadius.topRight ? { ...cornerRadius.topRight } : undefined,
    bottomLeft: cornerRadius.bottomLeft
      ? { ...cornerRadius.bottomLeft }
      : undefined,
    bottomRight: cornerRadius.bottomRight
      ? { ...cornerRadius.bottomRight }
      : undefined,
    all: cornerRadius.all ? { ...cornerRadius.all } : undefined,
  };
}

function cloneTextBackgroundStyle(
  style?: TextBackgroundStyle | null
): TextBackgroundStyle | null | undefined {
  if (!style) {
    return style;
  }

  return {
    ...style,
    cornerRadius: cloneCornerRadius(style.cornerRadius),
  };
}

function cloneTextStyle(style?: TextStyle): TextStyle | undefined {
  if (!style) {
    return style;
  }

  return {
    ...style,
    shadowStyle: style.shadowStyle
      ? { ...style.shadowStyle }
      : style.shadowStyle,
    textBackgroundStyle: cloneTextBackgroundStyle(style.textBackgroundStyle),
  };
}

function cloneTextWatermarks(watermarkTexts: TextOptions[]): TextOptions[] {
  return watermarkTexts.map((textOptions) => ({
    ...textOptions,
    position: clonePositionOptions(textOptions.position),
    positionOptions: clonePositionOptions(textOptions.positionOptions),
    style: cloneTextStyle(textOptions.style),
  }));
}

function cloneImageOptions<T extends ImageOptions | undefined>(
  imageOptions: T
): T {
  return imageOptions ? ({ ...imageOptions } as T) : imageOptions;
}

function cloneImageWatermarks(
  watermarkImages: WatermarkImageOptions[]
): WatermarkImageOptions[] {
  return watermarkImages.map((imageOptions) => ({
    ...imageOptions,
    position: clonePositionOptions(imageOptions.position),
  }));
}

function getOutputOptions(options: MarkOptions): OutputOptions {
  const outputOptions: OutputOptions = {};

  if (options.quality !== undefined) {
    outputOptions.quality = options.quality;
  }
  if (options.filename !== undefined) {
    outputOptions.filename = options.filename;
  }
  if (options.saveFormat !== undefined) {
    outputOptions.saveFormat = options.saveFormat;
  }
  if (options.maxSize !== undefined) {
    outputOptions.maxSize = options.maxSize;
  }

  return outputOptions;
}

function resolveImageSource(src: any) {
  let srcObj: any = resolveAssetSource(src);
  if (!srcObj) {
    srcObj = {
      uri: src,
      __packager_asset: false,
    };
  }
  return srcObj;
}

function createTextLayer(textOptions: TextOptions): TextWatermarkLayer {
  return {
    ...textOptions,
    type: 'text',
    position:
      clonePositionOptions(
        textOptions.position || textOptions.positionOptions
      ) || {},
    style: cloneTextStyle(textOptions.style),
  };
}

function createImageLayer(
  imageOptions: WatermarkImageOptions
): ImageWatermarkLayer {
  return {
    ...imageOptions,
    type: 'image',
    src: resolveImageSource(imageOptions.src),
    position: clonePositionOptions(imageOptions.position) || {},
  };
}

function createWatermarkLayers(options: MarkOptions): WatermarkLayer[] {
  if ((options.watermarks?.length ?? 0) > 0) {
    return options.watermarks!.map((layer) => {
      if (layer.type === 'text') {
        return createTextLayer(layer);
      }
      return createImageLayer(layer);
    });
  }

  const layers: WatermarkLayer[] = [
    ...cloneTextWatermarks(options.watermarkTexts ?? []).map(createTextLayer),
    ...cloneImageWatermarks(options.watermarkImages ?? []).map(
      createImageLayer
    ),
  ];

  if (options.watermarkImage?.src) {
    layers.push(
      createImageLayer({
        ...cloneImageOptions(options.watermarkImage),
        position: clonePositionOptions(options.watermarkPositions),
      })
    );
  }

  return layers;
}

function createNativeMarkOptions(options: MarkOptions): MarkOptions {
  return {
    backgroundImage: {
      ...cloneImageOptions(options.backgroundImage),
      src: resolveImageSource(options.backgroundImage.src),
    },
    watermarks: createWatermarkLayers(options),
    ...getOutputOptions(options),
  };
}

class Marker {
  /** @ignore ignore constructors for typedoc only */
  constructor() {}
  /**
   * Mark text-only watermarks on an image.
   *
   * This remains the supported API for text-only use cases. Use {@link mark}
   * when text and image watermarks need to be composed together in one ordered
   * native render pass.
   * @param options
   * @returns {Promise<string>} image url or base64 string
   * @example
   * const options = {
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
  static markText(options: TextMarkOptions): Promise<string> {
    const { backgroundImage } = options;

    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }

    let srcObj: any = resolveAssetSource(backgroundImage.src);
    if (!srcObj) {
      srcObj = {
        uri: backgroundImage.src,
        __packager_asset: false,
      };
    }

    options.watermarkTexts.forEach((item) => {
      item.position = item.position || item.positionOptions;
      delete item.positionOptions;
    });

    options.backgroundImage.src = srcObj;
    // let mShadowStyle = shadowStyle || {};
    // let mTextBackgroundStyle = textBackgroundStyle || {};
    options.maxSize = options.maxSize || 2048;
    return ImageMarker.markWithText(options);
  }

  /**
   * Mark image-only watermarks on a background image.
   *
   * This remains the supported API for image-only use cases. Use {@link mark}
   * when text and image watermarks need to be composed together in one ordered
   * native render pass.
   * @param options
   * @returns {Promise<string>} image url or base64 string
   * @example
   * const options = {
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
  static markImage(options: ImageMarkOptions): Promise<string> {
    const {
      backgroundImage,
      watermarkImage = {} as any,
      watermarkImages = [],
    } = options;

    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }
    if (
      (!watermarkImage || !watermarkImage.src) &&
      watermarkImages.some((item) => !item.src)
    ) {
      throw new Error('please set mark image!');
    }

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
  }

  /**
   * Mark ordered text and image watermark layers with one call.
   *
   * Use this for mixed text and image layers. Layers are rendered natively in
   * array order, so later layers draw over earlier layers.
   *
   * @param options
   * @returns {Promise<string>} image url or base64 string
   * @example
   * const result = await ImageMarker.mark({
   *   backgroundImage: { src: require('./images/background.jpg') },
   *   watermarks: [
   *     {
   *       type: 'text',
   *       text: 'Demo',
   *       position: { position: Position.bottomCenter, Y: 24 },
   *       style: { color: '#ffffff', fontSize: 32 },
   *     },
   *     {
   *       type: 'image',
   *       src: require('./images/logo.png'),
   *       position: { position: Position.topRight, X: 24, Y: 24 },
   *       scale: 0.5,
   *     },
   *   ],
   *   saveFormat: ImageFormat.png,
   * });
   */
  static mark(options: MarkOptions): Promise<string> {
    const { backgroundImage } = options;

    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }

    const nativeOptions = createNativeMarkOptions(options);
    if (!nativeOptions.watermarks || nativeOptions.watermarks.length === 0) {
      throw new Error('please set watermark text or image!');
    }
    nativeOptions.maxSize = nativeOptions.maxSize || 2048;

    return ImageMarker.markWithWatermarks(nativeOptions);
  }
}

export default Marker;
