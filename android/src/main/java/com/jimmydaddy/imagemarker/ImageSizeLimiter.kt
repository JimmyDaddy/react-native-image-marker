package com.jimmydaddy.imagemarker

import kotlin.math.roundToInt

internal data class ImagePixelSize(val width: Int, val height: Int)

/** Fits an image inside a square pixel bound without cropping or changing its aspect ratio. */
internal object ImageSizeLimiter {
  fun fit(width: Int, height: Int, maxSize: Int): ImagePixelSize {
    require(width > 0 && height > 0) { "image dimensions must be greater than zero" }
    require(maxSize > 0) { "maxSize must be greater than zero" }
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
}
