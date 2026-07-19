package com.jimmydaddy.imagemarker

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InvisibleWatermarkTest {
  private val key = "0123456789abcdef"

  @Test
  fun matchesTheCrossPlatformFrameAndPermutationVectors() {
    val frame = InvisibleWatermark.frameForTesting("asset-42", key)
    assertEquals("494d010861737365742d343200000000df3d807417f6", frame.toHex())
    assertEquals(
      listOf(114, 47, 36, 153, 1, 60, 116, 140),
      InvisibleWatermark.permutationForTesting(key).take(8)
    )
  }

  @Test
  fun embedsAndAuthenticatesPixelsWithoutAndroidGraphics() {
    val width = 256
    val height = 176
    val pixels = fixture(width, height)

    InvisibleWatermark.embedPixels(pixels, width, height, "asset-42", key)
    val result = InvisibleWatermark.detectPixels(pixels, width, height, key)

    assertTrue(result.detected)
    assertEquals("asset-42", result.payload)
    assertTrue(result.confidence > 0.8)
  }

  @Test
  fun rejectsTheWrongKey() {
    val width = 256
    val height = 176
    val pixels = fixture(width, height)
    InvisibleWatermark.embedPixels(pixels, width, height, "asset-42", key)

    assertFalse(
      InvisibleWatermark.detectPixels(
        pixels,
        width,
        height,
        "fedcba9876543210"
      ).detected
    )
  }

  @Test
  fun recoversLightImageResizingInRobustMode() {
    val width = 256
    val height = 176
    val pixels = fixture(width, height)
    InvisibleWatermark.embedPixels(pixels, width, height, "asset-42", key, "robust")

    for (scale in listOf(0.9, 0.95, 1.05, 1.1)) {
      val resized = InvisibleWatermark.resizePixelsForTesting(pixels, width, height, scale)
      val result = InvisibleWatermark.detectPixels(
        resized.pixels,
        resized.width,
        resized.height,
        key,
        strength = "robust",
        search = "robust"
      )

      assertTrue("Expected scale $scale to be recovered", result.detected)
      assertEquals("asset-42", result.payload)
      assertEquals(scale, result.scale!!, 0.0001)
    }
  }

  private fun fixture(width: Int, height: Int): IntArray =
    IntArray(width * height) { index ->
      val red = 80 + (index % 96)
      val green = red + 20
      val blue = red + 40
      (0xff shl 24) or (red shl 16) or (green shl 8) or blue
    }

  private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it.toInt() and 0xff) }
}
