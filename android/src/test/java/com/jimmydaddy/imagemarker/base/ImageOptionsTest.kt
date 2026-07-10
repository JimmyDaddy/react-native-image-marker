package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.mockito.Mockito

class ImageOptionsTest {
  @Test
  fun rejectsNonPositiveAndNonFiniteScale() {
    for (scale in listOf(0.0, -1.0, Double.NaN, Double.POSITIVE_INFINITY)) {
      val error = assertThrows(MarkerError::class.java) {
        ImageOptions(imageOptions(scale = scale))
      }

      assertEquals(ErrorCode.INVALID_PARAMS.value, error.getErrorCode())
    }
  }

  @Test
  fun rejectsNonFiniteRotation() {
    for (rotation in listOf(Double.NaN, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY)) {
      val error = assertThrows(MarkerError::class.java) {
        ImageOptions(imageOptions(rotation = rotation))
      }

      assertEquals(ErrorCode.INVALID_PARAMS.value, error.getErrorCode())
    }
  }

  private fun imageOptions(
    scale: Double = 1.0,
    rotation: Double = 0.0
  ): ReadableMap {
    val source = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(source.hasKey("uri")).thenReturn(true)
    Mockito.`when`(source.getString("uri")).thenReturn("test")

    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.hasKey("src")).thenReturn(true)
    Mockito.`when`(options.getMap("src")).thenReturn(source)
    Mockito.`when`(options.hasKey("scale")).thenReturn(true)
    Mockito.`when`(options.getDouble("scale")).thenReturn(scale)
    Mockito.`when`(options.hasKey("rotate")).thenReturn(true)
    Mockito.`when`(options.getDouble("rotate")).thenReturn(rotation)
    return options
  }
}
