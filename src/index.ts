import { NativeModules, Platform, Image } from 'react-native';

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
 * PositionOptions for text watermark and image watermark
 */
export interface PositionOptions {
  // if you set position you don't need to set X and Y
  X?: number;
  Y?: number;
  position?: Position;
}

/**
 * TextStyle for text watermark
 */
export interface TextStyle {
  /**
   * font color
   * eg. '#aacc22'
   */
  color?: string;
  /**
   * font name
   * Android use Typeface.create
   * iOS use UIFont
   * eg. 'Arial'
   */
  fontName?: string;
  /**
   * font size
   * Android use sp
   * iOS use pt
   * eg. 12
   */
  fontSize?: number;
  /**
   * text shadow style
   */
  shadowStyle?: ShadowLayerStyle | null;
  /**
   * text background style
   */
  textBackgroundStyle?: TextBackgroundStyle | null;
  /**
   * text underline style
   * @defaultValue false
   * Android: Paint.setUnderlineText
   * iOS: NSUnderlineStyleAttributeName
   */
  underline?: boolean;
  /**
   * css italic with degree, you can use italic instead
   * Android: Paint.skewX
   * iOS: NSObliquenessAttributeName
   */
  skewX?: number;
  /**
   * text stroke
   * @defaultValue false
   * iOS: NSStrikethroughStyleAttributeName
   * android: Paint.setStrikeThruText
   */
  strikeThrough?: boolean;
  /**
   * text align
   * @defaultValue 'left'
   * iOS: NSTextAlignment: NSTextAlignmentLeft, NSTextAlignmentCenter, NSTextAlignmentRight
   * android: Paint.setTextAlign
   * eg. 'left'
   */
  textAlign?: 'left' | 'center' | 'right';
  /**
   * text italic
   * @defaultValue false
   */
  italic?: boolean;
  /**
   * text bold
   * @defaultValue false
   */
  bold?: boolean;
  /**
   * rotate text
   * @defaultValue 0
   * eg. 45
   */
  rotate?: number;
}

/**
 * ShadowLayer style for text watermark
 * Android: Paint.setShadowLayer
 * iOS: NSAttributedString.shadow
 */
export interface ShadowLayerStyle {
  dx: number; // shadow offset x
  dy: number; // shadow offset y
  radius: number; // shadow radius
  color: string; // shadow color eg. '#aacc22'
}

/**
 * background style for text watermark
 * > thanks [@onka13](https://github.com/onka13) for [#38](https://github.com/JimmyDaddy/react-native-image-marker/pull/38)
 */
export interface TextBackgroundStyle {
  paddingX: number; // padding x
  paddingY: number; // padding y
  type: TextBackgroundType | null; // background type see @TextBackgroundType
  color: string; // background color eg. '#aacc22'
}

/**
 * Text options for text watermark
 */
export interface TextOptions {
  text: string; // text content
  positionOptions?: PositionOptions; // position options see @PositionOptions
  style?: TextStyle; // text style see @TextStyle
}

/**
 * Options for text watermark
 */
export interface TextMarkOptions {
  // image src, local image
  // FIXME: ImageSourcePropType type define bug
  backgroundImage: ImageOptions; // background image options see @ImageOptions
  watermarkTexts: TextOptions[]; // text options see @TextOptions
  /**
   * @defaultValue `1`
   * scale image 0 - 1
   */
  scale?: number;
  /**
   * @defaultValue `1`
   * image quality 0 - 1
   */
  quality?: number;
  filename?: string; // save image name
  /**
   * @defaultValue `jpg`
   * save image format see @ImageFormat
   */
  saveFormat?: ImageFormat;
  /**
   * @defaultValue 2048
   * android only
   * **need RN version >= 0.60.0**,  fresco `MaxBitmapSize` [`ImagePipelineConfig.Builder.experiment().setMaxBitmapSize()`](https://github.com/facebook/fresco/blob/08ca5f40cc0b60b4db16d15e45552cafeae39ccb/imagepipeline/src/main/java/com/facebook/imagepipeline/core/ImagePipelineExperiments.java#L282), see [#49](https://github.com/JimmyDaddy/react-native-image-marker/issues/49#issuecomment-535303838)
   */
  maxSize?: number; // android only see #49 #42
}

/**
 * Image options for image watermark
 */
export interface ImageOptions {
  src: any; // image src, local image
  /**
   * @defaultValue `1`
   * scale image 0 - 1
   */
  scale?: number;
  /**
   * @defaultValue `0`
   * rotate image with degree 0 - 360
   */
  rotate?: number;
  /**
   * @defaultValue `1`
   * image alpha 0 - 1
   */
  alpha?: number;
}

/**
 * Options for image watermark
 */
export interface ImageMarkOptions {
  // image src, local image
  // FIXME: ImageSourcePropType type define bug
  backgroundImage: ImageOptions; // background image options see @ImageOptions
  watermarkImage: ImageOptions; // watermark image options see @ImageOptions
  watermarkPositions?: PositionOptions; // watermark position options see @PositionOptions
  /**
   * @defaultValue `1`
   * image quality 0 - 1
   */
  quality?: number;
  filename?: string; // save image name
  /**
   * @defaultValue `jpg`
   * save image format see @ImageFormat
   * eg. 'png'
   */
  saveFormat?: ImageFormat; // save image format see @ImageFormat
  /**
   * @defaultValue 2048
   * android only
   * **need RN version >= 0.60.0**,  fresco `MaxBitmapSize` [`ImagePipelineConfig.Builder.experiment().setMaxBitmapSize()`](https://github.com/facebook/fresco/blob/08ca5f40cc0b60b4db16d15e45552cafeae39ccb/imagepipeline/src/main/java/com/facebook/imagepipeline/core/ImagePipelineExperiments.java#L282), see [#49](https://github.com/JimmyDaddy/react-native-image-marker/issues/49#issuecomment-535303838)
   */
  maxSize?: number;
}

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

class Marker {
  /** @ignore ignore constructors for typedoc only */
  constructor() {}
  /**
   * @description mark text on image
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
   *  maxSize: 1000,
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

    options.backgroundImage.src = srcObj;
    // let mShadowStyle = shadowStyle || {};
    // let mTextBackgroundStyle = textBackgroundStyle || {};
    options.maxSize = options.maxSize || 2048;
    return ImageMarker.markWithText(options);
  }

  /**
   * @description mark image on background image
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
   *  watermarkImage: {
   *    src: require('./images/watermark.png'),
   *    scale: 1,
   *    rotate: 20,
   *    alpha: 0.5,
   *  },
   *  watermarkPositions: {
   *    position: Position.center,
   *  },
   *  quality: 100,
   *  filename: 'test',
   *  saveFormat: ImageFormat.png,
   *  maxSize: 1000,
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
    const { backgroundImage, watermarkImage } = options;

    if (!backgroundImage || !backgroundImage.src) {
      throw new Error('please set image!');
    }
    if (!watermarkImage || !watermarkImage.src) {
      throw new Error('please set mark image!');
    }

    let srcObj: any = resolveAssetSource(backgroundImage.src);
    if (!srcObj) {
      srcObj = {
        uri: backgroundImage.src,
        __packager_asset: false,
      };
    }

    let markerObj: any = resolveAssetSource(watermarkImage.src);
    if (!markerObj) {
      markerObj = {
        uri: watermarkImage.src,
        __packager_asset: false,
      };
    }

    options.watermarkImage.src = markerObj;
    options.backgroundImage.src = srcObj;
    options.maxSize = options.maxSize || 2048;

    return ImageMarker.markWithImage(options);
  }
}

export default Marker;
