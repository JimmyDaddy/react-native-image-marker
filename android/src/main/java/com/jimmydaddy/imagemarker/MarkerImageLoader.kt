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
import coil.request.CachePolicy
import coil.request.ImageRequest
import coil.request.SuccessResult
import coil.size.Size
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
  ): List<Bitmap> {
    // Decode sequentially. All decoded bitmaps must remain resident until composition, so
    // concurrent decoding only increases the peak through overlapping decoder intermediates.
    val loaded = ArrayList<Bitmap>(images.size)
    try {
      withContext(Dispatchers.IO) {
        for ((index, img) in images.withIndex()) {
          currentCoroutineContext().ensureActive()
          val scale = if (scaleImages.getOrElse(index) { true }) img.scale else 1f
          val isCoilImg = isCoilImg(img.uri)
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
    return scaleBitmap(bitmap, scale)
  }

  private suspend fun loadCoilImage(img: ImageOptions, scale: Float): Bitmap {
    var ownedBitmap: Bitmap? = null
    try {
      var request = ImageRequest.Builder(context)
        .data(img.uri)
        // The returned bitmap is explicitly recycled after rendering. Keep it out of Coil's
        // memory cache so that recycling cannot invalidate a shared cached drawable.
        .memoryCachePolicy(CachePolicy.DISABLED)
      if (img.src.width > 0 && img.src.height > 0) {
        request = request.size(img.src.width, img.src.height)
        Log.d(IMAGE_MARKER_TAG, "src.width: " + img.src.width + " src.height: " + img.src.height)
      } else {
        request = request.size(Size.ORIGINAL)
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
    var ownedBitmap: Bitmap? = Utils.allocateOrThrow("decoded resource bitmap") {
      BitmapFactory.decodeResource(resources, resId)
    } ?: throw MarkerError(
      ErrorCode.GET_RESOURCE_FAILED,
      "Can't decode resource by the path: ${img.uri}"
    )
    try {
      if (img.src.width > 0 && img.src.height > 0) {
        val decodedBitmap = checkNotNull(ownedBitmap)
        val sizedBitmap = Utils.allocateOrThrow("resized resource bitmap") {
          Bitmap.createScaledBitmap(decodedBitmap, img.src.width, img.src.height, true)
        }
        if (sizedBitmap !== decodedBitmap) {
          recycleBitmap(decodedBitmap)
        }
        ownedBitmap = sizedBitmap
      }

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

  private fun decodeBase64ToBitmap(base64Str: String?): Bitmap {
    if (base64Str == null) {
      throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Failed to decode Base64 image")
    }
    return try {
      val imageBytes = Base64.decode(base64Str.substring(base64Str.indexOf(",") + 1), Base64.DEFAULT)
      BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
        ?: throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Failed to decode Base64 image")
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
}
