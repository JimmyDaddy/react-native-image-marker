package com.jimmydaddy.imagemarker.base

import android.graphics.Color
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

open class Options(val options: ReadableMap) {
  var backgroundImage: ImageOptions

  private var backgroundImageOpts = options.getMap("backgroundImage")

  var quality: Int

  var filename: String?

  var saveFormat: SaveFormat

  var maxSize: Int

  var matteColor: Int

  var rotationCanvasMode: RotationCanvasMode

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
    val matteColorValue = if (options.hasKey("matteColor")) {
      options.getString("matteColor")
    } else {
      "#FFFFFF"
    }
    matteColor = try {
      val parsed = Color.parseColor(Utils.transRGBColor(matteColorValue))
      Color.rgb(Color.red(parsed), Color.green(parsed), Color.blue(parsed))
    } catch (error: IllegalArgumentException) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "Invalid matteColor: $matteColorValue")
    }
    rotationCanvasMode = RotationCanvasMode.fromValue(
      if (options.hasKey("rotationCanvasMode")) options.getString("rotationCanvasMode") else null
    )
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
