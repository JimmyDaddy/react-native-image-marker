package com.jimmydaddy.imagemarker.base

import android.graphics.Color
import android.util.Log
import com.facebook.react.bridge.ReadableMap

/**
 * Created by jimmydaddy on 2019/2/25.
 */
class ShadowLayerStyle {
  var radius = 0f
  var dx = 0f
  var dy = 0f
  var color = Color.TRANSPARENT

  constructor(radius: Float, dx: Float, dy: Float, color: Int) {
    this.radius = radius
    this.dx = dx
    this.dy = dy
    this.color = color
  }

  constructor(readableMap: ReadableMap?) {
    if (null != readableMap) {
      try {
        setColor(readableMap.getString("color"))
        dx = readableMap.getDouble("dx").toFloat()
        dy = readableMap.getDouble("dy").toFloat()
        radius = readableMap.getDouble("radius").toFloat()
      } catch (e: Exception) {
        Log.d(Utils.Companion.TAG, "Unknown shadow style options ", e)
      }
    }
  }

  fun setColor(color: String?) {
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
