package com.jimmydaddy.imagemarker.base

import android.graphics.Color
import android.util.Log
import com.facebook.react.bridge.ReadableMap

/**
 * Created by jimmydaddy on 2019/2/25.
 */
data class ShadowLayerStyle(val readableMap: ReadableMap?) {
  var radius = 0f
  var dx = 0f
  var dy = 0f
  var color = Color.TRANSPARENT

  init {
    if (null != readableMap) {
      try {
        setColor(readableMap.getString("color"))
        dx = readableMap.getDouble("dx").toFloat()
        dy = readableMap.getDouble("dy").toFloat()
        radius = readableMap.getDouble("radius").toFloat()
      } catch (e: Exception) {
        Log.d(Utils.TAG, "Unknown shadow style options ", e)
      }
    }
  }

  private fun setColor(color: String?) {
    try {
      val parsedColor = Color.parseColor(Utils.transRGBColor(color))
      this.color = parsedColor
    } catch (e: Exception) {
      Log.d(Utils.TAG, "Unknown color string ", e)
    }
  }
}
