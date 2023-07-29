package com.jimmydaddy.imagemarker.base

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.util.Log
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Created by jimmydaddy on 2018/4/8.
 */
class Utils {
  /**
   * read stream from remote
   *
   * @param url
   * @return
   */
  private fun getStreamFromInternet(url: String): InputStream? {
    var connection: HttpURLConnection? = null
    try {
      val mUrl = URL(url)
      connection = mUrl.openConnection() as HttpURLConnection
      connection!!.requestMethod = "GET"
      // 10 秒超时时间
      connection.connectTimeout = 10000
      connection.readTimeout = 10000
      connection.connect()
      val responeseCode = connection.responseCode
      if (responeseCode == 200) {
        return connection.inputStream
      } else {
        Log.d(TAG, "getStreamFromInternet: read stream from remote: $url failed")
      }
    } catch (e: Exception) {
      e.printStackTrace()
    } finally {
      connection?.disconnect()
    }
    return null
  }

  companion object {
    var TAG = "[ImageMarker]"

    /**
     * 获取最大内存使用
     *
     * @return
     */
    val maxMemory: Int
      get() = Runtime.getRuntime().maxMemory().toInt() / 1024

    @JvmStatic
    fun getBlankBitmap(width: Int, height: Int): Bitmap? {
      var icon: Bitmap? = null
      try {
        icon = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
      } catch (e: OutOfMemoryError) {
        print(e.message)
        while (icon == null) {
          System.gc()
          System.runFinalization()
          icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
        }
      }
      return icon
    }

    fun readDegree(path: String?): Int {
      var degree = 0
      try {
        val exifInterface = ExifInterface(path!!)
        val orientation = exifInterface.getAttributeInt(
          ExifInterface.TAG_ORIENTATION,
          ExifInterface.ORIENTATION_NORMAL
        )
        when (orientation) {
          ExifInterface.ORIENTATION_ROTATE_90 -> degree = 90
          ExifInterface.ORIENTATION_ROTATE_180 -> degree = 180
          ExifInterface.ORIENTATION_ROTATE_270 -> degree = 270
        }
      } catch (e: IOException) {
        e.printStackTrace()
      }
      return degree
    }

    fun scaleBitmap(path: String?, scale: Float): Bitmap? {
      val degree = readDegree(path)
      val options = BitmapFactory.Options()
      var prePhoto: Bitmap? = null
      options.inPurgeable = true
      options.inInputShareable = true
      options.inSampleSize = scale.toInt()
      try {
        prePhoto = BitmapFactory.decodeFile(path, options)
      } catch (e: OutOfMemoryError) {
        print(e.message)
        while (prePhoto == null) {
          System.gc()
          System.runFinalization()
          prePhoto = BitmapFactory.decodeFile(path, options)
        }
      }
      //
      if (prePhoto == null) return null
      val w = options.outWidth
      val h = options.outHeight
      val mtx = Matrix()
      mtx.postRotate(degree.toFloat())
      if (scale != 1f && scale >= 0) {
        mtx.postScale(scale, scale)
      }
      var scaledBitmap: Bitmap? = null
      try {
        scaledBitmap = Bitmap.createBitmap(prePhoto, 0, 0, w, h, mtx, true)
      } catch (e: OutOfMemoryError) {
        print(e.message)
        while (scaledBitmap == null) {
          System.gc()
          System.runFinalization()
          scaledBitmap = Bitmap.createBitmap(prePhoto, 0, 0, w, h, mtx, true)
        }
      }
      return scaledBitmap
    }

    @JvmStatic
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
      return scaledBitmap
    }

    fun transRGBColor(color: String?): String? {
      val colorStr = color!!.substring(1)
      if (colorStr.length == 3) {
        var fullColor = ""
        for (i in 0 until colorStr.length) {
          val temp = colorStr.substring(i, i + 1)
          fullColor += temp + temp
        }
        return "#$fullColor"
      }
      if (colorStr.length == 4) {
        val alpha = colorStr.substring(3, 4)
        val hexColor = colorStr.substring(0, 3)
        var fullColor = alpha + alpha
        for (i in 0 until hexColor.length) {
          val temp = colorStr.substring(i, i + 1)
          fullColor += temp + temp
        }
        return "#$fullColor"
      }
      return if (colorStr.length == 8) {
        val alpha = colorStr.substring(6, 8)
        val hexColor = colorStr.substring(0, 6)
        "#$alpha$hexColor"
      } else {
        color
      }
    }

    @JvmStatic
    fun getStringSafe(key: String?, map: Map<String?, Any?>): String? {
      val obj = map[key]
      return obj?.toString()
    }
  }
}
