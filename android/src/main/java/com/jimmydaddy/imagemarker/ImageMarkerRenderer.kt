package com.jimmydaddy.imagemarker

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Rect
import com.facebook.react.bridge.ReactApplicationContext
import com.jimmydaddy.imagemarker.base.MarkImageOptions
import com.jimmydaddy.imagemarker.base.MarkTextOptions
import com.jimmydaddy.imagemarker.base.MarkWatermarkOptions
import com.jimmydaddy.imagemarker.base.Options
import com.jimmydaddy.imagemarker.base.Position
import com.jimmydaddy.imagemarker.base.RotationCanvasMode
import com.jimmydaddy.imagemarker.base.SaveFormat
import com.jimmydaddy.imagemarker.base.Utils
import com.jimmydaddy.imagemarker.base.Utils.Companion.getBlankBitmap
import com.jimmydaddy.imagemarker.base.WatermarkImageOptions
import com.jimmydaddy.imagemarker.base.WatermarkLayerOptions

object ImageMarkerRenderer {
  private fun drawImageWatermark(
    canvas: Canvas,
    canvasWidth: Int,
    canvasHeight: Int,
    markOpts: WatermarkImageOptions,
    sourceMarker: Bitmap,
    recycleSource: Boolean = false
  ) {
    try {
      val sourceBounds = if (markOpts.trimTransparentPadding) {
        findNonTransparentBounds(sourceMarker)
      } else {
        Rect(0, 0, sourceMarker.width, sourceMarker.height)
      }
      val scale = markOpts.imageOption.scale
      val scaledWidth = sourceBounds.width() * scale
      val scaledHeight = sourceBounds.height() * scale
      val rotatedBounds = ImageProcess.rotatedBounds(
        scaledWidth,
        scaledHeight,
        markOpts.imageOption.rotate
      )
      val position = Position.getImageRectFromPosition(
        markOpts.positionEnum,
        markOpts.x,
        markOpts.y,
        rotatedBounds.width,
        rotatedBounds.height,
        canvasWidth,
        canvasHeight,
        markOpts.edgeInset
      )

      canvas.save()
      // Translate the transformed content bounds to the resolved anchor. Scaling and rotation
      // happen directly on the destination Canvas, avoiding temporary watermark bitmaps.
      canvas.translate(
        position.x - rotatedBounds.left,
        position.y - rotatedBounds.top
      )
      canvas.rotate(markOpts.imageOption.rotate)
      canvas.scale(scale, scale)
      canvas.translate(-sourceBounds.left.toFloat(), -sourceBounds.top.toFloat())
      canvas.clipRect(sourceBounds)
      val paint = markOpts.imageOption.applyStyle().apply {
        // Preserve hard edges for QR codes, barcodes and pixel-art watermarks.
        isFilterBitmap = false
      }
      canvas.drawBitmap(sourceMarker, 0f, 0f, paint)
      canvas.restore()
    } finally {
      if (recycleSource && !sourceMarker.isRecycled) {
        sourceMarker.recycle()
      }
    }
  }

  fun renderWatermarks(
    bg: Bitmap,
    markerBitmaps: List<Bitmap?>,
    opts: MarkWatermarkOptions,
    context: ReactApplicationContext,
    recycleMarkerBitmaps: Boolean = false
  ): Bitmap = renderComposition(bg, opts) { canvas ->
    var imageIndex = 0
    for (layer in opts.watermarkLayers) {
      when (layer) {
        is WatermarkLayerOptions.TextLayer -> {
          layer.textOptions.applyStyle(context, canvas, bg.width, bg.height)
        }
        is WatermarkLayerOptions.ImageLayer -> {
          val markerBitmap = markerBitmaps.getOrNull(imageIndex)
            ?: throw IllegalArgumentException("Watermark bitmap at index $imageIndex is null")
          drawImageWatermark(
            canvas,
            bg.width,
            bg.height,
            layer.imageOptions,
            markerBitmap,
            recycleMarkerBitmaps
          )
          imageIndex += 1
        }
      }
    }
  }

  fun renderImageWatermarks(
    bg: Bitmap,
    markers: List<Bitmap?>,
    opts: MarkImageOptions,
    recycleMarkerBitmaps: Boolean = false
  ): Bitmap = renderComposition(bg, opts) { canvas ->
    for (i in opts.watermarkImages.indices) {
      val sourceMarker = markers.getOrNull(i)
        ?: throw IllegalArgumentException("Watermark bitmap at index $i is null")
      drawImageWatermark(
        canvas,
        bg.width,
        bg.height,
        opts.watermarkImages[i],
        sourceMarker,
        recycleMarkerBitmaps
      )
    }
  }

  fun renderTextWatermarks(
    bg: Bitmap,
    opts: MarkTextOptions,
    context: ReactApplicationContext
  ): Bitmap = renderComposition(bg, opts) { canvas ->
    for (text in opts.watermarkTexts) {
      text.applyStyle(context, canvas, bg.width, bg.height)
    }
  }

  /** Returns the smallest non-empty alpha bounds without allocating another Bitmap. */
  fun findNonTransparentBounds(bitmap: Bitmap): Rect {
    val row = Utils.allocateOrThrow("watermark alpha scan row") {
      IntArray(bitmap.width)
    }
    var left = bitmap.width
    var top = bitmap.height
    var right = -1
    var bottom = -1
    for (y in 0 until bitmap.height) {
      bitmap.getPixels(row, 0, bitmap.width, 0, y, bitmap.width, 1)
      for (x in row.indices) {
        if (row[x] ushr 24 != 0) {
          if (x < left) left = x
          if (x > right) right = x
          if (y < top) top = y
          if (y > bottom) bottom = y
        }
      }
    }
    return if (right < left || bottom < top) {
      // There is no meaningful crop for a fully transparent source; keep its stable anchor size.
      Rect(0, 0, bitmap.width, bitmap.height)
    } else {
      Rect(left, top, right + 1, bottom + 1)
    }
  }

  private inline fun renderComposition(
    bg: Bitmap,
    opts: Options,
    drawWatermarks: (Canvas) -> Unit
  ): Bitmap {
    val rotation = opts.backgroundImage.rotate
    val expandedBounds = ImageProcess.rotatedBounds(
      bg.width.toFloat(),
      bg.height.toFloat(),
      rotation
    )
    val expand = opts.rotationCanvasMode == RotationCanvasMode.EXPAND
    val outputWidth = if (expand) expandedBounds.width else bg.width
    val outputHeight = if (expand) expandedBounds.height else bg.height
    val output = getBlankBitmap(outputWidth, outputHeight)

    try {
      val canvas = Canvas(output)
      if (opts.saveFormat == SaveFormat.JPG) {
        canvas.drawColor(opts.matteColor)
      }

      canvas.save()
      if (rotation != 0f) {
        canvas.translate(outputWidth / 2f, outputHeight / 2f)
        canvas.rotate(rotation)
        canvas.translate(-bg.width / 2f, -bg.height / 2f)
      }
      val backgroundPaint = opts.backgroundImage.applyStyle().apply {
        // Background rotation benefits from bilinear sampling. Watermark sampling remains
        // intentionally disabled in drawImageWatermark for QR codes and pixel art.
        isFilterBitmap = true
      }
      canvas.drawBitmap(bg, 0f, 0f, backgroundPaint)
      drawWatermarks(canvas)
      canvas.restore()
      return output
    } catch (error: Throwable) {
      if (!output.isRecycled) output.recycle()
      throw error
    }
  }
}
