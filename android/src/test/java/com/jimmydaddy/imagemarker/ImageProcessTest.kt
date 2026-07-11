package com.jimmydaddy.imagemarker

import org.junit.Assert.assertEquals
import org.junit.Test

class ImageProcessTest {
  @Test
  fun fortyFiveDegreeRotationExpandsToFullBoundingBox() {
    val bounds = ImageProcess.rotatedBounds(10f, 10f, 45)

    assertEquals(15, bounds.width)
    assertEquals(15, bounds.height)
    assertEquals(-7.071f, bounds.left, 0.001f)
    assertEquals(0f, bounds.top, 0.001f)
  }

  @Test
  fun rightAngleRotationUsesExactSwappedDimensions() {
    val bounds = ImageProcess.rotatedBounds(3f, 2f, 90)

    assertEquals(2, bounds.width)
    assertEquals(3, bounds.height)
    assertEquals(-2f, bounds.left, 0.001f)
    assertEquals(0f, bounds.top, 0.001f)
  }

  @Test
  fun fullRotationPreservesDimensions() {
    val bounds = ImageProcess.rotatedBounds(3f, 2f, 360)

    assertEquals(3, bounds.width)
    assertEquals(2, bounds.height)
    assertEquals(0f, bounds.left, 0.001f)
    assertEquals(0f, bounds.top, 0.001f)
  }
}
