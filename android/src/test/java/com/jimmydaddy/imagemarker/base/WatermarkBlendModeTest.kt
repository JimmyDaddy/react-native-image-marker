package com.jimmydaddy.imagemarker.base

import android.graphics.PorterDuff
import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.mockito.Mockito

class WatermarkBlendModeTest {
  @Test
  fun mapsEveryPublicBlendModeToPorterDuff() {
    val expected = mapOf(
      "normal" to PorterDuff.Mode.SRC_OVER,
      "multiply" to PorterDuff.Mode.MULTIPLY,
      "screen" to PorterDuff.Mode.SCREEN,
      "overlay" to PorterDuff.Mode.OVERLAY,
      "darken" to PorterDuff.Mode.DARKEN,
      "lighten" to PorterDuff.Mode.LIGHTEN
    )

    for ((name, porterDuffMode) in expected) {
      val options = blendOptions(name)
      assertEquals(
        porterDuffMode,
        WatermarkBlendMode.fromOptions(options, "blendMode").porterDuffMode
      )
    }
  }

  @Test
  fun defaultsToNormalAndRejectsUnknownModes() {
    val defaults = Mockito.mock(ReadableMap::class.java)
    assertEquals(
      WatermarkBlendMode.NORMAL,
      WatermarkBlendMode.fromOptions(defaults, "blendMode")
    )

    val error = assertThrows(MarkerError::class.java) {
      WatermarkBlendMode.fromOptions(blendOptions("difference"), "text blendMode")
    }
    assertEquals(ErrorCode.INVALID_PARAMS.value, error.getErrorCode())
  }

  private fun blendOptions(value: String): ReadableMap {
    val options = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(options.hasKey("blendMode")).thenReturn(true)
    Mockito.`when`(options.isNull("blendMode")).thenReturn(false)
    Mockito.`when`(options.getString("blendMode")).thenReturn(value)
    return options
  }
}
