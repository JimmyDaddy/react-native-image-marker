/*
 * @Author: JimmyDaddy
 * @Date: 2017-09-14 10:40:09
 * @Last Modified by: JimmyDaddy
 * @Last Modified time: 2019-02-11 19:12:46
 * @Description
 * @flow
 */
import { NativeModules, Image } from 'react-native'

const { ImageMarker } = NativeModules
const { resolveAssetSource } = Image

export type Position = $Enum<{
  'topLeft': string, 
  'topCenter': string,
  'topRight': string, 
  'bottomLeft': string, 
  'bottomCenter': string , 
  'bottomRight': string, 
  'center': string
}>;


type TextMarkOption = {
  // image src, local image
  src: string,
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
  filename?: string
}

type ImageMarkOption = {
  // image src, local image
  src: string,
  markerSrc: string,
  X?: number,
  Y?: number,
  // marker scale
  markerScale: number,
  // image scale
  scale: number,
  quality: number,
  position?: Position,
  filename?: string
}

export default class Marker {
  static markText(option: TextMarkOption) {
    const { 
      src,
      text,
      X,
      Y,
      color,
      fontName,
      fontSize,
      scale,
      quality,
      position,
      filename
     } = option

    if (!src) {
      throw new Error('please set image!')
    }

    let srcObj = resolveAssetSource(src)
    if (!srcObj) {
      srcObj = {
        uri: src,
        __packager_asset: false
      }
    }

    if (!position) {
      return ImageMarker.addText(
        srcObj,
        text,
        X,
        Y,
        color,
        fontName,
        fontSize,
        scale,
        quality,
        filename
      )
    } else {
      return ImageMarker.addTextByPostion(
        srcObj,
        text,
        position,
        color,
        fontName,
        fontSize,
        scale,
        quality,
        filename
      )
    }
  }

  static markImage(option: ImageMarkOption) {
    const { 
      src,
      markerSrc,
      X,
      Y,
      markerScale,
      scale,
      quality,
      position,
      filename
    } = option

    if (!src) {
      throw new Error('please set image!')
    }
    if (!markerSrc) {
      throw new Error('please set mark image!')
    }

    let srcObj = resolveAssetSource(src)
    if (!srcObj) {
      srcObj = {
        uri: src,
        __packager_asset: false
      }
    }

    let markerObj = resolveAssetSource(markerSrc)
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
        filename
      )
    } else {
      return ImageMarker.markWithImageByPosition(
        srcObj,
        markerObj,
        position,
        scale,
        markerScale,
        quality,
        filename
      )
    }
  }
}

