package com.jimmydaddy.imagemarker

import android.graphics.Bitmap
import android.graphics.Canvas
import com.jimmydaddy.imagemarker.base.MarkImageOptions
import com.jimmydaddy.imagemarker.base.Utils
import com.jimmydaddy.imagemarker.base.Utils.Companion.getBlankBitmap
import com.jimmydaddy.imagemarker.base.Position.Companion.getImageRectFromPosition

object ImageMarkerRenderer {
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
      canvas.save()
      val markOpts = opts.watermarkImages[i]
      val sourceMarker = markers.getOrNull(i)
        ?: throw IllegalArgumentException("Watermark bitmap at index $i is null")
      var markerBitmap = sourceMarker
      if (markOpts.imageOption.rotate != 0f) {
        markerBitmap = ImageProcess.rotate(markerBitmap, markOpts.imageOption.rotate)
      }

      if (markOpts.positionEnum != null) {
        val pos = getImageRectFromPosition(
          markOpts.positionEnum,
          markOpts.x,
          markOpts.y,
          markerBitmap.width,
          markerBitmap.height,
          bg.width,
          bg.height
        )
        canvas.drawBitmap(markerBitmap, pos.x, pos.y, markOpts.imageOption.applyStyle())
      } else {
        canvas.drawBitmap(
          markerBitmap,
          Utils.parseSpreadValue(markOpts.x, bg.width.toFloat()),
          Utils.parseSpreadValue(markOpts.y, bg.height.toFloat()),
          markOpts.imageOption.applyStyle()
        )
      }
      canvas.restore()

      if (markerBitmap !== sourceMarker && !markerBitmap.isRecycled) {
        markerBitmap.recycle()
      }
      if (recycleMarkerBitmaps && !sourceMarker.isRecycled) {
        sourceMarker.recycle()
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
}
