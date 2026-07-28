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
import com.facebook.react.common.assets.ReactFontManager
import com.jimmydaddy.imagemarker.ImageProcess
import kotlin.math.ceil
import kotlin.math.roundToInt

@Suppress("DEPRECATION")
data class TextOptions(val options: ReadableMap) {
  private var text: String? = options.getString("text")
  private var x: String?
  private var y: String?
  private var edgeInset: String?
  private var positionEnum: PositionEnum?
  private var style: TextStyle
  private var layout: WatermarkLayout?
  internal var alpha: Double = 1.0
    private set
  internal var blendMode: WatermarkBlendMode = WatermarkBlendMode.NORMAL
    private set

  init {
    try {
      if (text == null) {
        throw MarkerError(ErrorCode.PARAMS_REQUIRED, "mark text is required")
      }
      alpha = if (options.hasKey("alpha") && !options.isNull("alpha")) {
        options.getDouble("alpha")
      } else {
        1.0
      }
      if (!alpha.isFinite() || alpha !in 0.0..1.0) {
        throw MarkerError(
          ErrorCode.INVALID_PARAMS,
          "text alpha must be finite and between zero and one"
        )
      }
      blendMode = WatermarkBlendMode.fromOptions(options, "text blendMode")
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
      val layoutOptions = if (options.hasKey("layout") && !options.isNull("layout")) {
        options.getMap("layout")
      } else {
        null
      }
      layout = layoutOptions?.let(::WatermarkLayout)
      if (layout?.isTile == true && positionOptions != null) {
        throw MarkerError(ErrorCode.INVALID_PARAMS, "layout cannot be combined with position")
      }
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
    blendMode.applyTo(textPaint)
    if (null != style.shadowLayerStyle) {
      textPaint.setShadowLayer(
        style.shadowLayerStyle!!.radius,
        style.shadowLayerStyle!!.dx,
        style.shadowLayerStyle!!.dy,
        colorWithLayerAlpha(style.shadowLayerStyle!!.color)
      )
    }

    var typefaceFamily = Typeface.DEFAULT
    for (fontName in listOfNotNull(style.fontName) + style.fontFallbacks) {
      try {
        typefaceFamily = ReactFontManager.getInstance()
          .getTypeface(fontName, Typeface.NORMAL, context.assets)
        break
      } catch (e: Exception) {
        Log.e(Constants.IMAGE_MARKER_TAG, "Could not get typeface $fontName: " + e.message)
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
    textPaint.color = colorWithLayerAlpha(Color.parseColor(Utils.transRGBColor(style.color)))
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
    val strokeWidth = style.strokeStyle?.width ?: 0f
    val outlineInset = strokeWidth / 2f
    val visualTextWidth = ceil(textWidth + strokeWidth.toDouble()).toInt()
    val visualTextHeight = ceil(textHeight + strokeWidth.toDouble()).toInt()
    val positions = if (layout?.isTile == true) {
      val rotatedBounds = ImageProcess.rotatedBounds(
        visualTextWidth.toFloat(),
        visualTextHeight.toFloat(),
        style.rotate
      )
      val originInsetX = (rotatedBounds.width - visualTextWidth) / 2f
      val originInsetY = (rotatedBounds.height - visualTextHeight) / 2f
      layout!!.placements(
        maxWidth,
        maxHeight,
        rotatedBounds.width,
        rotatedBounds.height
      ).map { Position(it.x + originInsetX, it.y + originInsetY) }
    } else {
      listOf(
        Position.getTextPosition(
          positionEnum,
          x,
          y,
          maxWidth,
          maxHeight,
          visualTextWidth,
          visualTextHeight,
          edgeInset
        )
      )
    }

    for (position in positions) {
      val visualX = position.x
      val visualY = position.y
      val drawX = visualX + outlineInset
      val drawY = visualY + outlineInset
      canvas.save()
      val rotationPivot = rotationPivot(
        visualX,
        visualY,
        visualTextWidth.toFloat(),
        visualTextHeight.toFloat()
      )
      canvas.rotate(style.rotate.toFloat(), rotationPivot.first, rotationPivot.second)

      // Draw text background
      if (null != style.textBackgroundStyle) {
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.LINEAR_TEXT_FLAG)
        paint.style = Paint.Style.FILL
        paint.color = colorWithLayerAlpha(style.textBackgroundStyle!!.color)
        blendMode.applyTo(paint)
        val bgInsets = style.textBackgroundStyle!!.toEdgeInsets(maxWidth, maxHeight)
        var bgRect = RectF(
          drawX - outlineInset - bgInsets.left,
          drawY - outlineInset - bgInsets.top,
          drawX + textWidth + outlineInset + bgInsets.right,
          drawY + textHeight + outlineInset + bgInsets.bottom
        )
        when (style.textBackgroundStyle!!.type) {
          "stretchX" -> {
            bgRect = RectF(0f, drawY - outlineInset - bgInsets.top, maxWidth.toFloat(),
              drawY + textHeight + outlineInset + bgInsets.bottom
            )
          }

          "stretchY" -> {
            bgRect = RectF(drawX - outlineInset - bgInsets.left, 0f,
              drawX + textWidth + outlineInset + bgInsets.right, maxHeight.toFloat())
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
        Paint.Align.RIGHT -> drawX + textWidth
        Paint.Align.CENTER -> drawX + textWidth / 2
        Paint.Align.LEFT -> drawX
        else -> drawX
      }
      canvas.translate(textX, drawY)
      val fillColor = textPaint.color
      if (strokeWidth > 0f) {
        if (style.shadowLayerStyle != null) {
          textPaint.setShadowLayer(
            style.shadowLayerStyle!!.radius,
            style.shadowLayerStyle!!.dx,
            style.shadowLayerStyle!!.dy,
            colorWithLayerAlpha(style.shadowLayerStyle!!.color)
          )
        }
        textPaint.style = Paint.Style.STROKE
        textPaint.strokeWidth = strokeWidth
        textPaint.strokeJoin = Paint.Join.ROUND
        textPaint.color = colorWithLayerAlpha(
          Color.parseColor(Utils.transRGBColor(style.strokeStyle!!.color))
        )
        textLayout.draw(canvas)
        textPaint.clearShadowLayer()
        textPaint.style = Paint.Style.FILL
        textPaint.color = fillColor
      }
      textLayout.draw(canvas)
      canvas.restore()
    }
  }

  private fun colorWithLayerAlpha(color: Int): Int {
    val combinedAlpha = (Color.alpha(color) * alpha).roundToInt().coerceIn(0, 255)
    return Color.argb(combinedAlpha, Color.red(color), Color.green(color), Color.blue(color))
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
