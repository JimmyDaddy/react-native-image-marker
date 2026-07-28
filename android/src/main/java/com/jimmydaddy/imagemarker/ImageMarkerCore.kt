package com.jimmydaddy.imagemarker

import kotlin.math.roundToInt

/**
 * Small portable image-planning boundary shared with iOS.
 *
 * Local JVM unit tests use the identical Kotlin fallback because Android
 * shared libraries are only available in device/instrumentation processes.
 */
object ImageMarkerCore {
  val isNativeAvailable: Boolean = runCatching {
    System.loadLibrary("image-marker-core")
  }.isSuccess

  internal fun fitWithinMax(width: Int, height: Int, maxSize: Int): ImagePixelSize {
    require(width > 0 && height > 0) { "image dimensions must be greater than zero" }
    require(maxSize > 0) { "maxSize must be greater than zero" }

    if (isNativeAvailable) {
      val packed = fitWithinMaxNative(width, height, maxSize)
      return ImagePixelSize(
        width = (packed ushr 32).toInt(),
        height = packed.toInt()
      )
    }

    val largestDimension = maxOf(width, height)
    if (largestDimension <= maxSize) {
      return ImagePixelSize(width, height)
    }
    val ratio = maxSize.toDouble() / largestDimension.toDouble()
    return ImagePixelSize(
      (width * ratio).roundToInt().coerceIn(1, maxSize),
      (height * ratio).roundToInt().coerceIn(1, maxSize)
    )
  }

  @JvmStatic
  private external fun fitWithinMaxNative(
    width: Int,
    height: Int,
    maxSize: Int
  ): Long
}
