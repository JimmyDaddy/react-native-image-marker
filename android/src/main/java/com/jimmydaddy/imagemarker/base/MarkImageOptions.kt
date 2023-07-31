package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class MarkImageOptions(options: ReadableMap) : Options(options) {
  @JvmField
  var watermarkImage: ImageOptions

  @JvmField
  var x: Int

  @JvmField
  var y: Int

  @JvmField
  var positionEnum: PositionEnum?

  init {
    val markerImageOpts = options.getMap("watermarkImage")
      ?: throw MarkerError(
        ErrorCode.PARAMS_REQUIRED,
        "marker image is required"
      )
    val positionOptions =
      if (null != options.getMap("watermarkPositions")) options.getMap("watermarkPositions") else null
    x = if (positionOptions!!.hasKey("X")) positionOptions.getInt("X") else 0
    y = if (positionOptions.hasKey("Y")) positionOptions.getInt("Y") else 0
    positionEnum =
      if (null != positionOptions.getString("position")) PositionEnum.getPosition(
        positionOptions.getString("position")
      ) else null
    watermarkImage = ImageOptions(markerImageOpts)
  }

  companion object {
    @JvmStatic
    fun checkParams(opts: ReadableMap, promise: Promise): MarkImageOptions? {
      try {
        return MarkImageOptions(opts)
      } catch (e: MarkerError) {
        promise.reject(e.getErrorCode(), e.getErrMsg())
      }
      return null
    }
  }
}
