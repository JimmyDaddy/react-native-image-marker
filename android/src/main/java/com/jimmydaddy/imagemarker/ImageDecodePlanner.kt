package com.jimmydaddy.imagemarker

internal object ImageDecodePlanner {
  fun densityAdjustedSize(
    width: Int,
    height: Int,
    sourceDensity: Int,
    targetDensity: Int,
    scaled: Boolean
  ): ImagePixelSize {
    require(width > 0 && height > 0) { "image dimensions must be greater than zero" }
    if (!scaled || sourceDensity <= 0 || targetDensity <= 0 || sourceDensity == targetDensity) {
      return ImagePixelSize(width, height)
    }
    return ImagePixelSize(
      scaleFromDensity(width, sourceDensity, targetDensity),
      scaleFromDensity(height, sourceDensity, targetDensity)
    )
  }

  fun calculateInSampleSize(
    sourceWidth: Int,
    sourceHeight: Int,
    requestedWidth: Int,
    requestedHeight: Int,
    swapDimensions: Boolean
  ): Int {
    if (sourceWidth <= 0 || sourceHeight <= 0) return 1
    require(requestedWidth > 0 && requestedHeight > 0) {
      "requested dimensions must be greater than zero"
    }
    val orientedWidth = if (swapDimensions) sourceHeight else sourceWidth
    val orientedHeight = if (swapDimensions) sourceWidth else sourceHeight
    var sampleSize = 1
    while (sampleSize <= Int.MAX_VALUE / 2) {
      val nextSampleSize = sampleSize * 2
      if (
        orientedWidth / nextSampleSize < requestedWidth ||
        orientedHeight / nextSampleSize < requestedHeight
      ) {
        break
      }
      sampleSize = nextSampleSize
    }
    return sampleSize
  }

  private fun scaleFromDensity(size: Int, sourceDensity: Int, targetDensity: Int): Int {
    val scaledSize =
      (size.toLong() * targetDensity.toLong() + sourceDensity.toLong() / 2L) /
        sourceDensity.toLong()
    return scaledSize.coerceIn(1L, Int.MAX_VALUE.toLong()).toInt()
  }
}
