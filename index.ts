/*
 * @Author: JimmyDaddy
 * @Date: 2017-09-14 10:40:09
 * @Last Modified by: JimmyDaddy
 * @Last Modified time: 2021-04-24 18:07:18
 * @Description
 */
import { NativeModules, Image } from 'react-native'

const { ImageMarker } = NativeModules
const { resolveAssetSource } = Image

export enum Position {
  topLeft = 'topLeft',
  topCenter = 'topCenter',
  topRight = 'topRight',
  bottomLeft = 'bottomLeft',
  bottomCenter = 'bottomCenter',
  bottomRight = 'bottomRight',
  center = 'center'
}

export enum TextBackgroundType {
  stretchX = 'stretchX',
  stretchY = 'stretchY'
}

export enum ImageFormat {
  png = 'png',
  jpg = 'jpg',
  base64 = 'base64',
}


export type ShadowLayerStyle = {
  'dx': number,
  'dy': number,
  'radius': number,
  'color': string
}

export type TextBackgroundStyle = {
  'paddingX': number,
  'paddingY': number,
  'type': TextBackgroundType,
  'color': string
}

export type TextMarkOption = {
  // image src, local image
  // FIXME: ImageSourcePropType type define bug
  src: any,
  text: string,
  // if you set position you don't need to set X and Y
  X?: number,
  Y?: number,
  // eg. '#aacc22'
  color: string,
  fontName: string,
  fontSize: number,
  // scale image
  scale: number,
  // image quality
  quality: number,
  position?: Position,
  filename?: string,
  shadowStyle?: ShadowLayerStyle,
  textBackgroundStyle?: TextBackgroundStyle,
  saveFormat?: ImageFormat,
  maxSize?: number, // android only see #49 #42
}

export type ImageMarkOption = {
  // image src, local image
  // FIXME: ImageSourcePropType type define bug
  src: any,
  markerSrc: any,
  X?: number,
  Y?: number,
  // marker scale
  markerScale: number,
  // image scale
  scale: number,
  quality: number,
  position?: Position,
  filename?: string,
  saveFormat?: ImageFormat,
  maxSize?: number, // android only see #49 #42
}

export default class Marker {
  static markText (option: TextMarkOption): Promise<string> {
    const {
      src,
      text,
      X,
      Y,
      color,
      fontName,
      fontSize,
      shadowStyle,
      textBackgroundStyle,
      scale,
      quality,
      position,
      filename,
      saveFormat,
      maxSize = 2048,
    } = option

    if (!src) {
      throw new Error('please set image!')
    }

    let srcObj: any = resolveAssetSource(src)
    if (!srcObj) {
      srcObj = {
        uri: src,
        __packager_asset: false
      }
    }

    let mShadowStyle = shadowStyle || {}
    let mTextBackgroundStyle = textBackgroundStyle || {}

    if (!position) {
      return ImageMarker.addText(
        srcObj,
        text,
        X,
        Y,
        color,
        fontName,
        fontSize,
        mShadowStyle,
        mTextBackgroundStyle,
        scale,
        quality,
        filename,
        saveFormat,
        maxSize,
      )
    } else {
      return ImageMarker.addTextByPostion(
        srcObj,
        text,
        position,
        color,
        fontName,
        fontSize,
        mShadowStyle,
        mTextBackgroundStyle,
        scale,
        quality,
        filename,
        saveFormat,
        maxSize
      )
    }
  }

  static markImage (option: ImageMarkOption): Promise<string> {
    const {
      src,
      markerSrc,
      X,
      Y,
      markerScale,
      scale,
      quality,
      position,
      filename,
      saveFormat,
      maxSize = 2048,
    } = option

    if (!src) {
      throw new Error('please set image!')
    }
    if (!markerSrc) {
      throw new Error('please set mark image!')
    }

    let srcObj: any = resolveAssetSource(src)
    if (!srcObj) {
      srcObj = {
        uri: src,
        __packager_asset: false
      }
    }

    let markerObj: any = resolveAssetSource(markerSrc)
    if (!markerObj) {
      markerObj = {
        uri: markerSrc,
        __packager_asset: false
      }
    }

    if (!position) {
      return ImageMarker.markWithImage(
        srcObj,
        markerObj,
        X,
        Y,
        scale,
        markerScale,
        quality,
        filename,
        saveFormat,
        maxSize
      )
    } else {
      return ImageMarker.markWithImageByPosition(
        srcObj,
        markerObj,
        position,
        scale,
        markerScale,
        quality,
        filename,
        saveFormat,
        maxSize
      )
    }
  }
}
