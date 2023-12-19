package com.jimmydaddy.imagemarker

import android.annotation.SuppressLint
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.common.internal.Supplier
import com.facebook.common.references.CloseableReference
import com.facebook.datasource.DataSource
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.imagepipeline.cache.MemoryCacheParams
import com.facebook.imagepipeline.common.ResizeOptions
import com.facebook.imagepipeline.core.ImagePipelineConfig
import com.facebook.imagepipeline.datasource.BaseBitmapDataSubscriber
import com.facebook.imagepipeline.image.CloseableImage
import com.facebook.imagepipeline.request.ImageRequest
import com.facebook.imagepipeline.request.ImageRequestBuilder
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.systeminfo.ReactNativeVersion
import com.jimmydaddy.imagemarker.base.Constants.IMAGE_MARKER_TAG
import com.jimmydaddy.imagemarker.base.ErrorCode
import com.jimmydaddy.imagemarker.base.ImageOptions
import com.jimmydaddy.imagemarker.base.MarkerError
import com.jimmydaddy.imagemarker.base.Utils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executor
import java.util.concurrent.Executors

class ImageLoader(private val context: ReactApplicationContext, private val maxSize: Int) {

  init {
    if (maxSize > 0) {
      setMaxBitmapSize(maxSize)
    }
  }
  private val resources: Resources
    get() = context.resources

  @RequiresApi(Build.VERSION_CODES.N)
  suspend fun loadImages(images: List<ImageOptions>): List<Bitmap?> = withContext(Dispatchers.IO) {
    val deferredList = images.map { img ->
      async {
        try {
          val isFrescoImg = isFrescoImg(img.uri)
          Log.d(IMAGE_MARKER_TAG, "isFrescoImg: " + isFrescoImg(img.uri))
          if (isFrescoImg) {
            val future = CompletableFuture<Bitmap?>()
            var imageRequest = ImageRequest.fromUri(img.uri)
            if (img.src != null && img.src.width > 0 && img.src.height > 0) {
              val options: ResizeOptions? = ResizeOptions(img.src.width, img.src.height)
              imageRequest = ImageRequestBuilder.fromRequest(imageRequest).setResizeOptions(options).build()
              Log.d(IMAGE_MARKER_TAG, "src.width: " + img.src.width + " src.height: " + img.src.height)
            }
            val dataSource = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, null)
            val executor: Executor = Executors.newSingleThreadExecutor()
            dataSource.subscribe(object : BaseBitmapDataSubscriber() {
              public override fun onNewResultImpl(bitmap: Bitmap?) {
                if (bitmap != null) {
                  val bg = ImageProcess.scaleBitmap(bitmap, img.scale)
                  future.complete(bg)
                } else {
                  future.completeExceptionally(MarkerError(ErrorCode.LOAD_IMAGE_FAILED,
                    "Can't retrieve the file from the src: " + img.uri))
                }
              }

              override fun onFailureImpl(dataSource: DataSource<CloseableReference<CloseableImage>>) {
                future.completeExceptionally(MarkerError(ErrorCode.LOAD_IMAGE_FAILED,
                  "Can't retrieve the file from the src: " + img.uri))
              }
            }, executor)
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

  private fun isFrescoImg(uri: String?): Boolean {
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

  private fun setMaxBitmapSize(maxSize: Int) {
    val major = Utils.getStringSafe("major", ReactNativeVersion.VERSION)
    val minor = Utils.getStringSafe("minor", ReactNativeVersion.VERSION)
    val patch = Utils.getStringSafe("patch", ReactNativeVersion.VERSION)
    if (Integer.valueOf(major.toString()) >= 0 && Integer.valueOf(minor.toString()) >= 60 && Integer.valueOf(
        patch.toString()
      ) >= 0
    ) {
      val bitmapMemoryCacheParamsSupplier = Supplier<MemoryCacheParams> {
        MemoryCacheParams(
          maxSize, // max cache entry size
          Integer.MAX_VALUE, // max cache entries
          maxSize, // max cache size
          Integer.MAX_VALUE, // max cache eviction size
          Integer.MAX_VALUE // max cache eviction count
        )
      }

      val config = ImagePipelineConfig.newBuilder(context)
        .setBitmapMemoryCacheParamsSupplier(bitmapMemoryCacheParamsSupplier)
        .build()
      Fresco.initialize(context, config)
    }
  }

}
