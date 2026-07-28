package com.jimmydaddy.imagemarker

internal data class ImagePixelSize(val width: Int, val height: Int)

/** Fits an image inside a square pixel bound without cropping or changing its aspect ratio. */
internal object ImageSizeLimiter {
  fun fit(width: Int, height: Int, maxSize: Int): ImagePixelSize {
    return ImageMarkerCore.fitWithinMax(width, height, maxSize)
  }
}
