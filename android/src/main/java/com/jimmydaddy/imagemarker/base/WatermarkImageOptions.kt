package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap

class WatermarkImageOptions {
  var imageOption: ImageOptions
  var x: Int = 20
  var y: Int = 20
  var positionEnum: PositionEnum?

  constructor(options: ReadableMap) {
    imageOption = ImageOptions(options);
    val positionOptions =
      if (null != options.getMap("position")) options.getMap("position") else null
    x = if (positionOptions!!.hasKey("X")) positionOptions.getInt("X") else 0
    y = if (positionOptions.hasKey("Y")) positionOptions.getInt("Y") else 0
    positionEnum =
      if (null != positionOptions.getString("position")) PositionEnum.getPosition(
        positionOptions.getString("position")
      ) else null
  }

  constructor(watermarkImage: ImageOptions, X: Int, Y: Int, position: PositionEnum?) {
    imageOption = watermarkImage
    this.x = X
    this.y = Y
    this.positionEnum = position
  }

  companion object {
    @JvmStatic
    fun checkWatermarkImageParams(opts: ReadableMap, reject: (String, String, Throwable?) -> Unit): WatermarkImageOptions? {
      return try {
        WatermarkImageOptions(opts)
      } catch (error: Throwable) {
        reject(error.message ?: "", error.localizedMessage, null)
        null
      }
    }
  }
}
