import { NativeModules, Platform, Image } from 'react-native';

const { resolveAssetSource } = Image;
const LINKING_ERROR =
  `The package 'react-native-image-marker' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

export enum Position {
  topLeft = 'topLeft',
  topCenter = 'topCenter',
  topRight = 'topRight',
  bottomLeft = 'bottomLeft',
  bottomCenter = 'bottomCenter',
  bottomRight = 'bottomRight',
  center = 'center',
}

export enum TextBackgroundType {
  stretchX = 'stretchX',
  stretchY = 'stretchY',
  none = '',
}

export enum ImageFormat {
  png = 'png',
  jpg = 'jpg',
  base64 = 'base64',
}

export interface PositionOptions {
  // if you set position you don't need to set X and Y
  X?: number;
  Y?: number;
  position?: Position;
}

export interface TextStyle {
  // eg. '#aacc22'
  color?: string;
  fontName?: string;
  /**
   * font size
   * Android use sp
   * iOS ios pt
   */
  fontSize?: number;
  shadowStyle?: ShadowLayerStyle | null;
  textBackgroundStyle?: TextBackgroundStyle | null;
  /**
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
   * iOS: NSStrikethroughStyleAttributeName
   * android: Paint.setStrikeThruText
   */
  strikeThrough?: boolean;
  /**
   * iOS: NSTextAlignment: NSTextAlignmentLeft, NSTextAlignmentCenter, NSTextAlignmentRight
   * android: Paint.setTextAlign
   */
  textAlign?: 'left' | 'center' | 'right';
  italic?: boolean;
  bold?: boolean;
  rotate?: number;
}

export interface ShadowLayerStyle {
  dx: number;
  dy: number;
  radius: number;
  color: string;
}

export interface TextBackgroundStyle {
  paddingX: number;
  paddingY: number;
  type: TextBackgroundType | null;
  color: string;
}

export interface TextOptions {
  text: string;
  positionOptions?: PositionOptions;
  style?: TextStyle;
}

export interface TextMarkOptions {
  // image src, local image
  // FIXME: ImageSourcePropType type define bug
  backgroundImage: ImageOptions;
  watermarkTexts: TextOptions[];
  // scale image
  scale?: number;
  // image quality
  quality?: number;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number; // android only see #49 #42
}

export interface ImageOptions {
  src: any;
  // 0 - 1
  scale?: number;
  // 0 - 360
  rotate?: number;
  // 0 - 1
  alpha?: number;
}

export interface ImageMarkOptions {
  // image src, local image
  // FIXME: ImageSourcePropType type define bug
  backgroundImage: ImageOptions;
  watermarkImage: ImageOptions;
  watermarkPositions?: PositionOptions;
  // 0 - 1
  quality?: number;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number; // android only see #49 #42
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

export default class Marker {
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
