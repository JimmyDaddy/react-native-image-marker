package com.jimmydaddy.imagemarker

import android.graphics.Bitmap
import android.graphics.Bitmap.CompressFormat
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
import com.jimmydaddy.imagemarker.base.ErrorCode
import com.jimmydaddy.imagemarker.base.InvisibleWatermarkOptions
import com.jimmydaddy.imagemarker.base.MarkImageOptions
import com.jimmydaddy.imagemarker.base.MarkTextOptions
import com.jimmydaddy.imagemarker.base.MarkWatermarkOptions
import com.jimmydaddy.imagemarker.base.MarkerError
import com.jimmydaddy.imagemarker.base.Options
import com.jimmydaddy.imagemarker.base.OutputFileName
import com.jimmydaddy.imagemarker.base.SaveFormat
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Created by jimmydaddy on 2017/3/6.
 */
class ImageMarkerManager(private val context: ReactApplicationContext) : NativeImageMarkerSpec(
  context
) {
  private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private val markerJobLimiter = MarkerJobLimiter(parallelism = 1)
  private val markerJobs = ConcurrentHashMap<String, kotlinx.coroutines.Job>()

  override fun invalidate() {
    markerJobs.values.forEach { it.cancel() }
    markerJobs.clear()
    moduleScope.cancel()
    super.invalidate()
  }

  private fun getSaveFormat(saveFormat: SaveFormat?): CompressFormat {
    return when (saveFormat) {
      SaveFormat.PNG -> CompressFormat.PNG
      SaveFormat.WEBP ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          CompressFormat.WEBP_LOSSY
        } else {
          @Suppress("DEPRECATION")
          CompressFormat.WEBP
        }
      else -> CompressFormat.JPEG
    }
  }

  private fun launchMarkerJob(
    jobId: String,
    promise: Promise,
    block: suspend () -> String
  ) {
    val job = moduleScope.launch(start = CoroutineStart.LAZY) {
      try {
        promise.resolve(markerJobLimiter.run(block))
      } catch (e: CancellationException) {
        Log.d(IMAGE_MARKER_TAG, "marker job cancelled")
        promise.reject("ABORTED", "Image marker operation was aborted", e)
      } catch (error: OutOfMemoryError) {
        val markerError = MarkerError(
          ErrorCode.RENDER_FAILED,
          "Unable to complete marker image"
        ).apply { initCause(error) }
        Log.d(IMAGE_MARKER_TAG, "error: " + markerError.message)
        promise.rejectMarkerError(markerError)
      } catch (e: Exception) {
        Log.d(IMAGE_MARKER_TAG, "error: " + e.message)
        promise.rejectMarkerError(e)
      } finally {
        markerJobs.remove(jobId)
      }
    }
    markerJobs[jobId] = job
    job.start()
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
    return withContext(Dispatchers.Default) {
      OwnedResourcePipeline.run(
        inputs = listOf(bg).plus(markers),
        releaseInput = ::recycleBitmap,
        render = {
          ImageMarkerRenderer.renderImageWatermarks(
            bg,
            markers,
            opts,
            recycleMarkerBitmaps = false
          )
        },
        // The renderer owns a distinct output bitmap. Inputs are released before encoding,
        // which is often the second-largest memory peak in the pipeline.
        encode = { icon -> writeResult(icon, dest, opts) },
        releaseOutput = ::recycleBitmap
      )
    }
  }

  private suspend fun markImageByText(
    bg: Bitmap,
    dest: String,
    opts: MarkTextOptions
  ): String {
    return withContext(Dispatchers.Default) {
      OwnedResourcePipeline.run(
        inputs = listOf(bg),
        releaseInput = ::recycleBitmap,
        render = {
          ImageMarkerRenderer.renderTextWatermarks(bg, opts, reactApplicationContext)
        },
        encode = { icon -> writeResult(icon, dest, opts) },
        releaseOutput = ::recycleBitmap
      )
    }
  }

  private suspend fun markImageByWatermarks(
    bg: Bitmap,
    markers: List<Bitmap>,
    dest: String,
    opts: MarkWatermarkOptions
  ): String {
    return withContext(Dispatchers.Default) {
      OwnedResourcePipeline.run(
        inputs = listOf(bg).plus(markers),
        releaseInput = ::recycleBitmap,
        render = {
          ImageMarkerRenderer.renderWatermarks(
            bg,
            markers,
            opts,
            context,
            recycleMarkerBitmaps = false
          )
        },
        encode = { icon -> writeResult(icon, dest, opts) },
        releaseOutput = ::recycleBitmap
      )
    }
  }

  private suspend fun embedInvisibleWatermark(
    bg: Bitmap,
    dest: String,
    opts: InvisibleWatermarkOptions
  ): String {
    return withContext(Dispatchers.Default) {
      OwnedResourcePipeline.run(
        inputs = listOf(bg),
        releaseInput = ::recycleBitmap,
        render = {
          InvisibleWatermark.embed(
            bg,
            opts.requirePayload(),
            opts.key,
            opts.strength
          )
        },
        encode = { output -> writeResult(output, dest, opts) },
        releaseOutput = ::recycleBitmap
      )
    }
  }

  private suspend fun writeResult(
    icon: Bitmap,
    dest: String,
    opts: Options
  ): String = withContext(Dispatchers.IO) {
    try {
      if (dest == BASE64) {
        return@withContext encodeBase64(icon, opts)
      }

      AtomicFileWriter.write(File(dest)) { stream ->
        if (!icon.compress(getSaveFormat(opts.saveFormat), opts.quality, stream)) {
          throw IOException("Failed to encode marker image")
        }
      }
      dest
    } catch (error: OutOfMemoryError) {
      throw encodingOutOfMemory(error)
    }
  }

  private fun encodeBase64(
    icon: Bitmap,
    opts: Options
  ): String {
    try {
      val bitmapBytes = ByteArrayOutputStream().use { stream ->
        if (!icon.compress(CompressFormat.PNG, opts.quality, stream)) {
          throw IOException("Failed to encode marker image")
        }
        stream.flush()
        stream.toByteArray()
      }
      val result = Base64.encodeToString(bitmapBytes, Base64.DEFAULT)
      return "data:image/png;base64,$result"
    } catch (error: OutOfMemoryError) {
      throw encodingOutOfMemory(error)
    }
  }

  private fun encodingOutOfMemory(error: OutOfMemoryError): MarkerError {
    return MarkerError(
      ErrorCode.RENDER_FAILED,
      "Unable to encode marker image"
    ).apply { initCause(error) }
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
  override fun embedInvisible(
    options: ReadableMap,
    promise: Promise
  ) {
    val opts = InvisibleWatermarkOptions.checkEmbed(options, promise) ?: return
    launchMarkerJob(opts.jobId, promise) {
      val bitmaps = MarkerImageLoader(context, opts.maxSize).loadImages(
        listOf(opts.backgroundImage)
      )
      try {
        val dest = generateCacheFilePathForMarker(opts.filename, opts.saveFormat)
        embedInvisibleWatermark(bitmaps[0], dest, opts)
      } finally {
        recycleBitmaps(bitmaps)
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.N)
  @ReactMethod
  override fun detectInvisible(
    options: ReadableMap,
    promise: Promise
  ) {
    val opts = InvisibleWatermarkOptions.checkDetect(options, promise) ?: return
    launchMarkerJob(opts.jobId, promise) {
      val bitmaps = MarkerImageLoader(context, opts.maxSize).loadImages(
        listOf(opts.backgroundImage)
      )
      try {
        withContext(Dispatchers.Default) {
          InvisibleWatermark.detect(
            bitmaps[0],
            opts.key,
            opts.strength,
            opts.search
          ).toJson()
        }
      } finally {
        recycleBitmaps(bitmaps)
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.N)
  @ReactMethod
  override fun markWithText(
    options: ReadableMap,
    promise: Promise
  ) {
    val markOpts = MarkTextOptions.checkParams(options, promise) ?: return
    Log.d(IMAGE_MARKER_TAG, "uri: " + markOpts.backgroundImage.uri)
    Log.d(IMAGE_MARKER_TAG, "src: " + markOpts.backgroundImage.src.toString())
    launchMarkerJob(markOpts.jobId, promise) {
      val bitmaps = MarkerImageLoader(context, markOpts.maxSize).loadImages(
        listOf(
          markOpts.backgroundImage,
        )
      )
      try {
        val bg = bitmaps[0]
        val dest = generateCacheFilePathForMarker(markOpts.filename, markOpts.saveFormat)
        markImageByText(bg, dest, markOpts)
      } finally {
        recycleBitmaps(bitmaps)
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.N)
  @ReactMethod
  override fun markWithImage(
    options: ReadableMap,
    promise: Promise
  ) {
    val markOpts = MarkImageOptions.checkParams(options, promise) ?: return
    launchMarkerJob(markOpts.jobId, promise) {
      val markers = markOpts.watermarkImages.map { it.imageOption }
      val concatenatedArray = listOf(
        markOpts.backgroundImage,
      ).plus(markers)
      val bitmaps = MarkerImageLoader(context, markOpts.maxSize).loadImages(
        concatenatedArray,
        listOf(true).plus(List(markers.size) { false })
      )
      try {
        val bg = bitmaps[0]
        val markerBitmaps = bitmaps.drop(1)
        val dest = generateCacheFilePathForMarker(markOpts.filename, markOpts.saveFormat)
        markImageByBitmap(bg, markerBitmaps, dest, markOpts)
      } finally {
        recycleBitmaps(bitmaps)
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.N)
  @ReactMethod
  override fun markWithWatermarks(
    options: ReadableMap,
    promise: Promise
  ) {
    val markOpts = MarkWatermarkOptions.checkParams(options, promise) ?: return
    launchMarkerJob(markOpts.jobId, promise) {
      val markers = markOpts.imageLayers.map { it.imageOptions.imageOption }
      val concatenatedArray = listOf(
        markOpts.backgroundImage,
      ).plus(markers)
      val bitmaps = MarkerImageLoader(context, markOpts.maxSize).loadImages(
        concatenatedArray,
        listOf(true).plus(List(markers.size) { false })
      )
      try {
        val bg = bitmaps[0]
        val markerBitmaps = bitmaps.drop(1)
        val dest = generateCacheFilePathForMarker(markOpts.filename, markOpts.saveFormat)
        markImageByWatermarks(bg, markerBitmaps, dest, markOpts)
      } finally {
        recycleBitmaps(bitmaps)
      }
    }
  }

  @ReactMethod
  override fun cancel(
    jobId: String,
    promise: Promise
  ) {
    val job = markerJobs.remove(jobId)
    if (job == null) {
      promise.resolve(false)
      return
    }
    job.cancel(CancellationException("Image marker job $jobId was cancelled"))
    promise.resolve(true)
  }

  private fun generateCacheFilePathForMarker(
    filename: String?,
    saveFormat: SaveFormat?
  ): String {
    val cacheDir = this.reactApplicationContext.cacheDir.absolutePath
    if (saveFormat != null && saveFormat === SaveFormat.BASE64) {
      return BASE64
    }
    val generatedName = UUID.randomUUID().toString() + "_image_marker"
    val outputFileName = OutputFileName.resolve(filename, saveFormat, generatedName)
    return "$cacheDir/$outputFileName"
  }

  companion object {
    const val NAME = "ImageMarker"
  }
}
