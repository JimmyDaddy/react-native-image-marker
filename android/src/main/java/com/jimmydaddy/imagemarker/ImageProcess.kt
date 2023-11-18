package com.jimmydaddy.imagemarker

import android.graphics.Bitmap
import android.graphics.Matrix
import android.util.Log
import com.jimmydaddy.imagemarker.base.Constants.IMAGE_MARKER_TAG

class ImageProcess {
  companion object {
    fun rotate(bitmap: Bitmap, rotation: Number): Bitmap {
      val rotationMatrix = Matrix().apply { postRotate(rotation.toFloat()) }
      return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, rotationMatrix, true)
    }

    fun scaleBitmap(bitmap: Bitmap, scale: Float): Bitmap? {
      val w = bitmap.width
      val h = bitmap.height
      val mtx = Matrix()
      if (scale != 1f && scale >= 0) {
        mtx.postScale(scale, scale)
      }
      var scaledBitmap: Bitmap? = null
      try {
        scaledBitmap = Bitmap.createBitmap(bitmap, 0, 0, w, h, mtx, true)
      } catch (e: OutOfMemoryError) {
        print(e.message)
        while (scaledBitmap == null) {
          System.gc()
          System.runFinalization()
          scaledBitmap = Bitmap.createBitmap(bitmap, 0, 0, w, h, mtx, true)
        }
      }
      Log.d(IMAGE_MARKER_TAG, "original width: " + w + " original height: " + h + " scaled width: " + scaledBitmap?.width + " scaled height: " + scaledBitmap?.height)
      return scaledBitmap
    }
  }
}
