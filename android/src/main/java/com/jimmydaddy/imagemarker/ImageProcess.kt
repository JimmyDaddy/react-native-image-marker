package com.jimmydaddy.imagemarker

import android.graphics.Bitmap
import android.graphics.Matrix
import android.util.Log
import com.jimmydaddy.imagemarker.base.Constants.IMAGE_MARKER_TAG
import com.jimmydaddy.imagemarker.base.ErrorCode
import com.jimmydaddy.imagemarker.base.MarkerError
import com.jimmydaddy.imagemarker.base.Utils
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

class ImageProcess {
  data class RotatedBounds(
    val left: Float,
    val top: Float,
    val width: Int,
    val height: Int
  )

  companion object {
    fun rotatedBounds(width: Float, height: Float, rotation: Number): RotatedBounds {
      val normalized = ((rotation.toFloat() % 360f) + 360f) % 360f
      if (isNear(normalized, 0f) || isNear(normalized, 360f)) {
        return RotatedBounds(0f, 0f, ceil(width).toInt(), ceil(height).toInt())
      }
      if (isNear(normalized, 90f)) {
        return RotatedBounds(-height, 0f, ceil(height).toInt(), ceil(width).toInt())
      }
      if (isNear(normalized, 180f)) {
        return RotatedBounds(-width, -height, ceil(width).toInt(), ceil(height).toInt())
      }
      if (isNear(normalized, 270f)) {
        return RotatedBounds(0f, -width, ceil(height).toInt(), ceil(width).toInt())
      }

      val radians = Math.toRadians(normalized.toDouble())
      val cosine = cos(radians).toFloat()
      val sine = sin(radians).toFloat()
      val x1 = width * cosine
      val y1 = width * sine
      val x2 = -height * sine
      val y2 = height * cosine
      val x3 = x1 + x2
      val y3 = y1 + y2
      val left = min(0f, min(x1, min(x2, x3)))
      val top = min(0f, min(y1, min(y2, y3)))
      val right = max(0f, max(x1, max(x2, x3)))
      val bottom = max(0f, max(y1, max(y2, y3)))
      return RotatedBounds(
        left,
        top,
        ceil(right - left).toInt().coerceAtLeast(1),
        ceil(bottom - top).toInt().coerceAtLeast(1)
      )
    }

    fun scaleBitmap(bitmap: Bitmap, scale: Float, filter: Boolean = true): Bitmap {
      if (scale == 1f) return bitmap
      if (!scale.isFinite() || scale <= 0f) {
        throw MarkerError(ErrorCode.INVALID_PARAMS, "Image scale must be finite and greater than zero")
      }
      val matrix = Matrix().apply { postScale(scale, scale) }
      val scaledBitmap = Utils.allocateOrThrow("scaled image bitmap") {
        Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, filter)
      }
      Log.d(
        IMAGE_MARKER_TAG,
        "original width: ${bitmap.width} original height: ${bitmap.height} " +
          "scaled width: ${scaledBitmap.width} scaled height: ${scaledBitmap.height}"
      )
      return scaledBitmap
    }

    private fun isNear(value: Float, expected: Float): Boolean {
      return abs(value - expected) < 0.0001f
    }
  }
}
