package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.mockito.Mockito

class MarkImageOptionsTest {
  @Test
  fun rejectsNullMapEvenWhenArrayDoesNotReportNull() {
    val images = Mockito.mock(ReadableArray::class.java)
    Mockito.`when`(images.size()).thenReturn(1)
    Mockito.`when`(images.isNull(0)).thenReturn(false)
    Mockito.`when`(images.getMap(0)).thenReturn(null)

    val error = assertThrows(MarkerError::class.java) {
      MarkImageOptions.readWatermarkImages(images)
    }

    assertEquals(ErrorCode.NULL_MAP.value, error.getErrorCode())
    assertEquals("watermarkImages[0] is null", error.getErrMsg())
  }
}
