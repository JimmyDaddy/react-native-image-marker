package com.jimmydaddy.imagemarker.base

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.TypedValue
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.views.text.ReactFontManager
import kotlin.math.ceil

class TextOptions(options: ReadableMap) {
  var text: String?
  var X: Int?
  var Y: Int?
  var positionEnum: PositionEnum?
  var style: TextStyle

  init {
    text = options.getString("text")
    if (text == null) {
      throw MarkerError(ErrorCode.PARAMS_REQUIRED, "mark text is required")
    }
    val positionOptions =
      if (null != options.getMap("positionOptions")) options.getMap("positionOptions") else null
    X = if (positionOptions!!.hasKey("X")) positionOptions.getInt("X") else null
    Y = if (positionOptions!!.hasKey("Y")) positionOptions.getInt("Y") else null
    positionEnum =
      if (null != positionOptions!!.getString("position")) PositionEnum.getPosition(
        positionOptions.getString("position")
      ) else null
    style = TextStyle(options.getMap("style"))
  }

  fun applyStyle(
    context: ReactApplicationContext,
    canvas: Canvas,
    maxWidth: Int,
    maxHeight: Int
  ): TextPaint {
    val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG or Paint.DEV_KERN_TEXT_FLAG)
    textPaint.isAntiAlias = true
    if (null != style.shadowLayerStyle) {
      textPaint.setShadowLayer(
        style.shadowLayerStyle!!.radius,
        style.shadowLayerStyle!!.dx,
        style.shadowLayerStyle!!.dy,
        style.shadowLayerStyle!!.color
      )
    }
    try {
      //设置字体失败时使用默认字体
      textPaint.typeface = ReactFontManager.getInstance()
        .getTypeface(style.fontName!!, Typeface.NORMAL, context.assets)
    } catch (e: Exception) {
      textPaint.typeface = Typeface.DEFAULT
    }
    val textSize = TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_SP,
      style.fontSize.toFloat(),
      context.resources.displayMetrics
    )
    textPaint.isAntiAlias = true;
    textPaint.textSize = textSize
    textPaint.color = Color.parseColor(Utils.transRGBColor(style.color))
    textPaint.isUnderlineText = style.underline
    textPaint.textSkewX = style.skewX!!
    var typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
    if (style.italic && style.bold) {
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD_ITALIC)
    } else if (style.italic) {
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.ITALIC)
    } else if (style.bold) {
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    textPaint.isStrikeThruText = style.strikeThrough
    textPaint.typeface = typeface
    textPaint.textAlign = style.textAlign
    // ALIGN_CENTER, ALIGN_NORMAL, ALIGN_OPPOSITE
    val textLayout: StaticLayout = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val builder =
        StaticLayout.Builder.obtain(text!!, 0, text!!.length, textPaint, canvas.width)
      builder.setAlignment(Layout.Alignment.ALIGN_NORMAL)
      builder.setLineSpacing(0.0f, 1.0f)
      builder.setIncludePad(false)
      builder.build()
    } else {
      StaticLayout(
        text,
        textPaint,
        canvas.width,
        Layout.Alignment.ALIGN_NORMAL,
        1.0f,
        0.0f,
        false
      )
    }
    val textHeight = textLayout.height
    var textWidth = 0
    val count = textLayout.lineCount
    for (a in 0 until count) {
      textWidth = ceil(
        textWidth.toFloat()
          .coerceAtLeast(textLayout.getLineWidth(a) + textLayout.getLineLeft(a)).toDouble()
      ).toInt()
    }
    val margin = 20
    var position = Position(margin.toFloat(), margin.toFloat())
    if (positionEnum != null) {
      position = Position.getTextPosition(
        positionEnum,
        maxWidth,
        maxHeight,
        textWidth,
        textHeight
      )
    } else {
      if (null != X) {
        position.x = X!!.toFloat()
      }
      if (null != Y) {
        position.y = Y!!.toFloat()
      }
    }
    val x = position.x
    val y = position.y

    // Draw text background
    if (null != style.textBackgroundStyle) {
      val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.LINEAR_TEXT_FLAG)
      paint.style = Paint.Style.FILL
      paint.color = style.textBackgroundStyle!!.color
      when (style.textBackgroundStyle!!.type) {
        "stretchX" -> {
          canvas.drawRect(
            0f,
            y - style.textBackgroundStyle!!.paddingY,
            maxWidth.toFloat(),
            y + textHeight + style.textBackgroundStyle!!.paddingY,
            paint
          )
        }

        "stretchY" -> {
          canvas.drawRect(
            x - style.textBackgroundStyle!!.paddingX,
            0f,
            x + textWidth + style.textBackgroundStyle!!.paddingX,
            maxHeight.toFloat(),
            paint
          )
        }

        else -> {
          canvas.drawRect(
            x - style.textBackgroundStyle!!.paddingX,
            y - style.textBackgroundStyle!!.paddingY,
            x + textWidth + style.textBackgroundStyle!!.paddingX,
            y + textHeight + style.textBackgroundStyle!!.paddingY,
            paint
          )
        }
      }
    }
    canvas.save()
    canvas.translate(x, y)
    canvas.rotate(style.rotate.toFloat())
    textLayout.draw(canvas)
    canvas.restore()
    textPaint.reset()
    return textPaint
  }
}
