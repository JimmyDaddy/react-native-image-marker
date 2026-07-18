package com.jimmydaddy.imagemarker.base

import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import com.facebook.react.bridge.ReadableMap

@Suppress("DEPRECATION")
enum class WatermarkBlendMode(val porterDuffMode: PorterDuff.Mode) {
  NORMAL(PorterDuff.Mode.SRC_OVER),
  MULTIPLY(PorterDuff.Mode.MULTIPLY),
  SCREEN(PorterDuff.Mode.SCREEN),
  OVERLAY(PorterDuff.Mode.OVERLAY),
  DARKEN(PorterDuff.Mode.DARKEN),
  LIGHTEN(PorterDuff.Mode.LIGHTEN);

  fun applyTo(paint: Paint) {
    paint.xfermode = PorterDuffXfermode(porterDuffMode)
  }

  companion object {
    fun fromOptions(options: ReadableMap, fieldName: String): WatermarkBlendMode {
      if (!options.hasKey("blendMode") || options.isNull("blendMode")) {
        return NORMAL
      }
      val rawValue = try {
        options.getString("blendMode")
      } catch (error: Throwable) {
        null
      }
      return values().firstOrNull { it.name.equals(rawValue, ignoreCase = true) }
        ?: throw MarkerError(
          ErrorCode.INVALID_PARAMS,
          "$fieldName is not supported: ${rawValue ?: "invalid value"}"
        )
    }
  }
}
