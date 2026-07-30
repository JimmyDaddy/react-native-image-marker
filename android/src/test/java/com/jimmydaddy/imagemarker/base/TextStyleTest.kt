package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.mockito.Mockito

class TextStyleTest {
  @Test
  fun missingStyleUsesCompleteDefaults() {
    val style = TextStyle(null)

    assertEquals("#000000", style.color)
    assertNull(style.fontName)
    assertEquals(emptyList<String>(), style.fontFallbacks)
    assertEquals(14f, style.fontSize, 0f)
    assertNull(style.fontSizeRatio)
    assertNull(style.maxWidth)
    assertNull(style.lineHeight)
    assertEquals(0f, style.letterSpacing, 0f)
    assertEquals("auto", style.direction)
    assertEquals("word", style.wrap)
    assertNull(style.maxLines)
    assertEquals("clip", style.overflow)
    assertNull(style.shadowLayerStyle)
    assertNull(style.textBackgroundStyle)
    assertNull(style.strokeStyle)
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

  @Test
  fun parsesTextStrokeStyle() {
    val stroke = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(stroke.getString("color")).thenReturn("#11223380")
    Mockito.`when`(stroke.getDouble("width")).thenReturn(3.5)
    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.hasKey("strokeStyle")).thenReturn(true)
    Mockito.`when`(options.isNull("strokeStyle")).thenReturn(false)
    Mockito.`when`(options.getMap("strokeStyle")).thenReturn(stroke)

    val style = TextStyle(options)

    assertEquals(3.5f, style.strokeStyle?.width ?: -1f, 0.001f)
    assertEquals("#11223380", style.strokeStyle?.color)
  }

  @Test
  fun parsesCore21LayoutFields() {
    val options = Mockito.mock(ReadableMap::class.java)
    fun stringValue(key: String, value: String) {
      Mockito.`when`(options.hasKey(key)).thenReturn(true)
      Mockito.`when`(options.isNull(key)).thenReturn(false)
      Mockito.`when`(options.getString(key)).thenReturn(value)
    }
    fun numberValue(key: String, value: Double) {
      Mockito.`when`(options.hasKey(key)).thenReturn(true)
      Mockito.`when`(options.isNull(key)).thenReturn(false)
      Mockito.`when`(options.getDouble(key)).thenReturn(value)
    }
    stringValue("maxWidth", "60%")
    stringValue("direction", "rtl")
    stringValue("wrap", "character")
    stringValue("overflow", "ellipsis")
    numberValue("lineHeight", 32.0)
    numberValue("letterSpacing", 1.5)
    numberValue("maxLines", 2.0)

    val style = TextStyle(options)

    assertEquals(600, style.resolveMaxWidth(1000))
    assertEquals(32f, style.lineHeight ?: -1f, 0.001f)
    assertEquals(1.5f, style.letterSpacing, 0.001f)
    assertEquals("rtl", style.direction)
    assertEquals("character", style.wrap)
    assertEquals(2, style.maxLines)
    assertEquals("ellipsis", style.overflow)
  }

  @Test
  fun rejectsNullFontFallbacks() {
    val values = Mockito.mock(ReadableArray::class.java)
    Mockito.`when`(values.size()).thenReturn(1)
    Mockito.`when`(values.getString(0)).thenReturn(null)
    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.hasKey("fontFallbacks")).thenReturn(true)
    Mockito.`when`(options.isNull("fontFallbacks")).thenReturn(false)
    Mockito.`when`(options.getArray("fontFallbacks")).thenReturn(values)

    val error = assertThrows(MarkerError::class.java) { TextStyle(options) }

    assertEquals(ErrorCode.INVALID_PARAMS.value, error.getErrorCode())
  }
}
