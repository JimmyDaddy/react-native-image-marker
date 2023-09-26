package com.jimmydaddy.imagemarker.base

import android.graphics.Color
import android.util.Log
import com.facebook.react.bridge.ReadableMap

class TextBackgroundStyle(readableMap: ReadableMap?): Padding(readableMap) {
  var type: String? = ""
  var color = Color.TRANSPARENT

  init {
    if (null != readableMap) {
      try {
        type = readableMap.getString("type")
        setColor(readableMap.getString("color"))
      } catch (e: Exception) {
        Log.d(Utils.TAG, "Unknown text background options ", e)
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
