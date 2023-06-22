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

export type ShadowLayerStyle = {
  dx: number;
  dy: number;
  radius: number;
  color: string;
};

export type TextBackgroundStyle = {
  paddingX: number;
  paddingY: number;
  type: TextBackgroundType | null;
  color: string;
};

export type TextMarkOption = {
  // image src, local image
  // FIXME: ImageSourcePropType type define bug
  src: any;
  text: string;
  // if you set position you don't need to set X and Y
  X?: number;
  Y?: number;
  // eg. '#aacc22'
  color?: string;
  fontName?: string;
  fontSize?: number;
  // scale image
  scale?: number;
  // image quality
  quality?: number;
  position?: Position;
  filename?: string;
  shadowStyle?: ShadowLayerStyle | null;
  textBackgroundStyle?: TextBackgroundStyle | null;
  saveFormat?: ImageFormat;
  maxSize?: number; // android only see #49 #42
};

export type ImageMarkOption = {
  // image src, local image
  // FIXME: ImageSourcePropType type define bug
  src: any;
  markerSrc: any;
  X?: number;
  Y?: number;
  // marker scale
  markerScale?: number;
  // image scale
  scale?: number;
  quality?: number;
  position?: Position;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number; // android only see #49 #42
};

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
  static markText(options: TextMarkOption): Promise<string> {
    const { src, position } = options;

    if (!src) {
      throw new Error('please set image!');
    }

    let srcObj: any = resolveAssetSource(src);
    if (!srcObj) {
      srcObj = {
        uri: src,
        __packager_asset: false,
      };
    }

    options.src = srcObj;
    // let mShadowStyle = shadowStyle || {};
    // let mTextBackgroundStyle = textBackgroundStyle || {};
    options.maxSize = options.maxSize || 2048;
    if (!position) {
      return ImageMarker.addText(options);
    } else {
      return ImageMarker.addTextByPosition(options);
    }
  }

  static markImage(options: ImageMarkOption): Promise<string> {
    const { src, markerSrc, position } = options;

    if (!src) {
      throw new Error('please set image!');
    }
    if (!markerSrc) {
      throw new Error('please set mark image!');
    }

    let srcObj: any = resolveAssetSource(src);
    if (!srcObj) {
      srcObj = {
        uri: src,
        __packager_asset: false,
      };
    }

    let markerObj: any = resolveAssetSource(markerSrc);
    if (!markerObj) {
      markerObj = {
        uri: markerSrc,
        __packager_asset: false,
      };
    }

    options.markerSrc = markerObj;
    options.src = srcObj;
    options.maxSize = options.maxSize || 2048;

    if (!position) {
      return ImageMarker.markWithImage(options);
    } else {
      return ImageMarker.markWithImageByPosition(options);
    }
  }
}
