package com.jimmydaddy.imagemarker

import org.junit.Assert.assertEquals
import org.junit.Test

class ImageDecodePlannerTest {
  @Test
  fun accountsForResourceDensityBeforeChoosingSampleSize() {
    val source = ImageDecodePlanner.densityAdjustedSize(
      width = 144,
      height = 144,
      sourceDensity = 480,
      targetDensity = 440,
      scaled = true
    )
    val target = ImageSizeLimiter.fit(source.width, source.height, maxSize = 9)

    assertEquals(ImagePixelSize(132, 132), source)
    assertEquals(ImagePixelSize(9, 9), target)
    assertEquals(
      8,
      ImageDecodePlanner.calculateInSampleSize(
        source.width,
        source.height,
        target.width,
        target.height,
        swapDimensions = false
      )
    )
  }

  @Test
  fun keepsRawSizeWhenDensityScalingDoesNotApply() {
    assertEquals(
      ImagePixelSize(144, 96),
      ImageDecodePlanner.densityAdjustedSize(144, 96, 480, 440, scaled = false)
    )
    assertEquals(
      ImagePixelSize(144, 96),
      ImageDecodePlanner.densityAdjustedSize(144, 96, 0, 440, scaled = true)
    )
    assertEquals(
      ImagePixelSize(144, 96),
      ImageDecodePlanner.densityAdjustedSize(144, 96, 480, 480, scaled = true)
    )
  }
}
