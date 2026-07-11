package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito

class OptionsTest {
  @Test
  fun acceptsQualityBoundaries() {
    assertEquals(0, Options.readQuality(JavaOnlyMap.of("quality", 0.0)))
    assertEquals(100, Options.readQuality(JavaOnlyMap.of("quality", 100.0)))
    assertEquals(100, Options.readQuality(JavaOnlyMap()))
  }

  @Test
  fun rejectsFractionalNonFiniteAndOutOfRangeQuality() {
    for (
      quality in listOf(
        -1.0,
        50.5,
        101.0,
        Double.NaN,
        Double.NEGATIVE_INFINITY,
        Double.POSITIVE_INFINITY
      )
    ) {
      val error = assertThrows(MarkerError::class.java) {
        Options.readQuality(JavaOnlyMap.of("quality", quality))
      }

      assertEquals(ErrorCode.INVALID_PARAMS.value, error.getErrorCode())
    }
  }

  @Test
  fun checkParamsConvertsWrongQualityTypeToInvalidParams() {
    val options = optionsWithQuality(50)
    Mockito.`when`(options.getDouble("quality")).thenThrow(IllegalStateException("wrong type"))
    val promise = Mockito.mock(Promise::class.java)

    assertNull(Options.checkParams(options, promise))
    Mockito.verify(promise).reject(
      Mockito.eq(ErrorCode.INVALID_PARAMS.value),
      anyString()
    )
  }

  @Test
  fun maxSizeDefaultsAndAcceptsPositiveInteger() {
    assertEquals(2048, Options.readMaxSize(JavaOnlyMap()))
    assertEquals(1, Options.readMaxSize(JavaOnlyMap.of("maxSize", 1.0)))
    assertEquals(4096, Options.readMaxSize(JavaOnlyMap.of("maxSize", 4096.0)))
  }

  @Test
  fun rejectsNonPositiveFractionalAndNonFiniteMaxSize() {
    for (
      maxSize in listOf(
        -1.0,
        0.0,
        10.5,
        Double.NaN,
        Double.NEGATIVE_INFINITY,
        Double.POSITIVE_INFINITY,
        Int.MAX_VALUE.toDouble() + 1.0
      )
    ) {
      val error = assertThrows(MarkerError::class.java) {
        Options.readMaxSize(JavaOnlyMap.of("maxSize", maxSize))
      }

      assertEquals(ErrorCode.INVALID_PARAMS.value, error.getErrorCode())
    }
  }

  private fun optionsWithQuality(quality: Int): ReadableMap {
    val source = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(source.hasKey("uri")).thenReturn(true)
    Mockito.`when`(source.getString("uri")).thenReturn("background")

    val background = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(background.hasKey("src")).thenReturn(true)
    Mockito.`when`(background.getMap("src")).thenReturn(source)

    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.getMap("backgroundImage")).thenReturn(background)
    Mockito.`when`(options.hasKey("quality")).thenReturn(true)
    Mockito.`when`(options.isNull("quality")).thenReturn(false)
    Mockito.`when`(options.getDouble("quality")).thenReturn(quality.toDouble())
    return options
  }
}
