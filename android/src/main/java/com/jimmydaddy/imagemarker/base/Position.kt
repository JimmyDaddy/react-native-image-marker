package com.jimmydaddy.imagemarker.base

/**
 * Created by jimmydaddy on 2017/9/23.
 */
data class Position(var x: Float, var y: Float) {

  companion object {
    private const val DEFAULT_POSITION_MARGIN = 20f

    fun getTextPosition(
      position: String?,
      margin: Int,
      width: Int,
      height: Int,
      textWidth: Int,
      textHeight: Int
    ): Position {
      return if (position == null) {
        Position(margin.toFloat(), margin.toFloat())
      } else when (position) {
        "topCenter" -> Position(
          ((width - textWidth) / 2).toFloat(),
          margin.toFloat()
        )

        "topRight" -> Position(
          (width - textWidth).toFloat(),
          margin.toFloat()
        )

        "center" -> Position(
          ((width - textWidth) / 2).toFloat(),
          ((height - textHeight) / 2).toFloat()
        )

        "bottomLeft" -> Position(
          0f,
          (height - textHeight - margin).toFloat()
        )

        "bottomCenter" -> Position(
          ((width - textWidth) / 2).toFloat(),
          (height - textHeight).toFloat()
        )

        else -> Position(
          (width - textWidth - margin).toFloat(),
          (height - textHeight - margin).toFloat()
        )
      }
    }

    fun getTextPosition(
      position: PositionEnum?,
      offsetX: String?,
      offsetY: String?,
      width: Int,
      height: Int,
      textWidth: Int,
      textHeight: Int
    ): Position {
      val resolvedPosition = getTextPosition(position, width, height, textWidth, textHeight)
      return applyOffsets(
        resolvedPosition,
        position,
        offsetX,
        offsetY,
        width,
        height,
        textWidth,
        textHeight
      )
    }

    fun getTextPosition(
      position: PositionEnum?,
      width: Int,
      height: Int,
      textWidth: Int,
      textHeight: Int
    ): Position {
      // default margin
      val margin = 20
      return if (position == null) {
        Position(margin.toFloat(), margin.toFloat())
      } else when (position) {
        PositionEnum.TOP_CENTER -> Position(
          ((width - textWidth) / 2).toFloat(),
          margin.toFloat()
        )

        PositionEnum.TOP_RIGHT -> Position(
          (width - textWidth).toFloat(),
          margin.toFloat()
        )

        PositionEnum.CENTER -> Position(
          ((width - textWidth) / 2).toFloat(),
          ((height - textHeight) / 2).toFloat()
        )

        PositionEnum.BOTTOM_LEFT -> Position(
          margin.toFloat(),
          (height - textHeight - margin).toFloat()
        )

        PositionEnum.BOTTOM_CENTER -> Position(
          ((width - textWidth) / 2).toFloat(),
          (height - textHeight).toFloat()
        )

        PositionEnum.BOTTOM_RIGHT -> Position(
          (width - textWidth - margin).toFloat(),
          (height - textHeight - margin).toFloat()
        )

        else -> Position(margin.toFloat(), margin.toFloat())
      }
    }

    @JvmStatic
    fun getImageRectFromPosition(
      position: PositionEnum?,
      offsetX: String?,
      offsetY: String?,
      width: Int,
      height: Int,
      imageWidth: Int,
      imageHeight: Int
    ): Position {
      val resolvedPosition = getImageRectFromPosition(position, width, height, imageWidth, imageHeight)
      return applyOffsets(
        resolvedPosition,
        position,
        offsetX,
        offsetY,
        imageWidth,
        imageHeight,
        width,
        height
      )
    }

    fun getImageRectFromPosition(
      position: String?,
      width: Int,
      height: Int,
      imageWidth: Int,
      imageHeight: Int
    ): Position {
      var left = 20
      var top = 40
      val right = imageWidth - width
      val pos = Position(left.toFloat(), top.toFloat())
      if (position == null) {
        return pos
      }
      when (position) {
        "topCenter" -> {
          left = imageWidth / 2 - width / 2
          pos.x = left.toFloat()
        }

        "topRight" -> pos.x = (right - 20).toFloat()
        "center" -> {
          left = imageWidth / 2 - width / 2
          top = imageHeight / 2 - height / 2
          pos.x = left.toFloat()
          pos.y = top.toFloat()
        }

        "bottomLeft" -> {
          top = imageHeight - height
          pos.y = (top - 20).toFloat()
        }

        "bottomRight" -> {
          top = imageHeight - height
          left = imageWidth - width - 20
          pos.x = (left - 20).toFloat()
          pos.y = (top - 20).toFloat()
        }

        "bottomCenter" -> {
          top = imageHeight - height
          left = imageWidth / 2 - width / 2
          pos.x = (left - 20).toFloat()
          pos.y = (top - 20).toFloat()
        }
      }
      return pos
    }

    private fun applyOffsets(
      resolvedPosition: Position,
      position: PositionEnum?,
      offsetX: String?,
      offsetY: String?,
      canvasWidth: Int,
      canvasHeight: Int,
      itemWidth: Int,
      itemHeight: Int
    ): Position {
      val x = offsetX?.let { Utils.parseSpreadValue(it, canvasWidth.toFloat()) }
      val y = offsetY?.let { Utils.parseSpreadValue(it, canvasHeight.toFloat()) }

      if (position == null) {
        if (x != null) {
          resolvedPosition.x = x
        }
        if (y != null) {
          resolvedPosition.y = y
        }
        return resolvedPosition
      }

      when (position) {
        PositionEnum.TOP_LEFT -> {
          if (x != null) resolvedPosition.x = x
          if (y != null) resolvedPosition.y = y
        }

        PositionEnum.TOP_CENTER -> {
          if (x != null) resolvedPosition.x = centered(canvasWidth, itemWidth) + x
          if (y != null) resolvedPosition.y = y
        }

        PositionEnum.TOP_RIGHT -> {
          if (x != null) resolvedPosition.x = canvasWidth - itemWidth - x
          if (y != null) resolvedPosition.y = y
        }

        PositionEnum.CENTER -> {
          if (x != null) resolvedPosition.x = centered(canvasWidth, itemWidth) + x
          if (y != null) resolvedPosition.y = centered(canvasHeight, itemHeight) + y
        }

        PositionEnum.BOTTOM_LEFT -> {
          if (x != null) resolvedPosition.x = x
          if (y != null) resolvedPosition.y = canvasHeight - itemHeight - y
        }

        PositionEnum.BOTTOM_CENTER -> {
          if (x != null) resolvedPosition.x = centered(canvasWidth, itemWidth) + x
          if (y != null) resolvedPosition.y = canvasHeight - itemHeight - y
        }

        PositionEnum.BOTTOM_RIGHT -> {
          if (x != null) resolvedPosition.x = canvasWidth - itemWidth - x
          if (y != null) resolvedPosition.y = canvasHeight - itemHeight - y
        }
      }
      return resolvedPosition
    }

    private fun centered(canvasSize: Int, itemSize: Int): Float {
      return ((canvasSize - itemSize) / 2).toFloat()
    }

    @JvmStatic
    fun getImageRectFromPosition(
      position: PositionEnum?,
      width: Int,
      height: Int,
      imageWidth: Int,
      imageHeight: Int
    ): Position {
      var left = DEFAULT_POSITION_MARGIN.toInt()
      var top = DEFAULT_POSITION_MARGIN.toInt()
      val right = imageWidth - width
      val pos = Position(left.toFloat(), top.toFloat())
      if (position == null) {
        return pos
      }
      when (position) {
        PositionEnum.TOP_CENTER -> {
          left = imageWidth / 2 - width / 2
          pos.x = left.toFloat()
        }

        PositionEnum.TOP_RIGHT -> pos.x = (right - 20).toFloat()
        PositionEnum.CENTER -> {
          left = imageWidth / 2 - width / 2
          top = imageHeight / 2 - height / 2
          pos.x = left.toFloat()
          pos.y = top.toFloat()
        }

        PositionEnum.BOTTOM_LEFT -> {
          top = imageHeight - height
          pos.y = (top - 20).toFloat()
        }

        PositionEnum.BOTTOM_RIGHT -> {
          top = imageHeight - height
          left = imageWidth - width - 20
          pos.x = (left - 20).toFloat()
          pos.y = (top - 20).toFloat()
        }

        PositionEnum.BOTTOM_CENTER -> {
          top = imageHeight - height
          left = imageWidth / 2 - width / 2
          pos.x = (left - 20).toFloat()
          pos.y = (top - 20).toFloat()
        }

        PositionEnum.TOP_LEFT -> {
          pos.x = left.toFloat()
          pos.y = top.toFloat()
        }
      }
      return pos
    }
  }
}
