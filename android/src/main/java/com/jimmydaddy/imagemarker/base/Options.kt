package com.jimmydaddy.imagemarker.base

import android.graphics.Color
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import java.util.UUID

open class Options(val options: ReadableMap) {
  var backgroundImage: ImageOptions

  var quality: Int

  var filename: String?

  var saveFormat: SaveFormat

  var maxSize: Int

  var matteColor: Int

  var rotationCanvasMode: RotationCanvasMode

  var jobId: String

  init {
    val backgroundImageOptions = options.getMap("backgroundImage")
      ?: throw MarkerError(ErrorCode.PARAMS_REQUIRED, "backgroundImage is required")
    backgroundImage = ImageOptions(backgroundImageOptions)
    quality = readQuality(options)
    maxSize = readMaxSize(options)
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
    jobId = if (options.hasKey("jobId") && !options.isNull("jobId")) {
      options.getString("jobId")
        ?: throw MarkerError(ErrorCode.INVALID_PARAMS, "jobId must be a string")
    } else {
      UUID.randomUUID().toString()
    }
    if (jobId.isBlank()) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "jobId must not be empty")
    }
  }

  companion object {
    const val PROP_ICON_URI = "uri"

    internal fun readQuality(options: ReadableMap): Int {
      val quality = if (options.hasKey("quality") && !options.isNull("quality")) {
        options.getDouble("quality")
      } else {
        100.0
      }
      if (!quality.isFinite() || quality % 1.0 != 0.0 || quality !in 0.0..100.0) {
        throw MarkerError(
          ErrorCode.INVALID_PARAMS,
          "quality must be a finite integer between zero and 100"
        )
      }
      return quality.toInt()
    }

    internal fun readMaxSize(options: ReadableMap): Int {
      val maxSize = if (options.hasKey("maxSize") && !options.isNull("maxSize")) {
        options.getDouble("maxSize")
      } else {
        2048.0
      }
      if (
        !maxSize.isFinite() ||
        maxSize % 1.0 != 0.0 ||
        maxSize <= 0.0 ||
        maxSize > Int.MAX_VALUE.toDouble()
      ) {
        throw MarkerError(
          ErrorCode.INVALID_PARAMS,
          "maxSize must be a positive finite integer"
        )
      }
      return maxSize.toInt()
    }

    fun checkParams(opts: ReadableMap, promise: Promise): Options? {
      try {
        return Options(opts)
      } catch (e: Exception) {
        val markerError = MarkerError.fromInvalidParams(e, "Invalid marker options")
        promise.reject(markerError.getErrorCode(), markerError.getErrMsg())
      }
      return null
    }
  }
}
