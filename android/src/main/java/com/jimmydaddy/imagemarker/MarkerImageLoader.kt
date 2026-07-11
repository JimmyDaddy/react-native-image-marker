package com.jimmydaddy.imagemarker

import android.annotation.SuppressLint
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.os.Build.VERSION.SDK_INT
import android.util.Base64
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.graphics.drawable.toBitmap
import androidx.exifinterface.media.ExifInterface
import coil.ImageLoader
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.decode.SvgDecoder
import coil.request.CachePolicy
import coil.request.ImageRequest
import coil.request.SuccessResult
import coil.size.Scale
import com.facebook.react.bridge.ReactApplicationContext
import com.jimmydaddy.imagemarker.base.Constants.IMAGE_MARKER_TAG
import com.jimmydaddy.imagemarker.base.ErrorCode
import com.jimmydaddy.imagemarker.base.ImageOptions
import com.jimmydaddy.imagemarker.base.MarkerError
import com.jimmydaddy.imagemarker.base.Utils
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import java.io.ByteArrayInputStream

class MarkerImageLoader(private val context: ReactApplicationContext, private val maxSize: Int) {

  init {
    if (maxSize <= 0) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "maxSize must be greater than zero")
    }
  }

  private var imageLoader: ImageLoader = ImageLoader.Builder(context)
    .components {
      if (SDK_INT >= 28) {
        add(ImageDecoderDecoder.Factory())
      } else {
        add(GifDecoder.Factory())
      }
      add(SvgDecoder.Factory())
    }
    .allowHardware(false)
    .build()
  private val resources: Resources
    get() = context.resources

  @RequiresApi(Build.VERSION_CODES.N)
  suspend fun loadImages(
    images: List<ImageOptions>,
    scaleImages: List<Boolean> = List(images.size) { true }
  ): List<Bitmap> {
    // Decode sequentially. All decoded bitmaps must remain resident until composition, so
    // concurrent decoding only increases the peak through overlapping decoder intermediates.
    val loaded = ArrayList<Bitmap>(images.size)
    try {
      withContext(Dispatchers.IO) {
        for ((index, img) in images.withIndex()) {
          currentCoroutineContext().ensureActive()
          val scale = if (scaleImages.getOrElse(index) { true }) img.scale else 1f
          val isCoilImg = hasUriScheme(img.uri)
          Log.d(IMAGE_MARKER_TAG, "isCoilImg: $isCoilImg")

          val bitmap = when {
            isBase64String(img.uri) -> loadBase64Image(img, scale)
            isCoilImg -> loadCoilImage(img, scale)
            else -> loadResourceImage(img, scale)
          }
          loaded.add(bitmap)
          currentCoroutineContext().ensureActive()
        }
      }
      return loaded
    } catch (error: CancellationException) {
      recycleBitmaps(loaded)
      throw error
    } catch (error: OutOfMemoryError) {
      recycleBitmaps(loaded)
      throw MarkerError(
        ErrorCode.RENDER_FAILED,
        "Unable to decode marker images"
      ).apply { initCause(error) }
    } catch (error: Exception) {
      recycleBitmaps(loaded)
      Log.e("ImageLoader", "Failed to load marker images", error)
      throw error
    } finally {
      imageLoader.shutdown()
    }
  }

  private fun hasUriScheme(uri: String?): Boolean {
    return !uri.isNullOrBlank() && Uri.parse(uri).scheme != null
  }

  @SuppressLint("DiscouragedApi")
  private fun getDrawableResourceByName(name: String?): Int {
    val drawable = resources.getIdentifier(
      name,
      "drawable",
      context.packageName
    )
    return if (drawable != 0) {
      drawable
    } else {
      resources.getIdentifier(name, "mipmap", context.packageName)
    }
  }


  private fun isBase64String(s: String?): Boolean {
    if (s == null) return false
    return s.startsWith("data:image/") && s.contains(";base64,")
  }

  private fun loadBase64Image(img: ImageOptions, scale: Float): Bitmap {
    Log.d(IMAGE_MARKER_TAG, "Loading Base64 Image")
    var ownedBitmap: Bitmap? = decodeBase64ToBitmap(img)
    try {
      ownedBitmap = resizeToPreScaleTarget(checkNotNull(ownedBitmap), img)
      ownedBitmap = scaleBitmap(checkNotNull(ownedBitmap), scale)
      return ownedBitmap.also { ownedBitmap = null }
    } finally {
      recycleBitmap(ownedBitmap)
    }
  }

  private suspend fun loadCoilImage(img: ImageOptions, scale: Float): Bitmap {
    var ownedBitmap: Bitmap? = null
    try {
      var request = ImageRequest.Builder(context)
        .data(img.uri)
        // The returned bitmap is explicitly recycled after rendering. Keep it out of Coil's
        // memory cache so that recycling cannot invalidate a shared cached drawable.
        .memoryCachePolicy(CachePolicy.DISABLED)
      val requestedSize = if (img.src.width > 0 && img.src.height > 0) {
        ImageSizeLimiter.fit(img.src.width, img.src.height, maxSize)
      } else {
        ImagePixelSize(maxSize, maxSize)
      }
      request = request
        .size(requestedSize.width, requestedSize.height)
        .scale(Scale.FIT)
      if (img.src.width > 0 && img.src.height > 0) {
        Log.d(IMAGE_MARKER_TAG, "src.width: " + img.src.width + " src.height: " + img.src.height)
      }

      Log.d(IMAGE_MARKER_TAG, "start to load image: " + img.uri)
      val result = imageLoader.execute(request.build())
      if (result !is SuccessResult) {
        throw MarkerError(
          ErrorCode.LOAD_IMAGE_FAILED,
          "Can't retrieve the file from the src: " + img.uri
        )
      }

      ownedBitmap = Utils.allocateOrThrow("loaded image bitmap") {
        result.drawable.toBitmap()
      }
      ownedBitmap = resizeToPreScaleTarget(checkNotNull(ownedBitmap), img)
      ownedBitmap = scaleBitmap(ownedBitmap, scale)
      currentCoroutineContext().ensureActive()
      return ownedBitmap.also { ownedBitmap = null }
    } catch (error: OutOfMemoryError) {
      throw MarkerError(
        ErrorCode.RENDER_FAILED,
        "Unable to decode image: ${img.uri}"
      ).apply { initCause(error) }
    } finally {
      recycleBitmap(ownedBitmap)
    }
  }

  private fun loadResourceImage(img: ImageOptions, scale: Float): Bitmap {
    val resId = getDrawableResourceByName(img.uri)
    Log.d(IMAGE_MARKER_TAG, "resId: $resId")
    if (resId == 0) {
      Log.d(IMAGE_MARKER_TAG, "cannot find res")
      throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Can't get resource by the path: ${img.uri}")
    }

    Log.d(IMAGE_MARKER_TAG, "src.width: " + img.src.width + " src.height: " + img.src.height)
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeResource(resources, resId, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
      throw MarkerError(
        ErrorCode.GET_RESOURCE_FAILED,
        "Can't decode resource bounds by the path: ${img.uri}"
      )
    }
    val decodeTarget = preScaleTarget(img, bounds.outWidth, bounds.outHeight)
    val decodeOptions = BitmapFactory.Options().apply {
      inSampleSize = calculateInSampleSize(
        bounds.outWidth,
        bounds.outHeight,
        decodeTarget.width,
        decodeTarget.height,
        swapDimensions = false
      )
    }
    var ownedBitmap: Bitmap? = Utils.allocateOrThrow("decoded resource bitmap") {
      BitmapFactory.decodeResource(resources, resId, decodeOptions)
    } ?: throw MarkerError(
      ErrorCode.GET_RESOURCE_FAILED,
      "Can't decode resource by the path: ${img.uri}"
    )
    try {
      ownedBitmap = resizeToPreScaleTarget(checkNotNull(ownedBitmap), img)
      ownedBitmap = scaleBitmap(checkNotNull(ownedBitmap), scale)
      return ownedBitmap.also { ownedBitmap = null }
    } finally {
      recycleBitmap(ownedBitmap)
    }
  }

  private fun scaleBitmap(bitmap: Bitmap, scale: Float): Bitmap {
    try {
      val scaledBitmap = ImageProcess.scaleBitmap(bitmap, scale)
      if (scaledBitmap !== bitmap) {
        recycleBitmap(bitmap)
      }
      return scaledBitmap
    } catch (error: Throwable) {
      recycleBitmap(bitmap)
      throw error
    }
  }

  private fun recycleBitmaps(bitmaps: Iterable<Bitmap>) {
    for (bitmap in bitmaps) {
      recycleBitmap(bitmap)
    }
  }

  private fun recycleBitmap(bitmap: Bitmap?) {
    if (bitmap != null && !bitmap.isRecycled) {
      bitmap.recycle()
    }
  }

  private fun decodeBase64ToBitmap(img: ImageOptions): Bitmap {
    val base64Str = img.uri
    if (base64Str == null) {
      throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Failed to decode Base64 image")
    }
    return try {
      val separator = base64Str.indexOf(',')
      if (separator < 0) {
        throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Failed to decode Base64 image")
      }
      val imageBytes = Base64.decode(base64Str.substring(separator + 1), Base64.DEFAULT)
      val orientation = readExifOrientation(imageBytes)
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, bounds)
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
        throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Failed to decode Base64 image bounds")
      }
      val orientedWidth = if (swapsDimensions(orientation)) bounds.outHeight else bounds.outWidth
      val orientedHeight = if (swapsDimensions(orientation)) bounds.outWidth else bounds.outHeight
      val decodeTarget = preScaleTarget(img, orientedWidth, orientedHeight)
      val decodeOptions = BitmapFactory.Options().apply {
        inSampleSize = calculateInSampleSize(
          bounds.outWidth,
          bounds.outHeight,
          decodeTarget.width,
          decodeTarget.height,
          swapsDimensions(orientation)
        )
      }
      val decoded = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, decodeOptions)
        ?: throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Failed to decode Base64 image")
      applyExifOrientation(decoded, orientation)
    } catch (error: MarkerError) {
      throw error
    } catch (error: OutOfMemoryError) {
      throw MarkerError(
        ErrorCode.RENDER_FAILED,
        "Unable to decode Base64 image"
      ).apply { initCause(error) }
    } catch (error: IllegalArgumentException) {
      Log.e("ImageLoader", "Failed to decode Base64 image", error)
      throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Failed to decode Base64 image")
    }
  }

  private fun readExifOrientation(imageBytes: ByteArray): Int {
    return try {
      ByteArrayInputStream(imageBytes).use { stream ->
        ExifInterface(stream).getAttributeInt(
          ExifInterface.TAG_ORIENTATION,
          ExifInterface.ORIENTATION_NORMAL
        )
      }
    } catch (_: Exception) {
      ExifInterface.ORIENTATION_NORMAL
    }
  }

  private fun calculateInSampleSize(
    sourceWidth: Int,
    sourceHeight: Int,
    requestedWidth: Int,
    requestedHeight: Int,
    swapDimensions: Boolean
  ): Int {
    if (sourceWidth <= 0 || sourceHeight <= 0) return 1
    val orientedWidth = if (swapDimensions) sourceHeight else sourceWidth
    val orientedHeight = if (swapDimensions) sourceWidth else sourceHeight
    var sampleSize = 1
    while (
      orientedWidth / (sampleSize * 2) >= requestedWidth &&
      orientedHeight / (sampleSize * 2) >= requestedHeight
    ) {
      sampleSize *= 2
    }
    return sampleSize
  }

  private fun swapsDimensions(orientation: Int): Boolean {
    return orientation == ExifInterface.ORIENTATION_TRANSPOSE ||
      orientation == ExifInterface.ORIENTATION_ROTATE_90 ||
      orientation == ExifInterface.ORIENTATION_TRANSVERSE ||
      orientation == ExifInterface.ORIENTATION_ROTATE_270
  }

  private fun applyExifOrientation(bitmap: Bitmap, orientation: Int): Bitmap {
    if (orientation == ExifInterface.ORIENTATION_NORMAL || orientation == ExifInterface.ORIENTATION_UNDEFINED) {
      return bitmap
    }
    val matrix = Matrix().apply {
      when (orientation) {
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> postScale(-1f, 1f)
        ExifInterface.ORIENTATION_ROTATE_180 -> postRotate(180f)
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> postScale(1f, -1f)
        ExifInterface.ORIENTATION_TRANSPOSE -> {
          postRotate(90f)
          postScale(-1f, 1f)
        }
        ExifInterface.ORIENTATION_ROTATE_90 -> postRotate(90f)
        ExifInterface.ORIENTATION_TRANSVERSE -> {
          postRotate(-90f)
          postScale(-1f, 1f)
        }
        ExifInterface.ORIENTATION_ROTATE_270 -> postRotate(-90f)
      }
    }
    return try {
      val oriented = Utils.allocateOrThrow("EXIF-oriented Base64 bitmap") {
        Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
      }
      if (oriented !== bitmap) {
        recycleBitmap(bitmap)
      }
      oriented
    } catch (error: Throwable) {
      recycleBitmap(bitmap)
      throw error
    }
  }

  private fun preScaleTarget(
    img: ImageOptions,
    sourceWidth: Int,
    sourceHeight: Int
  ): ImagePixelSize {
    return if (img.src.width > 0 && img.src.height > 0) {
      ImageSizeLimiter.fit(img.src.width, img.src.height, maxSize)
    } else {
      ImageSizeLimiter.fit(sourceWidth, sourceHeight, maxSize)
    }
  }

  private fun resizeToPreScaleTarget(bitmap: Bitmap, img: ImageOptions): Bitmap {
    val target = preScaleTarget(img, bitmap.width, bitmap.height)
    if (bitmap.width == target.width && bitmap.height == target.height) {
      return bitmap
    }
    return try {
      val resized = Utils.allocateOrThrow("maxSize-bounded image bitmap") {
        Bitmap.createScaledBitmap(bitmap, target.width, target.height, true)
      }
      if (resized !== bitmap) {
        recycleBitmap(bitmap)
      }
      resized
    } catch (error: Throwable) {
      recycleBitmap(bitmap)
      throw error
    }
  }
}
