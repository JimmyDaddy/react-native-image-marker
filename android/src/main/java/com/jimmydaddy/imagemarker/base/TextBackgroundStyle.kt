package com.jimmydaddy.imagemarker.base

import android.graphics.Color
import android.util.Log
import com.facebook.react.bridge.ReadableMap

class TextBackgroundStyle {
  var type: String? = ""
  var paddingX = 0f
  var paddingY = 0f
  var color = Color.TRANSPARENT

  constructor(type: String?, paddingX: Float, paddingY: Float, color: Int) {
    this.type = type
    this.paddingX = paddingX
    this.paddingY = paddingY
    this.color = color
  }

  constructor(readableMap: ReadableMap?) {
    if (null != readableMap) {
      try {
        type = readableMap.getString("type")
        paddingX = readableMap.getDouble("paddingX").toFloat()
        paddingY = readableMap.getDouble("paddingY").toFloat()
        setColor(readableMap.getString("color"))
      } catch (e: Exception) {
        Log.d(Utils.Companion.TAG, "Unknown text background options ", e)
      }
    }
  }

  private fun setColor(color: String?) {
    try {
      val parsedColor = Color.parseColor(Utils.Companion.transRGBColor(color))
      if (null != parsedColor) {
        this.color = parsedColor
      }
    } catch (e: Exception) {
      Log.d(Utils.Companion.TAG, "Unknown color string ", e)
    }
  }
}
