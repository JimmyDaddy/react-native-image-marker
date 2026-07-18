package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.JavaOnlyMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class WatermarkLayoutTest {
  @Test
  fun resolvesPercentOffsetsAndStaggeredRows() {
    val layout = WatermarkLayout(
      JavaOnlyMap.of(
        "type", "tile",
        "gapX", 20,
        "gapY", 10,
        "offsetX", "10%",
        "offsetY", -5,
        "stagger", true
      )
    )

    val placements = layout.placements(100, 60, 20, 10)

    assertEquals(-10f, placements[0].x, 0.001f)
    assertEquals(-5f, placements[0].y, 0.001f)
    assertEquals(30f, placements[1].x, 0.001f)
    val secondRow = placements.filter { it.y == 15f }
    assertEquals(10f, secondRow[0].x, 0.001f)
    assertEquals(50f, secondRow[1].x, 0.001f)
  }

  @Test
  fun rejectsNegativeGapsAndExcessiveCopies() {
    val negativeGap = WatermarkLayout(
      JavaOnlyMap.of("type", "tile", "gapX", -1)
    )
    assertThrows(IllegalArgumentException::class.java) {
      negativeGap.placements(100, 100, 10, 10)
    }

    val dense = WatermarkLayout(JavaOnlyMap.of("type", "tile"))
    val error = assertThrows(IllegalArgumentException::class.java) {
      dense.placements(100, 100, 1, 1)
    }
    assertEquals(
      "tile layout exceeds the maximum of 4096 copies per layer",
      error.message
    )
  }
}
