package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.Mockito

class TextStyleTest {
  @Test
  fun resolveFontSizeUsesRatioWhenProvided() {
    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.hasKey("fontSizeRatio")).thenReturn(true)
    Mockito.`when`(options.isNull("fontSizeRatio")).thenReturn(false)
    Mockito.`when`(options.getDouble("fontSizeRatio")).thenReturn(0.03)

    val style = TextStyle(options)

    assertEquals(30f, style.resolveFontSize(1000), 0.001f)
  }

  @Test
  fun resolveFontSizeFallsBackToFontSize() {
    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.hasKey("fontSize")).thenReturn(true)
    Mockito.`when`(options.getDouble("fontSize")).thenReturn(24.0)

    val style = TextStyle(options)

    assertEquals(24f, style.resolveFontSize(1000), 0.001f)
  }
}
