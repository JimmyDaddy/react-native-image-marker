package com.jimmydaddy.imagemarker.base

enum class PositionEnum(val value: String) {
  TOP_LEFT("topLeft"), TOP_CENTER("topCenter"), TOP_RIGHT("topRight"), CENTER("center"), BOTTOM_LEFT(
    "bottomLeft"
  ),
  BOTTOM_CENTER("bottomCenter"), BOTTOM_RIGHT("bottomRight");

  companion object {
    fun getPosition(position: String?): PositionEnum {
      return when (position) {
        "topCenter" -> TOP_CENTER
        "topRight" -> TOP_RIGHT
        "center" -> CENTER
        "bottomLeft" -> BOTTOM_LEFT
        "bottomCenter" -> BOTTOM_CENTER
        "topLeft" -> TOP_LEFT
        else -> BOTTOM_RIGHT
      }
    }
  }
}
