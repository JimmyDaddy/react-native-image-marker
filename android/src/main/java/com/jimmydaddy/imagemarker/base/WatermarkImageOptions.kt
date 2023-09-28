package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap

data class WatermarkImageOptions(val options: ReadableMap?) {
  var imageOption: ImageOptions
  var x: String?
  var y: String?
  var positionEnum: PositionEnum?

  init {
    imageOption = options?.let { ImageOptions(it) }!!
    val positionOptions =
      if (null != options.getMap("position")) options.getMap("position") else null
    x = if (positionOptions!!.hasKey("X")) positionOptions.getDynamic("X").toString() else null
    y = if (positionOptions.hasKey("Y")) positionOptions.getDynamic("Y").toString() else null
    positionEnum =
      if (null != positionOptions.getString("position")) PositionEnum.getPosition(
        positionOptions.getString("position")
      ) else null
  }

  constructor(watermarkImage: ImageOptions, X: String?, Y: String?, position: PositionEnum?) : this(null) {
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
