package com.jimmydaddy.imagemarker.base

import org.junit.Assert.assertEquals
import org.junit.Test

class PositionTest {
  @Test
  fun topRightTextUsesOffsetsFromEdges() {
    val position = Position.getTextPosition(
      PositionEnum.TOP_RIGHT,
      "60",
      "60",
      1000,
      800,
      120,
      40
    )

    assertEquals(820f, position.x, 0.001f)
    assertEquals(60f, position.y, 0.001f)
  }

  @Test
  fun bottomRightImageUsesOffsetsFromEdges() {
    val position = Position.getImageRectFromPosition(
      PositionEnum.BOTTOM_RIGHT,
      "30",
      "40",
      100,
      80,
      1000,
      800
    )

    assertEquals(870f, position.x, 0.001f)
    assertEquals(680f, position.y, 0.001f)
  }

  @Test
  fun centerTextUsesOffsetsFromCenteredAnchor() {
    val position = Position.getTextPosition(
      PositionEnum.CENTER,
      "10",
      "20",
      1000,
      800,
      100,
      40
    )

    assertEquals(460f, position.x, 0.001f)
    assertEquals(400f, position.y, 0.001f)
  }

  @Test
  fun percentOffsetsAreRelativeToBackgroundDimensions() {
    val position = Position.getTextPosition(
      PositionEnum.TOP_RIGHT,
      "10%",
      "5%",
      1000,
      800,
      120,
      40
    )

    assertEquals(780f, position.x, 0.001f)
    assertEquals(40f, position.y, 0.001f)
  }

  @Test
  fun omittedOffsetsKeepExistingAnchoredPosition() {
    val position = Position.getTextPosition(
      PositionEnum.TOP_RIGHT,
      null,
      null,
      1000,
      800,
      120,
      40
    )

    assertEquals(880f, position.x, 0.001f)
    assertEquals(20f, position.y, 0.001f)
  }
}
