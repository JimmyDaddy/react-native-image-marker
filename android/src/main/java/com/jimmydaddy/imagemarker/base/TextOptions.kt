package com.jimmydaddy.imagemarker.base

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Build
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import android.util.TypedValue
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.views.text.ReactFontManager
import kotlin.math.ceil

@Suppress("DEPRECATION")
data class TextOptions(val options: ReadableMap) {
  private var text: String? = options.getString("text")
  private var x: String?
  private var y: String?
  private var edgeInset: String?
  private var positionEnum: PositionEnum?
  private var style: TextStyle

  init {
    try {
      if (text == null) {
        throw MarkerError(ErrorCode.PARAMS_REQUIRED, "mark text is required")
      }
      val positionOptions = if (options.hasKey("position") && !options.isNull("position")) {
        options.getMap("position")
      } else {
        null
      }
      x =
        if (positionOptions?.hasKey("X") == true) Utils.handleDynamicToString(positionOptions.getDynamic("X")) else null
      y =
        if (positionOptions?.hasKey("Y") == true) Utils.handleDynamicToString(positionOptions.getDynamic("Y")) else null
      edgeInset =
        if (positionOptions?.hasKey("edgeInset") == true) Utils.handleDynamicToString(positionOptions.getDynamic("edgeInset")) else null
      val positionName = if (positionOptions?.hasKey("position") == true && !positionOptions.isNull("position")) {
        positionOptions.getString("position")
      } else {
        null
      }
      positionEnum = positionName?.let(PositionEnum::getPosition)
      val styleOptions = if (options.hasKey("style") && !options.isNull("style")) {
        options.getMap("style")
      } else {
        null
      }
      style = TextStyle(styleOptions)
    } catch (error: MarkerError) {
      throw error
    } catch (error: Exception) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "Invalid text options").apply {
        initCause(error)
      }
    }
  }

  fun applyStyle(
    context: ReactApplicationContext,
    canvas: Canvas,
    maxWidth: Int,
    maxHeight: Int
  ) {
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

    var typefaceFamily = Typeface.DEFAULT
    if (style.fontName != null) {
      typefaceFamily = try {
          //设置字体失败时使用默认字体
        ReactFontManager.getInstance()
          .getTypeface(style.fontName!!, Typeface.NORMAL, context.assets)
      } catch (e: Exception) {
        Log.e(Constants.IMAGE_MARKER_TAG, "Could not get typeface: " + e.message)
        Typeface.DEFAULT
      }
    }
//    val textSize = TypedValue.applyDimension(
//      TypedValue.COMPLEX_UNIT_SP,
//      style.fontSize,
//      context.resources.displayMetrics
//    )
    val textSize = style.resolveFontSize(maxWidth)
    textPaint.isAntiAlias = true
    textPaint.textSize = textSize
    Log.i(Constants.IMAGE_MARKER_TAG, "textSize: " + textSize + " fontSize: " + style.fontSize + " displayMetrics: " + context.resources.displayMetrics)
    textPaint.color = Color.parseColor(Utils.transRGBColor(style.color))
    textPaint.isUnderlineText = style.underline
    textPaint.textSkewX = style.skewX
    var typeface = Typeface.create(typefaceFamily, Typeface.NORMAL)
    if (style.italic && style.bold) {
      typeface = Typeface.create(typefaceFamily, Typeface.BOLD_ITALIC)
    } else if (style.italic) {
      typeface = Typeface.create(typefaceFamily, Typeface.ITALIC)
    } else if (style.bold) {
      typeface = Typeface.create(typefaceFamily, Typeface.BOLD)
    }
    textPaint.isStrikeThruText = style.strikeThrough
    textPaint.typeface = typeface
    textPaint.textAlign = style.textAlign
    // ALIGN_CENTER, ALIGN_NORMAL, ALIGN_OPPOSITE
    val textLayout: StaticLayout = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val builder =
        StaticLayout.Builder.obtain(text!!, 0, text!!.length, textPaint, maxWidth)
      builder.setAlignment(Layout.Alignment.ALIGN_NORMAL)
      builder.setLineSpacing(0.0f, 1.0f)
      builder.setIncludePad(false)
      builder.build()
    } else {
      StaticLayout(
        text,
        textPaint,
        maxWidth,
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
    val position = Position.getTextPosition(
      positionEnum,
      x,
      y,
      maxWidth,
      maxHeight,
      textWidth,
      textHeight,
      edgeInset
    )
    val x = position.x
    val y = position.y

    canvas.save()
    val rotationPivot = rotationPivot(x, y, textWidth.toFloat(), textHeight.toFloat())
    canvas.rotate(style.rotate.toFloat(), rotationPivot.first, rotationPivot.second)

    // Draw text background
    if (null != style.textBackgroundStyle) {
      val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.LINEAR_TEXT_FLAG)
      paint.style = Paint.Style.FILL
      paint.color = style.textBackgroundStyle!!.color
      val bgInsets = style.textBackgroundStyle!!.toEdgeInsets(maxWidth, maxHeight)
      var bgRect = RectF(x - bgInsets.left, y - bgInsets.top, x + textWidth + bgInsets.right, y + textHeight + bgInsets.bottom)
      when (style.textBackgroundStyle!!.type) {
        "stretchX" -> {
          bgRect = RectF(0f, y - bgInsets.top, maxWidth.toFloat(),
            y + textHeight + bgInsets.bottom
          )
        }

        "stretchY" -> {
          bgRect = RectF(x - bgInsets.left, 0f,
            x + textWidth + bgInsets.right, maxHeight.toFloat())
        }
      }

      if (style.textBackgroundStyle!!.cornerRadius != null) {
        val path = Path()

        path.addRoundRect(bgRect, style.textBackgroundStyle!!.cornerRadius!!.radii(bgRect), Path.Direction.CW)

        canvas.drawPath(path, paint)
      } else {
        canvas.drawRect(bgRect, paint)
      }
    }
    val textX = when(textPaint.textAlign) {
      Paint.Align.RIGHT -> x + textWidth
      Paint.Align.CENTER -> x + textWidth / 2
      Paint.Align.LEFT -> x
      else -> x
    }
    canvas.translate(textX, y)
    textLayout.draw(canvas)
    canvas.restore()
  }

  companion object {
    internal fun rotationPivot(
      x: Float,
      y: Float,
      width: Float,
      height: Float
    ): Pair<Float, Float> {
      return Pair(x + width / 2f, y + height / 2f)
    }
  }
}
