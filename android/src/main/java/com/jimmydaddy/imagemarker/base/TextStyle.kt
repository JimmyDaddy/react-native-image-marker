package com.jimmydaddy.imagemarker.base

import android.graphics.Paint.Align
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.base.Constants.DEFAULT_FONT_SIZE

class TextStyle(private val options: ReadableMap?) {
  var color: String? = "#000000"
  var fontName: String? = null
  var fontFallbacks: List<String> = emptyList()
  var fontSize: Float = DEFAULT_FONT_SIZE
  var fontSizeRatio: Float? = null
  var maxWidth: String? = null
  var lineHeight: Float? = null
  var letterSpacing: Float = 0f
  var direction: String = "auto"
  var wrap: String = "word"
  var maxLines: Int? = null
  var overflow: String = "clip"
  var shadowLayerStyle: ShadowLayerStyle? = null
  var textBackgroundStyle: TextBackgroundStyle? = null
  var strokeStyle: TextStrokeStyle? = null
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
        if (options.hasKey("fontFallbacks") && !options.isNull("fontFallbacks")) {
          val values = options.getArray("fontFallbacks")
            ?: throw MarkerError(
              ErrorCode.INVALID_PARAMS,
              "fontFallbacks must be an array"
            )
          fontFallbacks = List(values.size()) { index ->
            values.getString(index).takeUnless { it.isBlank() }
              ?: throw MarkerError(
                ErrorCode.INVALID_PARAMS,
                "fontFallbacks must contain non-empty font family names"
              )
          }
        }
        fontSize = options.numberOrNull("fontSize")?.toFloat() ?: DEFAULT_FONT_SIZE
        fontSizeRatio = options.numberOrNull("fontSizeRatio")?.toFloat()
        maxWidth = options.stringOrNull("maxWidth")
        lineHeight = options.numberOrNull("lineHeight")?.toFloat()
        letterSpacing = options.numberOrNull("letterSpacing")?.toFloat() ?: 0f
        direction = options.stringOrNull("direction") ?: "auto"
        wrap = options.stringOrNull("wrap") ?: "word"
        val rawMaxLines = options.numberOrNull("maxLines")
        maxLines = rawMaxLines?.toInt()
        overflow = options.stringOrNull("overflow") ?: "clip"
        if (lineHeight != null && (!lineHeight!!.isFinite() || lineHeight!! <= 0f)) {
          throw MarkerError(ErrorCode.INVALID_PARAMS, "lineHeight must be greater than zero")
        }
        if (!letterSpacing.isFinite()) {
          throw MarkerError(ErrorCode.INVALID_PARAMS, "letterSpacing must be finite")
        }
        if (rawMaxLines != null &&
          (!rawMaxLines.isFinite() || rawMaxLines < 1 || rawMaxLines % 1.0 != 0.0)
        ) {
          throw MarkerError(ErrorCode.INVALID_PARAMS, "maxLines must be a positive integer")
        }
        if (direction !in setOf("auto", "ltr", "rtl")) {
          throw MarkerError(ErrorCode.INVALID_PARAMS, "direction is invalid")
        }
        if (wrap !in setOf("word", "character", "none")) {
          throw MarkerError(ErrorCode.INVALID_PARAMS, "wrap is invalid")
        }
        if (overflow !in setOf("clip", "ellipsis")) {
          throw MarkerError(ErrorCode.INVALID_PARAMS, "overflow is invalid")
        }
        shadowLayerStyle = options.mapOrNull("shadowStyle")?.let(::ShadowLayerStyle)
        textBackgroundStyle = options.mapOrNull("textBackgroundStyle")?.let(::TextBackgroundStyle)
        strokeStyle = options.mapOrNull("strokeStyle")?.let(::TextStrokeStyle)
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

  fun resolveMaxWidth(backgroundWidth: Int): Int {
    val resolved = maxWidth?.let {
      Utils.parseSpreadValue(it, backgroundWidth.toFloat())
    } ?: backgroundWidth.toFloat()
    if (!resolved.isFinite() || resolved <= 0f) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "maxWidth must be greater than zero")
    }
    return kotlin.math.ceil(resolved.toDouble()).toInt().coerceAtLeast(1)
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
