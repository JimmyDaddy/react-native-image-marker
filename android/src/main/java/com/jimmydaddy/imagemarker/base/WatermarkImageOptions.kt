package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap

data class WatermarkImageOptions(val options: ReadableMap?) {
  lateinit var imageOption: ImageOptions
  var x: String? = null
  var y: String? = null
  var edgeInset: String? = null
  var positionEnum: PositionEnum? = null
  var trimTransparentPadding: Boolean = false

  init {
    if (options != null) {
      imageOption = ImageOptions(options)
      val positionOptions = options.getMap("position")
      x =
        if (positionOptions != null && positionOptions.hasKey("X")) Utils.handleDynamicToString(positionOptions.getDynamic("X")) else null
      y =
        if (positionOptions != null && positionOptions.hasKey("Y")) Utils.handleDynamicToString(positionOptions.getDynamic("Y")) else null
      edgeInset =
        if (positionOptions != null && positionOptions.hasKey("edgeInset")) Utils.handleDynamicToString(positionOptions.getDynamic("edgeInset")) else null
      positionEnum = positionOptions
        ?.getString("position")
        ?.let(PositionEnum::getPosition)
      trimTransparentPadding =
        options.hasKey("trimTransparentPadding") && options.getBoolean("trimTransparentPadding")
    }
  }

  constructor(
    watermarkImage: ImageOptions,
    x: String?,
    y: String?,
    edgeInset: String?,
    position: PositionEnum?,
    trimTransparentPadding: Boolean = false
  ) : this(null) {
    imageOption = watermarkImage
    this.x = x
    this.y = y
    this.edgeInset = edgeInset
    this.positionEnum = position
    this.trimTransparentPadding = trimTransparentPadding
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
