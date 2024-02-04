package com.jimmydaddy.imagemarker

import android.annotation.SuppressLint
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Build.VERSION.SDK_INT
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import java.util.concurrent.CompletableFuture

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
  suspend fun loadImages(images: List<ImageOptions>): List<Bitmap?> = withContext(Dispatchers.IO) {

    val deferredList = images.map { img ->
      async {
        try {
          val isCoilImg = isCoilImg(img.uri)
          Log.d(IMAGE_MARKER_TAG, "isCoilImg: $isCoilImg")
          if (isCoilImg) {
            val future = CompletableFuture<Bitmap?>()
            var request = ImageRequest.Builder(context)
              .data(img.uri)
            if (img.src != null && img.src.width > 0 && img.src.height > 0) {
              request = request.size(img.src.width, img.src.height)
              Log.d(IMAGE_MARKER_TAG, "src.width: " + img.src.width + " src.height: " + img.src.height)
            }  else {
              request = request.size(Size.ORIGINAL)
            }
            imageLoader.enqueue(request.target (
              onStart = { _ ->
                // Handle the placeholder drawable.
                Log.d(IMAGE_MARKER_TAG, "start to load image: " + img.uri)
              },
              onSuccess = { result ->
                val bitmap = result.toBitmap()
                val bg = ImageProcess.scaleBitmap(bitmap, img.scale)
                if (bg == null) {
                  future.completeExceptionally(MarkerError(ErrorCode.LOAD_IMAGE_FAILED,
                      "Can't retrieve the file from the src: " + img.uri))
                }
                future.complete(bg)
              },
              onError = { _ ->
                future.completeExceptionally(MarkerError(ErrorCode.LOAD_IMAGE_FAILED,
                  "Can't retrieve the file from the src: " + img.uri))
              }
            ).build())
            return@async future.get()
          } else {
            val resId = getDrawableResourceByName(img.uri)
            Log.d(IMAGE_MARKER_TAG, "resId: $resId")
            if (resId == 0) {
              Log.d(IMAGE_MARKER_TAG, "cannot find res")
              throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Can't get resource by the path: ${img.uri}")
            } else {
              val r = resources
              Log.d(IMAGE_MARKER_TAG, "src.width: " + img.src.width + " src.height: " + img.src.height)
              val originalBitMap = BitmapFactory.decodeResource(r, resId)
              var bitmap = originalBitMap
              if (img.src != null && img.src.width > 0 && img.src.height > 0) {
                bitmap = Bitmap.createScaledBitmap(originalBitMap, img.src.width, img.src.height, true);
              }
              Log.d(IMAGE_MARKER_TAG, bitmap!!.height.toString() + "")
              val bg = ImageProcess.scaleBitmap(bitmap, img.scale)
              Log.d(IMAGE_MARKER_TAG, bg!!.height.toString() + "")
              if (!bitmap.isRecycled && img.scale != 1f) {
                bitmap.recycle()
                System.gc()
              }
              return@async bg
            }
          }
        } catch (e: Exception) {
          Log.e("ImageLoader", "Failed to load image: ${img.uri}", e)
          null
        }
      }
    }
    deferredList.awaitAll()
  }

  private fun isCoilImg(uri: String?): Boolean {
    // val base64Pattern =
    // "^data:(image|img)/(bmp|jpg|png|tif|gif|pcx|tga|exif|fpx|svg|psd|cdr|pcd|dxf|ufo|eps|ai|raw|WMF|webp);base64,(([[A-Za-z0-9+/])*\\s\\S*)*"
    return uri!!.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://") || uri.startsWith(
      "data:"
    ) && uri.contains("base64") && (uri.contains("img") || uri.contains("image"))
  }

  @SuppressLint("DiscouragedApi")
  private fun getDrawableResourceByName(name: String?): Int {
    return resources.getIdentifier(
      name,
      "drawable",
      context.packageName
    )
  }

}
