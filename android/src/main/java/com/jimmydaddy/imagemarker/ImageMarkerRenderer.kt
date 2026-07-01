package com.jimmydaddy.imagemarker

import android.graphics.Bitmap
import android.graphics.Canvas
import com.facebook.react.bridge.ReactApplicationContext
import com.jimmydaddy.imagemarker.base.MarkImageOptions
import com.jimmydaddy.imagemarker.base.MarkWatermarkOptions
import com.jimmydaddy.imagemarker.base.Utils
import com.jimmydaddy.imagemarker.base.Utils.Companion.getBlankBitmap
import com.jimmydaddy.imagemarker.base.Position.Companion.getImageRectFromPosition
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
    canvas.save()
    var markerBitmap = sourceMarker
    if (markOpts.imageOption.scale != 1f) {
      markerBitmap = ImageProcess.scaleBitmap(markerBitmap, markOpts.imageOption.scale, filter = false)
        ?: throw IllegalStateException("Failed to scale watermark bitmap")
    }
    if (markOpts.imageOption.rotate != 0f) {
      val scaledMarkerBitmap = markerBitmap
      markerBitmap = ImageProcess.rotate(markerBitmap, markOpts.imageOption.rotate)
      if (scaledMarkerBitmap !== sourceMarker && !scaledMarkerBitmap.isRecycled) {
        scaledMarkerBitmap.recycle()
      }
    }

    if (markOpts.positionEnum != null) {
      val pos = getImageRectFromPosition(
        markOpts.positionEnum,
        markOpts.x,
        markOpts.y,
        markerBitmap.width,
        markerBitmap.height,
        canvasWidth,
        canvasHeight
      )
      canvas.drawBitmap(markerBitmap, pos.x, pos.y, markOpts.imageOption.applyStyle())
    } else {
      canvas.drawBitmap(
        markerBitmap,
        Utils.parseSpreadValue(markOpts.x, canvasWidth.toFloat()),
        Utils.parseSpreadValue(markOpts.y, canvasHeight.toFloat()),
        markOpts.imageOption.applyStyle()
      )
    }
    canvas.restore()

    if (markerBitmap !== sourceMarker && !markerBitmap.isRecycled) {
      markerBitmap.recycle()
    }
    if (recycleSource && !sourceMarker.isRecycled) {
      sourceMarker.recycle()
    }
  }

  fun renderWatermarks(
    bg: Bitmap,
    markerBitmaps: List<Bitmap?>,
    opts: MarkWatermarkOptions,
    context: ReactApplicationContext,
    recycleMarkerBitmaps: Boolean = false
  ): Bitmap {
    var output = getBlankBitmap(bg.width, bg.height)
      ?: throw IllegalStateException("Failed to create output bitmap")
    val canvas = Canvas(output)

    canvas.save()
    canvas.drawBitmap(bg, 0f, 0f, opts.backgroundImage.applyStyle())
    canvas.restore()

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

    if (opts.backgroundImage.rotate != 0f) {
      val rotatedOutput = ImageProcess.rotate(output, opts.backgroundImage.rotate)
      if (!output.isRecycled) {
        output.recycle()
      }
      output = rotatedOutput
    }

    return output
  }

  fun renderImageWatermarks(
    bg: Bitmap,
    markers: List<Bitmap?>,
    opts: MarkImageOptions,
    recycleMarkerBitmaps: Boolean = false
  ): Bitmap {
    var output = getBlankBitmap(bg.width, bg.height)
      ?: throw IllegalStateException("Failed to create output bitmap")
    val canvas = Canvas(output)

    canvas.save()
    canvas.drawBitmap(bg, 0f, 0f, opts.backgroundImage.applyStyle())
    canvas.restore()

    for (i in opts.watermarkImages.indices) {
      val markOpts = opts.watermarkImages[i]
      val sourceMarker = markers.getOrNull(i)
        ?: throw IllegalArgumentException("Watermark bitmap at index $i is null")
      drawImageWatermark(canvas, bg.width, bg.height, markOpts, sourceMarker, recycleMarkerBitmaps)
    }

    if (opts.backgroundImage.rotate != 0f) {
      val rotatedOutput = ImageProcess.rotate(output, opts.backgroundImage.rotate)
      if (!output.isRecycled) {
        output.recycle()
      }
      output = rotatedOutput
    }

    return output
  }
}
