package com.jimmydaddy.imagemarker.base

/**
 * Created by jimmydaddy on 2017/9/23.
 */
class Position(var x: Float, var y: Float) {

  companion object {
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

    fun getImageRectFromPosition(
      position: String?,
      width: Int,
      height: Int,
      imageWidth: Int,
      imageHeigt: Int
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
          top = imageHeigt / 2 - height / 2
          pos.x = left.toFloat()
          pos.y = top.toFloat()
        }

        "bottomLeft" -> {
          top = imageHeigt - height
          pos.y = (top - 20).toFloat()
        }

        "bottomRight" -> {
          top = imageHeigt - height
          left = imageWidth - width - 20
          pos.x = (left - 20).toFloat()
          pos.y = (top - 20).toFloat()
        }

        "bottomCenter" -> {
          top = imageHeigt - height
          left = imageWidth / 2 - width / 2
          pos.x = (left - 20).toFloat()
          pos.y = (top - 20).toFloat()
        }
      }
      return pos
    }

    @JvmStatic
    fun getImageRectFromPosition(
      position: PositionEnum?,
      width: Int,
      height: Int,
      imageWidth: Int,
      imageHeigt: Int
    ): Position {
      var left = 20
      var top = 40
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
          top = imageHeigt / 2 - height / 2
          pos.x = left.toFloat()
          pos.y = top.toFloat()
        }

        PositionEnum.BOTTOM_LEFT -> {
          top = imageHeigt - height
          pos.y = (top - 20).toFloat()
        }

        PositionEnum.BOTTOM_RIGHT -> {
          top = imageHeigt - height
          left = imageWidth - width - 20
          pos.x = (left - 20).toFloat()
          pos.y = (top - 20).toFloat()
        }

        PositionEnum.BOTTOM_CENTER -> {
          top = imageHeigt - height
          left = imageWidth / 2 - width / 2
          pos.x = (left - 20).toFloat()
          pos.y = (top - 20).toFloat()
        }

        PositionEnum.TOP_LEFT -> {
          pos.x = left.toFloat();
          pos.y = top.toFloat();
        }
      }
      return pos
    }
  }
}
