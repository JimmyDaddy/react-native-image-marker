package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap

data class TextStrokeStyle(
  val color: String,
  val width: Float
) {
  constructor(options: ReadableMap) : this(
    color = options.getString("color")
      ?.takeIf { it.isNotBlank() }
      ?: throw IllegalArgumentException("stroke color is required"),
    width = options.getDouble("width").toFloat().also {
      require(it.isFinite() && it >= 0f) {
        "stroke width must be a non-negative finite number"
      }
    }
  )
}
