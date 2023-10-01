package com.jimmydaddy.imagemarker

import android.graphics.Bitmap
import android.graphics.Bitmap.CompressFormat
import android.graphics.Canvas
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.base.Constants.BASE64
import com.jimmydaddy.imagemarker.base.Constants.IMAGE_MARKER_TAG
import com.jimmydaddy.imagemarker.base.MarkImageOptions
import com.jimmydaddy.imagemarker.base.MarkTextOptions
import com.jimmydaddy.imagemarker.base.Position.Companion.getImageRectFromPosition
import com.jimmydaddy.imagemarker.base.SaveFormat
import com.jimmydaddy.imagemarker.base.Utils
import com.jimmydaddy.imagemarker.base.Utils.Companion.getBlankBitmap
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID

/**
 * Created by jimmydaddy on 2017/3/6.
 */
class ImageMarkerManager(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(
  context
) {
  override fun getName(): String {
    return NAME
  }

  private fun getSaveFormat(saveFormat: SaveFormat?): CompressFormat {
    return if (saveFormat != null && saveFormat === SaveFormat.PNG) CompressFormat.PNG else CompressFormat.JPEG
  }

  private fun markImageByBitmap(
    bg: Bitmap?,
    markers: List<Bitmap?>,
    dest: String,
    opts: MarkImageOptions,
    promise: Promise
  ) {
    var bos: BufferedOutputStream? = null
    var icon: Bitmap? = null
    try {

      // 原图生成 - start
      val height = bg!!.height
      val width = bg.width
      icon = getBlankBitmap(width, height)
      val canvas = Canvas(icon!!)
      canvas.save()
      canvas.drawBitmap(bg, 0f, 0f, opts.backgroundImage.applyStyle())
      canvas.restore()
      // 原图生成 - end
      for (i in opts.watermarkImages.indices) {
        canvas.save()
        val markOpts = opts.watermarkImages[i]
        var markerBitmap = markers[i]
        if (markOpts.imageOption.rotate != 0f) {
          markerBitmap = ImageProcess.rotate(markerBitmap!!, markOpts.imageOption.rotate)
        }
        if (markOpts.positionEnum != null) {
          val pos = getImageRectFromPosition(
            markOpts.positionEnum,
            markerBitmap!!.width,
            markerBitmap.height,
            width,
            height
          )
          canvas.drawBitmap(markerBitmap, pos.x, pos.y, markOpts.imageOption.applyStyle())
        } else {
          canvas.drawBitmap(
            markerBitmap!!,
            Utils.parseSpreadValue(markOpts.x, width.toFloat()),
            Utils.parseSpreadValue(markOpts.y, height.toFloat()),
            markOpts.imageOption.applyStyle()
          )
        }
        canvas.restore()

        if (!markerBitmap.isRecycled) {
          markerBitmap.recycle()
          System.gc()
        }
      }

      // 保存
      // canvas.save(Canvas.ALL_SAVE_FLAG);
      if (!bg.isRecycled) {
        bg.recycle()
        System.gc()
      }

      if (opts.backgroundImage.rotate != 0f) {
        icon = ImageProcess.rotate(icon, opts.backgroundImage.rotate)
      }
      // export base64
      if (dest == BASE64) {
        val base64Stream = ByteArrayOutputStream()
        icon.compress(CompressFormat.PNG, opts.quality, base64Stream)
        base64Stream.flush()
        base64Stream.close()
        val bitmapBytes = base64Stream.toByteArray()
        val result = Base64.encodeToString(bitmapBytes, Base64.DEFAULT)
        promise.resolve("data:image/png;base64,$result")
      } else {
        bos = BufferedOutputStream(FileOutputStream(dest))
        icon.compress(getSaveFormat(opts.saveFormat), opts.quality, bos)
        bos.flush()
        bos.close()
        //保存成功的
        promise.resolve(dest)
      }
    } catch (e: Exception) {
      e.printStackTrace()
      promise.reject("error", e.message, e)
    } finally {
      if (bos != null) {
        try {
          bos.close()
        } catch (e: IOException) {
          e.printStackTrace()
        }
      }
      if (icon != null && !icon.isRecycled) {
        icon.recycle()
        System.gc()
      }
    }
  }

  /**
   * @param bg
   * @param dest
   * @param opts
   * @param promise
   */
  private fun markImageByText(
    bg: Bitmap?,
    dest: String,
    opts: MarkTextOptions,
    promise: Promise
  ) {
    var bos: BufferedOutputStream? = null
//        val isFinished: Boolean
    var icon: Bitmap? = null
    try {
      val height = bg!!.height
      val width = bg.width
      icon = getBlankBitmap(width, height)
      //初始化画布 绘制的图像到icon上
      val canvas = Canvas(icon!!)
      canvas.save()
      canvas.drawBitmap(bg, 0f, 0f, opts.backgroundImage.applyStyle())
      canvas.restore()
      if (!bg.isRecycled) {
        bg.recycle()
        System.gc()
      }
      for (text in opts.watermarkTexts) {
        //建立画笔
        text!!.applyStyle(this.reactApplicationContext, canvas, width, height)
      }

      if (opts.backgroundImage.rotate != 0f) {
        icon = ImageProcess.rotate(icon, opts.backgroundImage.rotate)
      }
      if (dest == BASE64) {
        val base64Stream = ByteArrayOutputStream()
        icon.compress(CompressFormat.PNG, opts.quality, base64Stream)
        base64Stream.flush()
        base64Stream.close()
        val bitmapBytes = base64Stream.toByteArray()
        val result = Base64.encodeToString(bitmapBytes, Base64.DEFAULT)
        promise.resolve("data:image/png;base64,$result")
      } else {
        bos = BufferedOutputStream(FileOutputStream(dest))
        icon.compress(getSaveFormat(opts.saveFormat), opts.quality, bos)
        bos.flush()
        bos.close()
        //保存成功的
        promise.resolve(dest)
      }
    } catch (e: Exception) {
      e.printStackTrace()
      promise.reject("error", e.message, e)
    } finally {
//            isFinished = true
      if (bos != null) {
        try {
          bos.close()
        } catch (e: IOException) {
          e.printStackTrace()
        }
      }
      if (icon != null && !icon.isRecycled) {
        icon.recycle()
        System.gc()
      }
    }
  }

  /**
   * @param opts
   * @param promise
   */
  @OptIn(DelicateCoroutinesApi::class)
  @RequiresApi(Build.VERSION_CODES.N)
  @ReactMethod
  fun markWithText(
    opts: ReadableMap?,
    promise: Promise
  ) {
    val markOpts = MarkTextOptions.checkParams(opts!!, promise) ?: return
    Log.d(IMAGE_MARKER_TAG, "uri: " + markOpts.backgroundImage.uri)
    Log.d(IMAGE_MARKER_TAG, "src: " + markOpts.backgroundImage.src.toString())
    GlobalScope.launch(Dispatchers.Main) {
      try {
        val bitmaps = ImageLoader(context, markOpts.maxSize).loadImages(
          listOf(
            markOpts.backgroundImage,
          )
        )
        val bg = bitmaps[0]
        val dest = generateCacheFilePathForMarker(markOpts.filename, markOpts.saveFormat)
        markImageByText(bg, dest, markOpts, promise)
      } catch (e: Exception) {
        Log.d(IMAGE_MARKER_TAG, "error：" + e.message)
        e.printStackTrace()
        promise.reject("error", e.message, e)
      }
    }
  }

  @OptIn(DelicateCoroutinesApi::class)
  @RequiresApi(Build.VERSION_CODES.N)
  @ReactMethod
  fun markWithImage(
    opts: ReadableMap?,
    promise: Promise
  ) {
    val markOpts = MarkImageOptions.checkParams(opts!!, promise) ?: return
    GlobalScope.launch(Dispatchers.Main) {
      try {
        val markers = markOpts.watermarkImages.map { it.imageOption }
        val concatenatedArray = listOf(
          markOpts.backgroundImage,
        ).plus(markers)
        val bitmaps = ImageLoader(context, markOpts.maxSize).loadImages(
          concatenatedArray
        )
        val bg = bitmaps[0]
        val markerBitmaps = bitmaps.subList(1, bitmaps.lastIndex + 1)
        val dest = generateCacheFilePathForMarker(markOpts.filename, markOpts.saveFormat)
        markImageByBitmap(bg, markerBitmaps, dest, markOpts, promise)
      } catch (e: Exception) {
        Log.d(IMAGE_MARKER_TAG, "error：" + e.message)
        e.printStackTrace()
        promise.reject("error", e.message, e)
      }
    }
  }

  private fun generateCacheFilePathForMarker(
    filename: String?,
    saveFormat: SaveFormat?
  ): String {
    val cacheDir = this.reactApplicationContext.cacheDir.absolutePath
    if (saveFormat != null && saveFormat === SaveFormat.BASE64) {
      return BASE64
    }
    val ext =
      if (saveFormat != null && (saveFormat === SaveFormat.PNG)) ".png" else ".jpg"
    return if (null != filename) {
      if (filename.endsWith(".jpg") || filename.endsWith(".png")) "$cacheDir/$filename" else "$cacheDir/$filename$ext"
    } else {
      val name = UUID.randomUUID().toString() + "image marker"
      "$cacheDir/$name$ext"
    }
  }

  companion object {
    const val NAME = "ImageMarker"
  }
}
