package com.jimmydaddy.imagemarker.base

import org.junit.Assert.assertEquals
import org.junit.Test

class PositionTest {
  @Test
  fun everyNamedAnchorUsesAUniformDefaultInset() {
    val expected = mapOf(
      PositionEnum.TOP_LEFT to Position(20f, 20f),
      PositionEnum.TOP_CENTER to Position(45f, 20f),
      PositionEnum.TOP_RIGHT to Position(70f, 20f),
      PositionEnum.CENTER to Position(45f, 30f),
      PositionEnum.BOTTOM_LEFT to Position(20f, 40f),
      PositionEnum.BOTTOM_CENTER to Position(45f, 40f),
      PositionEnum.BOTTOM_RIGHT to Position(70f, 40f)
    )

    for ((anchor, expectedPosition) in expected) {
      val actual = Position.getImageRectFromPosition(
        anchor,
        null,
        null,
        10,
        20,
        100,
        80
      )
      assertEquals("$anchor x", expectedPosition.x, actual.x, 0.001f)
      assertEquals("$anchor y", expectedPosition.y, actual.y, 0.001f)
    }
  }

  @Test
  fun zeroEdgeInsetMakesBottomRightFlush() {
    val position = Position.getImageRectFromPosition(
      PositionEnum.BOTTOM_RIGHT,
      null,
      null,
      10,
      20,
      100,
      80,
      "0"
    )

    assertEquals(90f, position.x, 0.001f)
    assertEquals(60f, position.y, 0.001f)
  }

  @Test
  fun explicitZeroOffsetsOverrideNamedAnchorInset() {
    val position = Position.getImageRectFromPosition(
      PositionEnum.BOTTOM_RIGHT,
      "0",
      "0",
      10,
      20,
      100,
      80,
      "12"
    )

    assertEquals(90f, position.x, 0.001f)
    assertEquals(60f, position.y, 0.001f)
  }

  @Test
  fun unanchoredImageCoordinatesPreserveTheHistoricalOrigin() {
    val position = Position.getImageRectFromPosition(
      null,
      null,
      null,
      10,
      20,
      100,
      80
    )

    assertEquals(0f, position.x, 0.001f)
    assertEquals(0f, position.y, 0.001f)
  }

  @Test
  fun unanchoredTextCoordinatesPreserveTheHistoricalInset() {
    val position = Position.getTextPosition(
      null,
      null,
      null,
      100,
      80,
      10,
      20
    )

    assertEquals(20f, position.x, 0.001f)
    assertEquals(20f, position.y, 0.001f)
  }

  @Test
  fun zeroEdgeInsetMakesUnanchoredCoordinatesFlush() {
    val position = Position.getImageRectFromPosition(
      null,
      null,
      null,
      10,
      20,
      100,
      80,
      "0"
    )

    assertEquals(0f, position.x, 0.001f)
    assertEquals(0f, position.y, 0.001f)
  }

  @Test
  fun edgeInsetPercentUsesEachCanvasDimension() {
    val position = Position.getImageRectFromPosition(
      PositionEnum.TOP_LEFT,
      null,
      null,
      10,
      20,
      100,
      80,
      "10%"
    )

    assertEquals(10f, position.x, 0.001f)
    assertEquals(8f, position.y, 0.001f)
  }

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

    assertEquals(860f, position.x, 0.001f)
    assertEquals(20f, position.y, 0.001f)
  }
}
