package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class MarkTextOptions(options: ReadableMap) : Options(options) {
  lateinit var watermarkTexts: Array<TextOptions?>

  init {
    val waterMarkTextsMap = options.getArray("watermarkTexts")
    if (waterMarkTextsMap!!.size() > 0) {
      watermarkTexts = arrayOfNulls(waterMarkTextsMap.size())
     for (i in 0 until waterMarkTextsMap.size()) {
          val textMap = waterMarkTextsMap.getMap(i)
          textMap?.let {
              watermarkTexts[i] = TextOptions(it)
          } ?: run {
             throw MarkerError(ErrorCode.NULL_MAP, "watermarkTexts[$i] is null")
          }
      }
    }
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
