package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.Mockito

class TextStyleTest {
  @Test
  fun missingStyleUsesCompleteDefaults() {
    val style = TextStyle(null)

    assertEquals("#000000", style.color)
    assertNull(style.fontName)
    assertEquals(14f, style.fontSize, 0f)
    assertNull(style.fontSizeRatio)
    assertNull(style.shadowLayerStyle)
    assertNull(style.textBackgroundStyle)
    assertFalse(style.underline)
    assertEquals(0f, style.skewX, 0f)
    assertFalse(style.strikeThrough)
    assertEquals(android.graphics.Paint.Align.LEFT, style.textAlign)
    assertFalse(style.italic)
    assertFalse(style.bold)
    assertEquals(0, style.rotate)
  }

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
