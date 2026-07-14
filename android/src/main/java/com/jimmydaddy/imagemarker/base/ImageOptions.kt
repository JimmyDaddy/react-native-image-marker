package com.jimmydaddy.imagemarker.base

import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.base.Constants.DEFAULT_ALPHA
import com.jimmydaddy.imagemarker.base.Constants.DEFAULT_ROTATE
import com.jimmydaddy.imagemarker.base.Constants.DEFAULT_SCALE

class ImageOptions(val options: ReadableMap) {
  var src: RNImageSRC

  var uri: String?

  var scale: Float

  var rotate: Float
  private var alpha: Int

  init {
    if (!options.hasKey("src") || options.isNull("src")) {
      throw MarkerError(ErrorCode.PARAMS_REQUIRED, "image is required")
    }
    val originalSRC = options.getMap("src")
      ?: throw MarkerError(ErrorCode.PARAMS_REQUIRED, "image is required")
    src = RNImageSRC(originalSRC)
    uri = originalSRC.getString(PROP_ICON_URI)
    scale = if (options.hasKey("scale")) options.getDouble("scale").toFloat() else DEFAULT_SCALE
    if (!scale.isFinite() || scale <= 0f) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "image scale must be finite and greater than zero")
    }
    rotate = if (options.hasKey("rotate")) options.getDouble("rotate").toFloat() else DEFAULT_ROTATE
    if (!rotate.isFinite()) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "image rotation must be finite")
    }
    val normalizedAlpha = if (options.hasKey("alpha") && !options.isNull("alpha")) {
      options.getDouble("alpha")
    } else {
      1.0
    }
    if (!normalizedAlpha.isFinite() || normalizedAlpha !in 0.0..1.0) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "image alpha must be finite and between zero and one")
    }
    alpha = (normalizedAlpha * DEFAULT_ALPHA).toInt()
  }

  fun applyStyle(): Paint {
    val paint = Paint()
    paint.alpha = alpha
    //获取更清晰的图像采样
    paint.isDither = true
    paint.colorFilter = PorterDuffColorFilter(Color.TRANSPARENT, PorterDuff.Mode.OVERLAY)
    return paint
  }

  companion object {
    const val PROP_ICON_URI = "uri"
  }
}
