package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

sealed class WatermarkLayerOptions {
  data class TextLayer(val textOptions: TextOptions) : WatermarkLayerOptions()
  data class ImageLayer(val imageOptions: WatermarkImageOptions) : WatermarkLayerOptions()

  companion object {
    fun fromReadableMap(options: ReadableMap?): WatermarkLayerOptions {
      if (options == null) {
        throw MarkerError(ErrorCode.NULL_MAP, "watermark layer is null")
      }
      val type = options.getString("type")
      return when (type) {
        "text" -> TextLayer(TextOptions(options))
        "image" -> ImageLayer(WatermarkImageOptions(options))
        else -> throw MarkerError(
          ErrorCode.INVALID_PARAMS,
          "watermark layer type is required"
        )
      }
    }
  }
}

class MarkWatermarkOptions(options: ReadableMap) : Options(options) {
  val watermarkLayers: Array<WatermarkLayerOptions>
  val imageLayers: List<WatermarkLayerOptions.ImageLayer>

  init {
    val watermarkOpts = options.getArray("watermarks")
    if (watermarkOpts == null || watermarkOpts.size() <= 0) {
      throw MarkerError(
        ErrorCode.PARAMS_REQUIRED,
        "watermarks is required"
      )
    }

    val layers = arrayListOf<WatermarkLayerOptions>()
    for (i in 0 until watermarkOpts.size()) {
      layers.add(WatermarkLayerOptions.fromReadableMap(watermarkOpts.getMap(i)))
    }
    watermarkLayers = layers.toTypedArray()
    imageLayers = layers.filterIsInstance<WatermarkLayerOptions.ImageLayer>()
  }

  companion object {
    @JvmStatic
    fun checkParams(opts: ReadableMap, promise: Promise): MarkWatermarkOptions? {
      try {
        return MarkWatermarkOptions(opts)
      } catch (e: Exception) {
        val markerError = MarkerError.fromInvalidParams(e, "Invalid watermark options")
        promise.reject(markerError.getErrorCode(), markerError.getErrMsg())
      }
      return null
    }
  }
}
