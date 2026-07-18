import Marker from './marker';

export type {
  WatermarkBatchAbortedResult,
  WatermarkBatchFulfilledResult,
  WatermarkBatchOptions,
  WatermarkBatchProgress,
  WatermarkBatchRejectedResult,
  WatermarkBatchResult,
  WatermarkRecipe,
  WatermarkBlobRecipeResultOptions,
  WatermarkRecipeInput,
  WatermarkRecipeOptions,
  WatermarkRecipeResultOptions,
  WatermarkStringRecipeResultOptions,
} from './recipe';

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
 * Controls the output canvas after the composed image is rotated.
 *
 * `expand` preserves the entire rotated image by growing the output canvas.
 * `crop` keeps the original canvas dimensions and clips content outside it.
 * @enum
 */
export enum RotationCanvasMode {
  expand = 'expand',
  crop = 'crop',
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
   **/
  paddingHorizontal?: number | string;
  /**
   * padding top and bottom (vertical) for text background
   * @example
   * paddingVertical: 10
   * // or
   * paddingVertical: '10%'
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
 * position: {
 *  X: 10,
 *  Y: 10,
 * }
 * // or
 * position: {
 *  position: Position.topLeft,
 * }
 * // or
 * position: {
 *  position: Position.topRight,
 *  X: 60, // 60px from the right edge
 *  Y: 60, // 60px from the top edge
 * }
 * // or
 * position: {
 *  X: '10%', // relative to the width of the background image
 *  Y: '10%', // relative to the height of the background image
 * }
 */
export interface PositionOptions {
  X?: number | string;
  Y?: number | string;
  position?: Position;
  /**
   * Fallback distance from the selected anchor edges when the matching `X` or
   * `Y` value is omitted. Named anchors use the compatibility default `20`.
   * Without a named anchor, set this value when omitted axes must behave the
   * same on every platform; otherwise legacy text/image defaults are preserved.
   * Percentages are resolved against the background image.
   * @example
   * edgeInset: 0
   * // or
   * edgeInset: '5%'
   */
  edgeInset?: number | string;
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
 *    skewX: -0.25,
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
   * @defaultValue '#000000'
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
   * Optional outline drawn around the text before the fill. The width is
   * measured in output-image pixels. Set `width` to `0` to disable it.
   * @example
   * strokeStyle: {
   *   color: '#00000099',
   *   width: 2,
   * }
   */
  strokeStyle?: TextStrokeStyle | null;
  /**
   * text underline style
   * @defaultValue false
   * @example
   *  underline: true
   */
  underline?: boolean;
  /**
   * Horizontal text shear factor. Use `italic` for font-provided italics.
   * @example
   *  skewX: -0.25
   */
  skewX?: number;
  /**
   * text strikethrough
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

/** Outline style for text watermarks. */
export interface TextStrokeStyle {
  /** Outline color. */
  color: string;
  /** Non-negative outline width in output-image pixels. */
  width: number;
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
 *  position: {
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
 *    skewX: -0.25,
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
   * Opacity applied to the complete text layer, including its fill, outline,
   * shadow, and background.
   * @defaultValue 1
   * @example
   * alpha: 0.65
   */
  alpha?: number;
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
   *  position: {
   *   X: 10,
   *   Y: 10,
   *   // or
   *   // position: Position.center
   * }
   */
  position?: PositionOptions;

  /**
   * Render this watermark once or repeat it across the image. Tiled layouts
   * cannot be combined with `position` or the deprecated `positionOptions`.
   * @defaultValue `{ type: 'single' }`
   */
  layout?: WatermarkLayout;

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
   *  // skewX: -0.25,
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
 *    position: {
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
 *      // skewX: -0.25,
 *      bold: true,
 *      rotate: 45
 *    }
 *  }],
 *  quality: 100,
 *  filename: 'test',
 *  saveFormat: ImageFormat.jpg,
 */
export interface TextMarkOptions {
  /**
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
   *  position: {
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
   *    // skewX: -0.25,
   *    bold: true,
   *    rotate: 45
   *  }
   * }]
   **/
  watermarkTexts: TextOptions[];
  /**
   * Integer image quality from `0` to `100`, where `100` is best. Quality has
   * the most visible effect when the output format is `jpg`. See #159.
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
   * Matte color used when an output with transparency is encoded as JPEG.
   * JPEG has no alpha channel, so transparent pixels are composited over this
   * color before encoding.
   * @defaultValue `#FFFFFF`
   * @example
   * matteColor: '#FFFFFF'
   */
  matteColor?: string;
  /**
   * Controls whether background rotation expands the output canvas or crops
   * back to the original canvas dimensions.
   * @defaultValue RotationCanvasMode.expand
   * @example
   * rotationCanvasMode: RotationCanvasMode.crop
   */
  rotationCanvasMode?: RotationCanvasMode;
  /**
   * Maximum width or height used while decoding or rendering source images.
   * Larger images keep their aspect ratio on iOS, Android, and Web.
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
   * Image source. Supports React Native image sources and base64 data URLs.
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
   * Image opacity from `0` (transparent) to `1` (opaque).
   * @defaultValue 1
   * @example
   * alpha: 0.5
   */
  alpha?: number;
}

/**
 * Options for one image watermark layer.
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
  /**
   * Render this watermark once or repeat it across the image. Tiled layouts
   * cannot be combined with `position`.
   * @defaultValue `{ type: 'single' }`
   */
  layout?: WatermarkLayout;
  /**
   * Remove fully transparent outer rows and columns before scaling, rotating,
   * and positioning the watermark.
   * @defaultValue false
   */
  trimTransparentPadding?: boolean;
}

/** Controls whether a watermark layer is drawn once or tiled over the image. */
export type WatermarkLayout =
  | { type?: 'single' }
  | {
      type: 'tile';
      /** Horizontal space between rotated watermark bounds. */
      gapX?: number | string;
      /** Vertical space between rotated watermark bounds. */
      gapY?: number | string;
      /** Horizontal grid offset in pixels or as a percentage of canvas width. */
      offsetX?: number | string;
      /** Vertical grid offset in pixels or as a percentage of canvas height. */
      offsetY?: number | string;
      /** Shift every other row by half of its horizontal step. */
      stagger?: boolean;
    };

/**
 * Options for rendering image-only watermark layers.
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
 *  quality: 100,
 *  filename: 'test',
 *  saveFormat: ImageFormat.jpg,
 *
 */
export interface ImageMarkOptions {
  /**
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
  watermarkImage?: WatermarkImageOptions;
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
   * Integer image quality from `0` to `100`, where `100` is best.
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
   * saveFormat: ImageFormat.jpg
   */
  saveFormat?: ImageFormat;
  /**
   * Matte color used when an output with transparency is encoded as JPEG.
   * @defaultValue `#FFFFFF`
   */
  matteColor?: string;
  /**
   * Controls whether background rotation expands the output canvas or crops
   * back to the original canvas dimensions.
   * @defaultValue RotationCanvasMode.expand
   */
  rotationCanvasMode?: RotationCanvasMode;
  /**
   * Maximum width or height used while decoding or rendering source images.
   * Larger images keep their aspect ratio on iOS, Android, and Web.
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
  watermarkImages?: Array<WatermarkImageOptions>;
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
  watermarkImage?: WatermarkImageOptions;
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
   * Integer image quality from `0` to `100`, where `100` is best.
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
   * Matte color used when an output with transparency is encoded as JPEG.
   * @defaultValue `#FFFFFF`
   */
  matteColor?: string;
  /**
   * Controls whether background rotation expands the output canvas or crops
   * back to the original canvas dimensions.
   * @defaultValue RotationCanvasMode.expand
   */
  rotationCanvasMode?: RotationCanvasMode;
  /**
   * Maximum width or height used while decoding or rendering source images.
   * Larger images keep their aspect ratio on iOS, Android, and Web.
   * @defaultValue 2048
   */
  maxSize?: number;
}

export default Marker;
