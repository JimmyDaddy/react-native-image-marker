package com.jimmydaddy.imagemarker

import android.annotation.SuppressLint
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Build.VERSION.SDK_INT
import android.util.Base64
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.graphics.drawable.toBitmap
import coil.ImageLoader
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.decode.SvgDecoder
import coil.request.ImageRequest
import coil.size.Size
import com.facebook.react.bridge.ReactApplicationContext
import com.jimmydaddy.imagemarker.base.Constants.IMAGE_MARKER_TAG
import com.jimmydaddy.imagemarker.base.ErrorCode
import com.jimmydaddy.imagemarker.base.ImageOptions
import com.jimmydaddy.imagemarker.base.MarkerError
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class MarkerImageLoader(private val context: ReactApplicationContext, private val maxSize: Int) {

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
  ): List<Bitmap> = withContext(Dispatchers.IO) {

    val deferredList = images.mapIndexed { index, img ->
      async {
        try {
          val scale = if (scaleImages.getOrElse(index) { true }) img.scale else 1f

          val isCoilImg = isCoilImg(img.uri)
          Log.d(IMAGE_MARKER_TAG, "isCoilImg: $isCoilImg")

          when {
            isBase64String(img.uri) -> loadBase64Image(img, scale)
            isCoilImg -> loadCoilImage(img, scale)
            else -> loadResourceImage(img, scale)
          }
        } catch (e: Exception) {
          Log.e("ImageLoader", "Failed to load image: ${img.uri}", e)
          throw e
        }
      }
    }
    deferredList.awaitAll()
  }

  private fun isCoilImg(uri: String?): Boolean {
    // val base64Pattern =
    // "^data:(image|img)/(bmp|jpg|png|tif|gif|pcx|tga|exif|fpx|svg|psd|cdr|pcd|dxf|ufo|eps|ai|raw|WMF|webp);base64,(([[A-Za-z0-9+/])*\\s\\S*)*"
    return uri?.startsWith("http://") == true ||
      uri?.startsWith("https://") == true ||
      uri?.startsWith("file://") == true ||
      uri?.startsWith("data:") == true && uri.contains("base64") && (uri.contains("img") || uri.contains("image"))
  }

  @SuppressLint("DiscouragedApi")
  private fun getDrawableResourceByName(name: String?): Int {
    return resources.getIdentifier(
      name,
      "drawable",
      context.packageName
    )
  }


  private fun isBase64String(s: String?): Boolean {
    if (s == null) return false
    return s.startsWith("data:image/") && s.contains(";base64,")
  }

  private fun loadBase64Image(img: ImageOptions, scale: Float): Bitmap {
    Log.d(IMAGE_MARKER_TAG, "Loading Base64 Image")
    val bitmap = decodeBase64ToBitmap(img.uri)
      ?: throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Failed to decode Base64 image")
    return scaleBitmap(bitmap, scale, "Base64 image")
  }

  private suspend fun loadCoilImage(img: ImageOptions, scale: Float): Bitmap =
    suspendCancellableCoroutine { continuation ->
      var request = ImageRequest.Builder(context)
        .data(img.uri)
      if (img.src.width > 0 && img.src.height > 0) {
        request = request.size(img.src.width, img.src.height)
        Log.d(IMAGE_MARKER_TAG, "src.width: " + img.src.width + " src.height: " + img.src.height)
      } else {
        request = request.size(Size.ORIGINAL)
      }

      val disposable = imageLoader.enqueue(
        request.target(
          onStart = {
            Log.d(IMAGE_MARKER_TAG, "start to load image: " + img.uri)
          },
          onSuccess = { result ->
            runCatching {
              scaleBitmap(result.toBitmap(), scale, "image: ${img.uri}")
            }.fold(
              onSuccess = { continuation.resumeIfActive(it) },
              onFailure = { continuation.resumeExceptionIfActive(it) }
            )
          },
          onError = {
            continuation.resumeExceptionIfActive(
              MarkerError(
                ErrorCode.LOAD_IMAGE_FAILED,
                "Can't retrieve the file from the src: " + img.uri
              )
            )
          }
        ).build()
      )
      continuation.invokeOnCancellation {
        disposable.dispose()
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
    val originalBitmap = BitmapFactory.decodeResource(resources, resId)
      ?: throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Can't decode resource by the path: ${img.uri}")
    val sizedBitmap = if (img.src.width > 0 && img.src.height > 0) {
      Bitmap.createScaledBitmap(originalBitmap, img.src.width, img.src.height, true).also {
        if (it !== originalBitmap && !originalBitmap.isRecycled) {
          originalBitmap.recycle()
        }
      }
    } else {
      originalBitmap
    }

    return scaleBitmap(sizedBitmap, scale, "resource: ${img.uri}")
  }

  private fun scaleBitmap(bitmap: Bitmap, scale: Float, source: String): Bitmap {
    val scaledBitmap = ImageProcess.scaleBitmap(bitmap, scale)
      ?: throw MarkerError(ErrorCode.LOAD_IMAGE_FAILED, "Failed to scale $source")
    if (scaledBitmap !== bitmap && !bitmap.isRecycled) {
      bitmap.recycle()
    }
    return scaledBitmap
  }

  private fun CancellableContinuation<Bitmap>.resumeIfActive(bitmap: Bitmap) {
    if (isActive) {
      resume(bitmap)
    }
  }

  private fun CancellableContinuation<Bitmap>.resumeExceptionIfActive(error: Throwable) {
    if (isActive) {
      resumeWithException(error)
    }
  }

  private fun decodeBase64ToBitmap(base64Str: String?): Bitmap? {
    if (base64Str == null) return null
    return try {
      val imageBytes = Base64.decode(base64Str.substring(base64Str.indexOf(",") + 1), Base64.DEFAULT)
      BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
    } catch (e: Exception) {
      Log.e("ImageLoader", "Failed to decode Base64 image", e)
      null
    }
  }
}
