package com.jimmydaddy.imagemarker

import org.junit.Assert.assertEquals
import org.junit.Test

class ImageSizeLimiterTest {
  @Test
  fun keepsImagesAlreadyInsideTheBoundUnchanged() {
    assertEquals(ImagePixelSize(20, 12), ImageSizeLimiter.fit(20, 12, 20))
    assertEquals(ImagePixelSize(12, 20), ImageSizeLimiter.fit(12, 20, 20))
  }

  @Test
  fun fitsLandscapeAndPortraitImagesWithoutCropping() {
    assertEquals(ImagePixelSize(20, 16), ImageSizeLimiter.fit(100, 80, 20))
    assertEquals(ImagePixelSize(16, 20), ImageSizeLimiter.fit(80, 100, 20))
    assertEquals(ImagePixelSize(2, 1), ImageSizeLimiter.fit(3, 2, 2))
  }

  @Test
  fun veryWideImagesStillKeepAtLeastOnePixelOnTheShortAxis() {
    assertEquals(ImagePixelSize(10, 1), ImageSizeLimiter.fit(1000, 1, 10))
  }
}
