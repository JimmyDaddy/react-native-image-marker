package com.jimmydaddy.imagemarker.base

import android.graphics.Paint.Align
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.base.Constants.DEFAULT_FONT_SIZE

class TextStyle(options: ReadableMap?) {
  var color: String?
  var fontName: String?
  var fontSize: Int
  var shadowLayerStyle: ShadowLayerStyle?
  var textBackgroundStyle: TextBackgroundStyle?
  var underline: Boolean
  var skewX: Float?
  var strikeThrough: Boolean
  var textAlign: Align
  var italic: Boolean
  var bold: Boolean
  var rotate: Int

  init {
    color = if (null != options!!.getString("color")) options.getString("color") else null
    fontSize = if (options.hasKey("fontSize")) options.getInt("fontSize") else DEFAULT_FONT_SIZE
    fontName =
      if (null != options.getString("fontName")) options.getString("fontName") else null
    skewX = if (options.hasKey("skewX")) options.getDouble("skewX").toFloat() else 0f;
    rotate = if (options.hasKey("rotate")) options.getInt("rotate") else 0
    underline = if (options.hasKey("underline")) options.getBoolean("underline") else false
    strikeThrough =
      if (options.hasKey("strikeThrough")) options.getBoolean("strikeThrough") else false
    italic = if (options.hasKey("italic")) options.getBoolean("italic") else false
    bold = if (options.hasKey("bold")) options.getBoolean("bold") else false
    val myShadowStyle = options.getMap("shadowStyle")
    shadowLayerStyle = myShadowStyle?.let { ShadowLayerStyle(it) }
    val myTextBackgroundStyle = options.getMap("textBackgroundStyle")
    textBackgroundStyle = myTextBackgroundStyle?.let { TextBackgroundStyle(it) }
    textAlign = Align.LEFT
    if (options.hasKey("textAlign")) {
      textAlign = when (options.getString("textAlign")) {
        "center" -> Align.CENTER
        "right" -> Align.RIGHT
        else -> Align.LEFT
      }
    }
  }
}
