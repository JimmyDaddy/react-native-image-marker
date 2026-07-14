package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Test
import org.mockito.Mockito

class MarkTextOptionsTest {
  @Test
  fun acceptsNonNullTextMap() {
    val textMap = JavaOnlyMap.of("text", "watermark")
    val texts = readableArray(textMap)

    val watermarkTexts = MarkTextOptions.readWatermarkTexts(texts)

    assertSame(textMap, watermarkTexts.single().options)
  }

  @Test
  fun rejectsNullMapEvenWhenArrayDoesNotReportNull() {
    val texts = readableArray(null)

    val error = assertThrows(MarkerError::class.java) {
      MarkTextOptions.readWatermarkTexts(texts)
    }

    assertEquals(ErrorCode.NULL_MAP.value, error.getErrorCode())
    assertEquals("watermarkTexts[0] is null", error.getErrMsg())
  }

  private fun readableArray(value: ReadableMap?): ReadableArray {
    val array = Mockito.mock(ReadableArray::class.java)
    Mockito.`when`(array.size()).thenReturn(1)
    Mockito.`when`(array.isNull(0)).thenReturn(false)
    Mockito.`when`(array.getMap(0)).thenReturn(value)
    return array
  }
}
