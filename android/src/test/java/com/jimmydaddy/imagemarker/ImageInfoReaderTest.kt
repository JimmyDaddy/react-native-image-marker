package com.jimmydaddy.imagemarker

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ImageInfoReaderTest {
  @Test
  fun orientationProducesUprightDimensionsAndTransform() {
    val info = MarkerImageInfo(
      encodedWidth = 4032,
      encodedHeight = 3024,
      format = "jpeg",
      mimeType = "image/jpeg",
      orientation = 6
    )

    assertEquals(3024, info.width)
    assertEquals(4032, info.height)
    assertEquals(90, info.rotationDegrees)
    assertFalse(info.mirrored)
  }

  @Test
  fun mirroredOrientationIsReported() {
    val info = MarkerImageInfo(
      encodedWidth = 640,
      encodedHeight = 480,
      format = "heif",
      mimeType = "image/heif",
      orientation = 7
    )

    assertEquals(480, info.width)
    assertEquals(640, info.height)
    assertEquals(270, info.rotationDegrees)
    assertTrue(info.mirrored)
  }
}
