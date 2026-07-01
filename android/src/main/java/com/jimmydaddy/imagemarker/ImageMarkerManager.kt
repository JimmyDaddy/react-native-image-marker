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
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.base.Constants.BASE64
import com.jimmydaddy.imagemarker.base.Constants.IMAGE_MARKER_TAG
import com.jimmydaddy.imagemarker.base.MarkImageOptions
import com.jimmydaddy.imagemarker.base.MarkTextOptions
import com.jimmydaddy.imagemarker.base.MarkWatermarkOptions
import com.jimmydaddy.imagemarker.base.MarkerError
import com.jimmydaddy.imagemarker.base.Options
import com.jimmydaddy.imagemarker.base.SaveFormat
import com.jimmydaddy.imagemarker.base.Utils.Companion.getBlankBitmap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID

/**
 * Created by jimmydaddy on 2017/3/6.
 */
class ImageMarkerManager(private val context: ReactApplicationContext) : NativeImageMarkerSpec(
  context
) {
  private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

  override fun invalidate() {
    moduleScope.cancel()
    super.invalidate()
  }

  private fun getSaveFormat(saveFormat: SaveFormat?): CompressFormat {
    return if (saveFormat == SaveFormat.PNG) CompressFormat.PNG else CompressFormat.JPEG
  }

  private fun launchMarkerJob(
    promise: Promise,
    block: suspend () -> String
  ) {
    moduleScope.launch {
      try {
        promise.resolve(block())
      } catch (e: CancellationException) {
        Log.d(IMAGE_MARKER_TAG, "marker job cancelled")
      } catch (e: Exception) {
        Log.d(IMAGE_MARKER_TAG, "error: " + e.message)
        promise.rejectMarkerError(e)
      }
    }
  }

  private fun Promise.rejectMarkerError(error: Exception) {
    error.printStackTrace()
    if (error is MarkerError) {
      reject(error.getErrorCode(), error.getErrMsg(), error)
    } else {
      reject("error", error.message, error)
    }
  }

  private suspend fun markImageByBitmap(
    bg: Bitmap,
    markers: List<Bitmap>,
    dest: String,
    opts: MarkImageOptions
  ): String {
    var icon: Bitmap? = null
    try {
      icon = withContext(Dispatchers.Default) {
        ImageMarkerRenderer.renderImageWatermarks(
          bg,
          markers,
          opts,
          recycleMarkerBitmaps = false
        )
      }
      return writeResult(icon, dest, opts)
    } finally {
      recycleBitmap(icon)
      recycleBitmap(bg)
      recycleBitmaps(markers)
    }
  }

  private suspend fun markImageByText(
    bg: Bitmap,
    dest: String,
    opts: MarkTextOptions
  ): String {
    var icon: Bitmap? = null
    try {
      icon = withContext(Dispatchers.Default) {
        renderTextWatermarks(bg, opts)
      }
      return writeResult(icon, dest, opts)
    } finally {
      recycleBitmap(icon)
      recycleBitmap(bg)
    }
  }

  private fun renderTextWatermarks(
    bg: Bitmap,
    opts: MarkTextOptions
  ): Bitmap {
    var icon: Bitmap? = null
    try {
      val height = bg.height
      val width = bg.width
      icon = getBlankBitmap(width, height)
        ?: throw IllegalStateException("Failed to create output bitmap")
      val canvas = Canvas(icon)
      canvas.save()
      canvas.drawBitmap(bg, 0f, 0f, opts.backgroundImage.applyStyle())
      canvas.restore()

      for (text in opts.watermarkTexts) {
        text.applyStyle(this.reactApplicationContext, canvas, width, height)
      }

      if (opts.backgroundImage.rotate != 0f) {
        val rotatedIcon = ImageProcess.rotate(icon, opts.backgroundImage.rotate)
        recycleBitmap(icon)
        icon = rotatedIcon
      }

      return icon
    } catch (e: Exception) {
      recycleBitmap(icon)
      throw e
    }
  }

  private suspend fun markImageByWatermarks(
    bg: Bitmap,
    markers: List<Bitmap>,
    dest: String,
    opts: MarkWatermarkOptions
  ): String {
    var icon: Bitmap? = null
    try {
      icon = withContext(Dispatchers.Default) {
        ImageMarkerRenderer.renderWatermarks(
          bg,
          markers,
          opts,
          context,
          recycleMarkerBitmaps = false
        )
      }
      return writeResult(icon, dest, opts)
    } finally {
      recycleBitmap(icon)
      recycleBitmap(bg)
      recycleBitmaps(markers)
    }
  }

  private suspend fun writeResult(
    icon: Bitmap,
    dest: String,
    opts: Options
  ): String = withContext(Dispatchers.IO) {
    if (dest == BASE64) {
      return@withContext encodeBase64(icon, opts)
    }

    BufferedOutputStream(FileOutputStream(dest)).use { stream ->
      if (!icon.compress(getSaveFormat(opts.saveFormat), opts.quality, stream)) {
        throw IOException("Failed to encode marker image")
      }
      stream.flush()
    }
    dest
  }

  private fun encodeBase64(
    icon: Bitmap,
    opts: Options
  ): String {
    val bitmapBytes = ByteArrayOutputStream().use { stream ->
      if (!icon.compress(CompressFormat.PNG, opts.quality, stream)) {
        throw IOException("Failed to encode marker image")
      }
      stream.flush()
      stream.toByteArray()
    }
    val result = Base64.encodeToString(bitmapBytes, Base64.DEFAULT)
    return "data:image/png;base64,$result"
  }

  private fun recycleBitmaps(bitmaps: List<Bitmap>) {
    for (bitmap in bitmaps) {
      recycleBitmap(bitmap)
    }
  }

  private fun recycleBitmap(bitmap: Bitmap?) {
    if (bitmap != null && !bitmap.isRecycled) {
      bitmap.recycle()
    }
  }

  /**
   * @param opts
   * @param promise
   */
  @RequiresApi(Build.VERSION_CODES.N)
  @ReactMethod
  override fun markWithText(
    options: ReadableMap,
    promise: Promise
  ) {
    val markOpts = MarkTextOptions.checkParams(options, promise) ?: return
    Log.d(IMAGE_MARKER_TAG, "uri: " + markOpts.backgroundImage.uri)
    Log.d(IMAGE_MARKER_TAG, "src: " + markOpts.backgroundImage.src.toString())
    launchMarkerJob(promise) {
      val bitmaps = MarkerImageLoader(context, markOpts.maxSize).loadImages(
        listOf(
          markOpts.backgroundImage,
        )
      )
      val bg = bitmaps[0]
      val dest = generateCacheFilePathForMarker(markOpts.filename, markOpts.saveFormat)
      markImageByText(bg, dest, markOpts)
    }
  }

  @RequiresApi(Build.VERSION_CODES.N)
  @ReactMethod
  override fun markWithImage(
    options: ReadableMap,
    promise: Promise
  ) {
    val markOpts = MarkImageOptions.checkParams(options, promise) ?: return
    launchMarkerJob(promise) {
      val markers = markOpts.watermarkImages.map { it.imageOption }
      val concatenatedArray = listOf(
        markOpts.backgroundImage,
      ).plus(markers)
      val bitmaps = MarkerImageLoader(context, markOpts.maxSize).loadImages(
        concatenatedArray,
        listOf(true).plus(List(markers.size) { false })
      )
      val bg = bitmaps[0]
      val markerBitmaps = bitmaps.drop(1)
      val dest = generateCacheFilePathForMarker(markOpts.filename, markOpts.saveFormat)
      markImageByBitmap(bg, markerBitmaps, dest, markOpts)
    }
  }

  @RequiresApi(Build.VERSION_CODES.N)
  @ReactMethod
  override fun markWithWatermarks(
    options: ReadableMap,
    promise: Promise
  ) {
    val markOpts = MarkWatermarkOptions.checkParams(options, promise) ?: return
    launchMarkerJob(promise) {
      val markers = markOpts.imageLayers.map { it.imageOptions.imageOption }
      val concatenatedArray = listOf(
        markOpts.backgroundImage,
      ).plus(markers)
      val bitmaps = MarkerImageLoader(context, markOpts.maxSize).loadImages(
        concatenatedArray,
        listOf(true).plus(List(markers.size) { false })
      )
      val bg = bitmaps[0]
      val markerBitmaps = bitmaps.drop(1)
      val dest = generateCacheFilePathForMarker(markOpts.filename, markOpts.saveFormat)
      markImageByWatermarks(bg, markerBitmaps, dest, markOpts)
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
      val name = UUID.randomUUID().toString() + "_image_marker"
      "$cacheDir/$name$ext"
    }
  }

  companion object {
    const val NAME = "ImageMarker"
  }
}
