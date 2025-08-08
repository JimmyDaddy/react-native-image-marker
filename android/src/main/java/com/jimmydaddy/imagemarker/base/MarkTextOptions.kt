package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class MarkTextOptions(options: ReadableMap) : Options(options) {
  lateinit var watermarkTexts: Array<TextOptions?>

  init {
    val waterMarkTextsMap = options.getArray("watermarkTexts")
    if (waterMarkTextsMap != null && waterMarkTextsMap.size() > 0) {
      watermarkTexts = arrayOfNulls(waterMarkTextsMap.size())
      for (i in 0 until waterMarkTextsMap.size()) {
        val textMap = waterMarkTextsMap.getMap(i)
        if (textMap != null) {
          watermarkTexts[i] = TextOptions(textMap)
        }
      }
    }
  }

  companion object {
    @JvmStatic
    fun checkParams(opts: ReadableMap, promise: Promise): MarkTextOptions? {
      return try {
        MarkTextOptions(opts)
      } catch (e: MarkerError) {
        promise.reject(e.getErrorCode(), e.getErrMsg())
        null
      }
    }
  }
}
