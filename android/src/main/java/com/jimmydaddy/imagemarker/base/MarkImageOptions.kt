package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
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
    val myMarkerList = readWatermarkImages(markerImagesOpts)
    if (markerImageOpts != null) {
      val marker = ImageOptions(markerImageOpts)
      val positionOptions = options.getMap("watermarkPositions")
      val x = if (positionOptions?.hasKey("X") == true) {
        Utils.handleDynamicToString(positionOptions.getDynamic("X"))
      } else {
        null
      }
      val y = if (positionOptions?.hasKey("Y") == true) {
        Utils.handleDynamicToString(positionOptions.getDynamic("Y"))
      } else {
        null
      }
      val edgeInset = if (positionOptions?.hasKey("edgeInset") == true) {
        Utils.handleDynamicToString(positionOptions.getDynamic("edgeInset"))
      } else {
        null
      }
      val positionEnum = positionOptions
        ?.getString("position")
        ?.let(PositionEnum::getPosition)
      val trimTransparentPadding =
        markerImageOpts.hasKey("trimTransparentPadding") && markerImageOpts.getBoolean("trimTransparentPadding")
      val layout = if (markerImageOpts.hasKey("layout") && !markerImageOpts.isNull("layout")) {
        markerImageOpts.getMap("layout")?.let(::WatermarkLayout)
      } else {
        null
      }
      if (layout?.isTile == true && positionOptions != null) {
        throw MarkerError(ErrorCode.INVALID_PARAMS, "layout cannot be combined with position")
      }
      val markerOpts = WatermarkImageOptions(
        marker,
        x,
        y,
        edgeInset,
        positionEnum,
        trimTransparentPadding,
        layout
      )
      myMarkerList.add(markerOpts)
    }
    watermarkImages = myMarkerList.toTypedArray()
  }

  companion object {
    internal fun readWatermarkImages(watermarkImages: ReadableArray?): ArrayList<WatermarkImageOptions> {
      if (watermarkImages == null || watermarkImages.size() <= 0) {
        return arrayListOf()
      }

      return ArrayList<WatermarkImageOptions>(watermarkImages.size()).apply {
        for (index in 0 until watermarkImages.size()) {
          val markerMap: ReadableMap? = watermarkImages.getMap(index)
          add(
            WatermarkImageOptions(
              markerMap ?: throw MarkerError(ErrorCode.NULL_MAP, "watermarkImages[$index] is null")
            )
          )
        }
      }
    }

    @JvmStatic
    fun checkParams(opts: ReadableMap, promise: Promise): MarkImageOptions? {
      try {
        return MarkImageOptions(opts)
      } catch (e: Exception) {
        val markerError = MarkerError.fromInvalidParams(e, "Invalid image marker options")
        promise.reject(markerError.getErrorCode(), markerError.getErrMsg())
      }
      return null
    }
  }
}
