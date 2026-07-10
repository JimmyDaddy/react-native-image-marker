package com.jimmydaddy.imagemarker.base

/**
 * A resolved top-left coordinate in the unrotated background-image coordinate space.
 */
data class Position(var x: Float, var y: Float) {

  companion object {
    private const val DEFAULT_EDGE_INSET = 20f

    fun getTextPosition(
      position: PositionEnum?,
      offsetX: String?,
      offsetY: String?,
      width: Int,
      height: Int,
      textWidth: Int,
      textHeight: Int,
      edgeInset: String? = null
    ): Position = resolve(
      position,
      offsetX,
      offsetY,
      edgeInset,
      width,
      height,
      textWidth,
      textHeight,
      DEFAULT_EDGE_INSET
    )

    @JvmStatic
    fun getImageRectFromPosition(
      position: PositionEnum?,
      offsetX: String?,
      offsetY: String?,
      width: Int,
      height: Int,
      imageWidth: Int,
      imageHeight: Int,
      edgeInset: String? = null
    ): Position = resolve(
      position,
      offsetX,
      offsetY,
      edgeInset,
      imageWidth,
      imageHeight,
      width,
      height,
      0f
    )

    private fun resolve(
      position: PositionEnum?,
      offsetX: String?,
      offsetY: String?,
      edgeInset: String?,
      canvasWidth: Int,
      canvasHeight: Int,
      itemWidth: Int,
      itemHeight: Int,
      unanchoredDefaultInset: Float
    ): Position {
      val explicitX = offsetX?.let { Utils.parseSpreadValue(it, canvasWidth.toFloat()) }
      val explicitY = offsetY?.let { Utils.parseSpreadValue(it, canvasHeight.toFloat()) }

      val configuredInsetX = edgeInset
        ?.let { Utils.parseSpreadValue(it, canvasWidth.toFloat()) }
        ?.coerceAtLeast(0f)
      val configuredInsetY = edgeInset
        ?.let { Utils.parseSpreadValue(it, canvasHeight.toFloat()) }
        ?.coerceAtLeast(0f)

      // Preserve each API's historical unanchored placement. Supplying edgeInset makes omitted
      // axes deterministic across platforms without changing existing calls.
      if (position == null) {
        return Position(
          explicitX ?: configuredInsetX ?: unanchoredDefaultInset,
          explicitY ?: configuredInsetY ?: unanchoredDefaultInset
        )
      }

      val insetX = configuredInsetX ?: DEFAULT_EDGE_INSET
      val insetY = configuredInsetY ?: DEFAULT_EDGE_INSET
      val centeredX = centered(canvasWidth, itemWidth)
      val centeredY = centered(canvasHeight, itemHeight)

      val anchored = when (position) {
        PositionEnum.TOP_LEFT -> Position(insetX, insetY)
        PositionEnum.TOP_CENTER -> Position(centeredX, insetY)
        PositionEnum.TOP_RIGHT -> Position(canvasWidth - itemWidth - insetX, insetY)
        PositionEnum.CENTER -> Position(centeredX, centeredY)
        PositionEnum.BOTTOM_LEFT -> Position(insetX, canvasHeight - itemHeight - insetY)
        PositionEnum.BOTTOM_CENTER -> Position(centeredX, canvasHeight - itemHeight - insetY)
        PositionEnum.BOTTOM_RIGHT -> Position(
          canvasWidth - itemWidth - insetX,
          canvasHeight - itemHeight - insetY
        )
      }

      // Explicit X/Y replace edgeInset for that axis while retaining the anchor's direction.
      if (explicitX != null) {
        anchored.x = when (position) {
          PositionEnum.TOP_LEFT, PositionEnum.BOTTOM_LEFT -> explicitX
          PositionEnum.TOP_CENTER, PositionEnum.CENTER, PositionEnum.BOTTOM_CENTER -> centeredX + explicitX
          PositionEnum.TOP_RIGHT, PositionEnum.BOTTOM_RIGHT -> canvasWidth - itemWidth - explicitX
        }
      }
      if (explicitY != null) {
        anchored.y = when (position) {
          PositionEnum.TOP_LEFT, PositionEnum.TOP_CENTER, PositionEnum.TOP_RIGHT -> explicitY
          PositionEnum.CENTER -> centeredY + explicitY
          PositionEnum.BOTTOM_LEFT, PositionEnum.BOTTOM_CENTER, PositionEnum.BOTTOM_RIGHT -> {
            canvasHeight - itemHeight - explicitY
          }
        }
      }
      return anchored
    }

    private fun centered(canvasSize: Int, itemSize: Int): Float {
      return (canvasSize - itemSize) / 2f
    }
  }
}
