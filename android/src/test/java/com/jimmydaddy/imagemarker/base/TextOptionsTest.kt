package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.mockito.Mockito

class TextOptionsTest {
  @Test
  fun missingStyleIsAccepted() {
    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.getString("text")).thenReturn("watermark")

    TextOptions(options)
  }

  @Test
  fun parsesTextAlphaAndRejectsValuesOutsideTheUnitInterval() {
    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.getString("text")).thenReturn("watermark")
    Mockito.`when`(options.hasKey("alpha")).thenReturn(true)
    Mockito.`when`(options.isNull("alpha")).thenReturn(false)
    Mockito.`when`(options.getDouble("alpha")).thenReturn(0.35)

    assertEquals(0.35, TextOptions(options).alpha, 0.0001)

    Mockito.`when`(options.getDouble("alpha")).thenReturn(1.01)
    val error = assertThrows(MarkerError::class.java) { TextOptions(options) }
    assertEquals(ErrorCode.INVALID_PARAMS.value, error.getErrorCode())
  }

  @Test
  fun invalidStyleMapBecomesMarkerError() {
    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.getString("text")).thenReturn("watermark")
    Mockito.`when`(options.hasKey("style")).thenReturn(true)
    Mockito.`when`(options.isNull("style")).thenReturn(false)
    Mockito.`when`(options.getMap("style")).thenThrow(IllegalStateException("wrong type"))

    val error = assertThrows(MarkerError::class.java) { TextOptions(options) }

    assertEquals(ErrorCode.INVALID_PARAMS.value, error.getErrorCode())
  }

  @Test
  fun rotationPivotIncludesAbsoluteTextPosition() {
    assertEquals(
      Pair(70f, 45f),
      TextOptions.rotationPivot(x = 50f, y = 30f, width = 40f, height = 30f)
    )
  }
}
