package com.jimmydaddy.imagemarker.base

import android.graphics.Paint.Align
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.base.Constants.DEFAULT_FONT_SIZE

class TextStyle(private val options: ReadableMap?) {
  var color: String? = "#000000"
  var fontName: String? = null
  var fontSize: Float = DEFAULT_FONT_SIZE
  var fontSizeRatio: Float? = null
  var shadowLayerStyle: ShadowLayerStyle? = null
  var textBackgroundStyle: TextBackgroundStyle? = null
  var underline: Boolean = false
  var skewX: Float = 0f
  var strikeThrough: Boolean = false
  var textAlign: Align = Align.LEFT
  var italic: Boolean = false
  var bold: Boolean = false
  var rotate: Int = 0

  init {
    try {
      if (options != null) {
        color = options.stringOrNull("color") ?: color
        fontName = options.stringOrNull("fontName")
        fontSize = options.numberOrNull("fontSize")?.toFloat() ?: DEFAULT_FONT_SIZE
        fontSizeRatio = options.numberOrNull("fontSizeRatio")?.toFloat()
        shadowLayerStyle = options.mapOrNull("shadowStyle")?.let(::ShadowLayerStyle)
        textBackgroundStyle = options.mapOrNull("textBackgroundStyle")?.let(::TextBackgroundStyle)
        underline = options.booleanOrDefault("underline", false)
        skewX = options.numberOrNull("skewX")?.toFloat() ?: 0f
        strikeThrough = options.booleanOrDefault("strikeThrough", false)
        italic = options.booleanOrDefault("italic", false)
        bold = options.booleanOrDefault("bold", false)
        rotate = options.numberOrNull("rotate")?.toInt() ?: 0
        textAlign = when (options.stringOrNull("textAlign")) {
          "center" -> Align.CENTER
          "right" -> Align.RIGHT
          else -> Align.LEFT
        }
      }
    } catch (error: MarkerError) {
      throw error
    } catch (error: Exception) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "Invalid text style").apply {
        initCause(error)
      }
    }
  }

  fun resolveFontSize(backgroundWidth: Int): Float {
    return fontSizeRatio?.let { backgroundWidth * it } ?: fontSize
  }

  private fun ReadableMap.stringOrNull(key: String): String? {
    return if (hasKey(key) && !isNull(key)) getString(key) else null
  }

  private fun ReadableMap.numberOrNull(key: String): Double? {
    return if (hasKey(key) && !isNull(key)) getDouble(key) else null
  }

  private fun ReadableMap.mapOrNull(key: String): ReadableMap? {
    return if (hasKey(key) && !isNull(key)) getMap(key) else null
  }

  private fun ReadableMap.booleanOrDefault(key: String, defaultValue: Boolean): Boolean {
    return if (hasKey(key) && !isNull(key)) getBoolean(key) else defaultValue
  }
}
