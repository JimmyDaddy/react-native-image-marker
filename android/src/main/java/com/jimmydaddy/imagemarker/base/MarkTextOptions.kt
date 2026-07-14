package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

class MarkTextOptions(options: ReadableMap) : Options(options) {
  var watermarkTexts: Array<TextOptions>

  init {
    watermarkTexts = readWatermarkTexts(options.getArray("watermarkTexts"))
  }

  companion object {
    internal fun readWatermarkTexts(watermarkTexts: ReadableArray?): Array<TextOptions> {
      if (watermarkTexts == null || watermarkTexts.size() <= 0) {
        throw MarkerError(ErrorCode.PARAMS_REQUIRED, "watermarkTexts is required")
      }

      return Array(watermarkTexts.size()) { index ->
        val textMap = watermarkTexts.getMap(index)
          ?: throw MarkerError(ErrorCode.NULL_MAP, "watermarkTexts[$index] is null")
        TextOptions(textMap)
      }
    }

    @JvmStatic
    fun checkParams(opts: ReadableMap, promise: Promise): MarkTextOptions? {
      try {
        return MarkTextOptions(opts)
      } catch (e: Exception) {
        val markerError = MarkerError.fromInvalidParams(e, "Invalid text marker options")
        promise.reject(markerError.getErrorCode(), markerError.getErrMsg())
      }
      return null
    }
  }
}
