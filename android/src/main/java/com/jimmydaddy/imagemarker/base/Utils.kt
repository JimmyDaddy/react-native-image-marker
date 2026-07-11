package com.jimmydaddy.imagemarker.base

import android.graphics.Bitmap
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableType

/**
 * Created by jimmydaddy on 2018/4/8.
 */
class Utils {

  companion object {
    var TAG = "[ImageMarker]"

    @JvmStatic
    fun getBlankBitmap(width: Int, height: Int): Bitmap {
      return allocateOrThrow("${width}x$height output bitmap") {
        Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
      }
    }

    internal inline fun <T> allocateOrThrow(description: String, allocator: () -> T): T {
      return try {
        allocator()
      } catch (error: OutOfMemoryError) {
        throw MarkerError(
          ErrorCode.RENDER_FAILED,
          "Unable to allocate $description"
        )
      }
    }

    fun transRGBColor(color: String?): String {
      if (color == null || !color.startsWith("#")) {
        return color ?: ""
      }
      val colorStr = color.substring(1)
      if (colorStr.length == 3) {
        var fullColor = ""
        for (i in colorStr.indices) {
          val temp = colorStr.substring(i, i + 1)
          fullColor += temp + temp
        }
        return "#$fullColor"
      }
      if (colorStr.length == 4) {
        val alpha = colorStr.substring(3, 4)
        val hexColor = colorStr.substring(0, 3)
        var fullColor = alpha + alpha
        for (i in hexColor.indices) {
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

    fun checkSpreadValue(str: String?, maxLength: Int = 1): Boolean {
      if (str == null) return false
      val pattern = """^((\d+|\d+%)\s?){1,$maxLength}$""".toRegex()
      return pattern.containsMatchIn(str)
    }

    fun parseSpreadValue(v: String?, relativeTo: Float): Float {
      if (v == null) return 0f
      return if (v.endsWith("%")) {
        val percent = v.dropLast(1).toFloatOrNull()?.div(100) ?: 0f
        relativeTo * percent
      } else {
        v.toFloatOrNull() ?: 0f
      }
    }

    fun handleDynamicToString(d: Dynamic?): String {
        return if (d == null) {
            "0"
        } else {
            when (d.type) {
                ReadableType.String -> d.asString() ?: "0"
                ReadableType.Number -> d.asDouble().toString()
                else -> "0"
            }
        }
    }
  }

}
