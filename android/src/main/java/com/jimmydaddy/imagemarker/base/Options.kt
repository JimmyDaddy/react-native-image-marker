package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

open class Options(val options: ReadableMap) {
  var backgroundImage: ImageOptions

  var backgroundImageOpts = options.getMap("backgroundImage")

  var quality: Int

  var filename: String?

  var saveFormat: SaveFormat

  var maxSize: Int

  init {
    this.backgroundImageOpts ?: throw MarkerError(
      ErrorCode.PARAMS_REQUIRED,
      "backgroundImage is required"
    )
    backgroundImage = ImageOptions(this.backgroundImageOpts!!)
    quality = if (options.hasKey("quality")) options.getInt("quality") else 100
    maxSize = if (options.hasKey("maxSize")) options.getInt("maxSize") else 2048
    filename = options.getString("filename")
    saveFormat = SaveFormat.getFormat(options.getString("saveFormat"))
  }

  companion object {
    const val PROP_ICON_URI = "uri"
    fun checkParams(opts: ReadableMap, promise: Promise): Options? {
      try {
        return Options(opts)
      } catch (e: MarkerError) {
        promise.reject(e.getErrorCode(), e.getErrMsg())
      }
      return null
    }
  }
}
