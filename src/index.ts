import { NativeModules, Platform, Image } from 'react-native';

const { resolveAssetSource } = Image;
const LINKING_ERROR =
  `The package 'react-native-image-marker' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

/**
 * @description Position enum for text watermark and image watermark
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
 * @description TextBackgroundType enum for text watermark
 * @enum
 */
export enum TextBackgroundType {
  stretchX = 'stretchX',
  stretchY = 'stretchY',
  none = 'fit',
}

/**
 * @description ImageFormat enum for save image format
 * @enum
 */
export enum ImageFormat {
  png = 'png',
  jpg = 'jpg',
  // base64 string
  base64 = 'base64',
}

/**
 * @description PositionOptions for text watermark and image watermark, if you set position you don't need to set X and Y
 * @example
 * positionOptions: {
 *  X: 10,
 *  Y: 10,
 * }
 * // or
 * positionOptions: {
 *  position: Position.topLeft,
 * }
 */
export interface PositionOptions {
  X?: number;
  Y?: number;
  position?: Position;
}

/**
 * @description TextStyle for text watermark
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
   * @description font color
   * @example
   *  color: '#aacc22'
   */
  color?: string;
  /**
   * @description font name
   * @example
   *  fontName: 'Arial'
   */
  fontName?: string;
  /**
   * @description font size, Android use `sp`, iOS use `pt`
   * @example
   *  fontSize: 12
   */
  fontSize?: number;
  /**
   * @description text shadow style
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
   * @description text background style
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
   * @description text underline style
   * @defaultValue false
   * @example
   *  underline: true
   */
  underline?: boolean;
  /**
   * @description css italic with degree, you can use italic instead
   * @example
   *  skewX: 45
   */
  skewX?: number;
  /**
   * @description text stroke
   * @defaultValue false
   * @example
   *  strikeThrough: true
   */
  strikeThrough?: boolean;
  /**
   * @description text align
   * @defaultValue 'left'
   * @example
   *  textAlign: 'left'
   */
  textAlign?: 'left' | 'center' | 'right';
  /**
   * @description text italic
   * @defaultValue false
   * @example
   *  italic: true
   */
  italic?: boolean;
  /**
   * @description text bold
   * @defaultValue false
   * @example
   *  bold: true
   */
  bold?: boolean;
  /**
   * @description rotate text
   * @defaultValue 0
   * @example
   *  rotate: 45
   */
  rotate?: number;
}

/**
 * @description ShadowLayer style for text watermark
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
   * @description shadow offset x
   * @example
   *  dx: 10
   */
  dx: number;
  /**
   * @description shadow offset y
   * @example
   *  dy: 10
   **/
  dy: number;
  /**
   * @description shadow radius
   * @example
   *  radius: 10
   **/
  radius: number;
  /**
   * @description shadow color
   * @example
   * color: '#aacc22'
   **/
  color: string;
}

/**
 * @description background style for text watermark
 * > thanks [@onka13](https://github.com/onka13) for [#38](https://github.com/JimmyDaddy/react-native-image-marker/pull/38)
 * @example
 * textBackgroundStyle: {
 *  paddingX: 10,
 *  paddingY: 10,
 *  type: TextBackgroundType.stretchX,
 *  color: '#aacc22'
 * }
 */
export interface TextBackgroundStyle {
  /**
   * @description padding x
   * @example
   * paddingX: 10
   **/
  paddingX: number;
  /**
   * @description padding y
   * @example
   * paddingY: 10
   **/
  paddingY: number;
  /**
   * @description background type
   * @defaultValue TextBackgroundType.stretchX
   * @example
   *  type: TextBackgroundType.stretchX
   **/
  type: TextBackgroundType | null;
  /**
   * @description background color
   * @example
   * color: '#aacc22'
   **/
  color: string;
}

/**
 * @description Text options for text watermark
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
   * @description text content
   * @example
   * text: 'hello world'
   **/
  text: string;
  /**
   * @description text position options
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
   * @description text style
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
 * @description Options for text watermark
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
 *  maxSize: 2048
 */
export interface TextMarkOptions {
  /**
   * FIXME: ImageSourcePropType type define bug
   * @description background image options
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
   * @description text options
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
   * @description image quality `0-1`
   * @defaultValue 1
   * @example
   * quality: 1
   */
  quality?: number;
  /**
   * @description save image name
   * @example
   * filename: 'test'
   **/
  filename?: string;
  /**
   * @description save image format
   * @defaultValue `jpg`
   * @example
   * saveFormat: ImageFormat.jpg
   */
  saveFormat?: ImageFormat;
  /**
   * @description max image size see #49 #42
   * android only
   * **need RN version >= 0.60.0**,  fresco `MaxBitmapSize` [`ImagePipelineConfig.Builder.experiment().setMaxBitmapSize()`](https://github.com/facebook/fresco/blob/08ca5f40cc0b60b4db16d15e45552cafeae39ccb/imagepipeline/src/main/java/com/facebook/imagepipeline/core/ImagePipelineExperiments.java#L282), see [#49](https://github.com/JimmyDaddy/react-native-image-marker/issues/49#issuecomment-535303838)
   * @defaultValue 2048
   * @example
   * maxSize: 2048
   */
  maxSize?: number;
}

/**
 * @description Image options for background image or watermark image
 * @example
 *  src: require('./images/logo.png'),
 *  scale: 0.5,
 *  rotate: 45,
 *  alpha: 0.5
 */
export interface ImageOptions {
  /**
   * @description image src, local image
   * @example
   * src: require('./images/logo.png')
   */
  src: any;
  /**
   * @description image scale `> 0`
   * @defaultValue 1
   * @example
   * scale: 1
   */
  scale?: number;
  /**
   * @description rotate image rotate `0-360`
   * @defaultValue 0
   * @example
   * rotate: 45
   */
  rotate?: number;
  /**
   * @description transparent of background image `0 - 1`
   * @defaultValue 1
   * @example
   * alpha: 0.5
   */
  alpha?: number;
}

/**
 * @description Text options for image watermark
 * @example
 *
 *  backgroundImage: {
 *    src: require('./images/bg.png'),
 *    scale: 0.5,
 *    rotate: 45,
 *    alpha: 0.5
 *  }
 *  watermarkImage: {
 *    src: require('./images/logo.png'),
 *    scale: 0.5,
 *    rotate: 45,
 *    alpha: 0.5
 *  },
 *  watermarkPositions: {
 *    X: 10,
 *    Y: 10,
 *    // or
 *    // position: Position.center
 *  },
 *  quality: 1,
 *  filename: 'test',
 *  saveFormat: ImageFormat.jpg,
 *  maxSize: 2048
 *
 */
export interface ImageMarkOptions {
  /**
   * FIXME: ImageSourcePropType type define bug
   * @description background image options
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
   * @description watermark image options
   * @example
   *  watermarkImage: {
   *    src: require('./images/logo.png'),
   *    scale: 0.5,
   *    rotate: 45,
   *    alpha: 0.5
   *  }
   */
  watermarkImage: ImageOptions;
  /**
   * @description watermark position options
   * @example
   * watermarkPositions: {
   *  X: 10,
   *  Y: 10,
   *  // or
   *  // position: Position.center
   * }
   */
  watermarkPositions?: PositionOptions; // watermark position options see @PositionOptions
  /**
   * @description image quality `0-1`
   * @defaultValue 1
   * @example
   * quality: 1
   */
  quality?: number;
  /**
   * @description save image name
   * @example
   * filename: 'test'
   **/
  filename?: string;
  /**
   * @description save image format
   * @defaultValue `jpg`
   * @example
   * saveFormat: ImageFormat.jpg
   */
  saveFormat?: ImageFormat;
  /**
   * @description max image size see #49 #42
   * android only
   * **need RN version >= 0.60.0**,  fresco `MaxBitmapSize` [`ImagePipelineConfig.Builder.experiment().setMaxBitmapSize()`](https://github.com/facebook/fresco/blob/08ca5f40cc0b60b4db16d15e45552cafeae39ccb/imagepipeline/src/main/java/com/facebook/imagepipeline/core/ImagePipelineExperiments.java#L282), see [#49](https://github.com/JimmyDaddy/react-native-image-marker/issues/49#issuecomment-535303838)
   * @defaultValue 2048
   * @example
   * maxSize: 2048
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
