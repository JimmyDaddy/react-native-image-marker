package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class MarkTextOptions(options: ReadableMap) : Options(options) {
  var watermarkTexts: Array<TextOptions>

  init {
    val waterMarkTextsMap = options.getArray("watermarkTexts")
    if (waterMarkTextsMap == null || waterMarkTextsMap.size() <= 0) {
      throw MarkerError(ErrorCode.PARAMS_REQUIRED, "watermarkTexts is required")
    }

    val textOptions = arrayListOf<TextOptions>()
    for (i in 0 until waterMarkTextsMap.size()) {
      if (waterMarkTextsMap.isNull(i)) {
        throw MarkerError(ErrorCode.NULL_MAP, "watermarkTexts[$i] is null")
      }
      textOptions.add(TextOptions(waterMarkTextsMap.getMap(i)))
    }
    watermarkTexts = textOptions.toTypedArray()
  }

  companion object {
    @JvmStatic
    fun checkParams(opts: ReadableMap, promise: Promise): MarkTextOptions? {
      try {
        return MarkTextOptions(opts)
      } catch (e: MarkerError) {
        promise.reject(e.getErrorCode(), e.getErrMsg())
      }
      return null
    }
  }
}
