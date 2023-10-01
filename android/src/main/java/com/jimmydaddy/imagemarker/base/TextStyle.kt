package com.jimmydaddy.imagemarker.base

import android.graphics.Paint.Align
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.base.Constants.DEFAULT_FONT_SIZE

data class TextStyle(val options: ReadableMap?) {
  var color: String? = if (null != options!!.getString("color")) options.getString("color") else null
  var fontName: String? = if (null != options?.getString("fontName")) options.getString("fontName") else null
  var fontSize: Int = if (options?.hasKey("fontSize") == true) options.getInt("fontSize") else DEFAULT_FONT_SIZE
  var shadowLayerStyle: ShadowLayerStyle?
  var textBackgroundStyle: TextBackgroundStyle?
  var underline: Boolean = if (options?.hasKey("underline") == true) options.getBoolean("underline") else false
  var skewX: Float? = if (options?.hasKey("skewX") == true) options.getDouble("skewX")?.toFloat() else 0f
  var strikeThrough: Boolean = if (options?.hasKey("strikeThrough") == true) options.getBoolean("strikeThrough") else false
  var textAlign: Align
  var italic: Boolean = if (options?.hasKey("italic") == true) options.getBoolean("italic") else false
  var bold: Boolean = if (options?.hasKey("bold") == true) options.getBoolean("bold") else false
  var rotate: Int = if (options?.hasKey("rotate") == true) options.getInt("rotate") else 0

  init {
    val myShadowStyle = options?.getMap("shadowStyle")
    shadowLayerStyle = myShadowStyle?.let { ShadowLayerStyle(it) }
    val myTextBackgroundStyle = options?.getMap("textBackgroundStyle")
    textBackgroundStyle = myTextBackgroundStyle?.let { TextBackgroundStyle(it) }
    textAlign = Align.LEFT
    if (options?.hasKey("textAlign") == true) {
      textAlign = when (options.getString("textAlign")) {
        "center" -> Align.CENTER
        "right" -> Align.RIGHT
        else -> Align.LEFT
      }
    }
  }
}
