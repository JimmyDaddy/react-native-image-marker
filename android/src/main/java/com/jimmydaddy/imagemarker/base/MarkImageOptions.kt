package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class MarkImageOptions(options: ReadableMap) : Options(options) {
  var watermarkImages: Array<WatermarkImageOptions>
  init {
    val markerImageOpts = options.getMap("watermarkImage")
    val markerImagesOpts = options.getArray("watermarkImages")
    if ((markerImagesOpts == null || markerImagesOpts.size() <= 0) && markerImageOpts == null) {
      throw MarkerError(
        ErrorCode.PARAMS_REQUIRED,
        "marker image is required"
      )
    }
    val myMarkerList = arrayListOf<WatermarkImageOptions>()
    if (markerImagesOpts != null && markerImagesOpts.size() > 0) {
      for (i in 0 until markerImagesOpts.size()) {
        val marker = WatermarkImageOptions(markerImagesOpts.getMap(i))
        myMarkerList.add(marker)
      }
    }
    if (markerImageOpts != null) {
      val marker = ImageOptions(markerImageOpts)
      val positionOptions =
        if (null != options.getMap("watermarkPositions")) options.getMap("watermarkPositions") else null
      val x = if (positionOptions!!.hasKey("X")) Utils.handleDynamicToString(positionOptions.getDynamic("X")) else null
      val y = if (positionOptions.hasKey("Y")) Utils.handleDynamicToString(positionOptions.getDynamic("Y")) else null
      val positionEnum =
        if (null != positionOptions.getString("position")) PositionEnum.getPosition(
          positionOptions.getString("position")
        ) else null
      val markerOpts = WatermarkImageOptions(marker, x, y, positionEnum)
      myMarkerList.add(markerOpts)
    }
    watermarkImages = myMarkerList.toTypedArray()
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
