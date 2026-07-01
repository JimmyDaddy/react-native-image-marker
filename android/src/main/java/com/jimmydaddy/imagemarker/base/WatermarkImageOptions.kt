package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap

data class WatermarkImageOptions(val options: ReadableMap?) {
  lateinit var imageOption: ImageOptions
  var x: String? = null
  var y: String? = null
  var positionEnum: PositionEnum? = null

  init {
    if (options != null) {
      imageOption = ImageOptions(options)
      val positionOptions = options.getMap("position")
      x =
        if (positionOptions != null && positionOptions.hasKey("X")) Utils.handleDynamicToString(positionOptions.getDynamic("X")) else null
      y =
        if (positionOptions != null && positionOptions.hasKey("Y")) Utils.handleDynamicToString(positionOptions.getDynamic("Y")) else null
      positionEnum =
        if (positionOptions != null && null != positionOptions.getString("position")) PositionEnum.getPosition(
          positionOptions.getString("position")
        ) else null
    }
  }

  constructor(watermarkImage: ImageOptions, x: String?, y: String?, position: PositionEnum?) : this(null) {
    imageOption = watermarkImage
    this.x = x
    this.y = y
    this.positionEnum = position
  }

  companion object {
    @JvmStatic
    fun checkWatermarkImageParams(opts: ReadableMap, reject: (String, String, Throwable?) -> Unit): WatermarkImageOptions? {
      return try {
        WatermarkImageOptions(opts)
      } catch (error: Throwable) {
        error.localizedMessage?.let { reject(error.message ?: "", it, null) }
        null
      }
    }
  }
}
