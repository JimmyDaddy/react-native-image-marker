package com.jimmydaddy.imagemarker

import android.annotation.SuppressLint
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.common.references.CloseableReference
import com.facebook.datasource.DataSource
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.imagepipeline.core.ImagePipelineConfig
import com.facebook.imagepipeline.datasource.BaseBitmapDataSubscriber
import com.facebook.imagepipeline.image.CloseableImage
import com.facebook.imagepipeline.request.ImageRequest
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

  private val resources: Resources
    get() = context.resources

  @RequiresApi(Build.VERSION_CODES.N)
  suspend fun loadImages(images: List<ImageOptions>): List<Bitmap?> = withContext(Dispatchers.IO) {
    val deferredList = images.map { img ->
      async {
        try {
          if (isFrescoImg(img.uri)) {
            val future = CompletableFuture<Bitmap?>()
            val imageRequest = ImageRequest.fromUri(img.uri)
            if (maxSize > 0) {
              setMaxBitmapSize(maxSize)
            }
            val dataSource = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, null)
            val executor: Executor = Executors.newSingleThreadExecutor()
            dataSource.subscribe(object : BaseBitmapDataSubscriber() {
              public override fun onNewResultImpl(bitmap: Bitmap?) {
                if (bitmap != null) {
                  val bg = Utils.scaleBitmap(bitmap, img.scale)
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
            if (resId == 0) {
              Log.d(IMAGE_MARKER_TAG, "cannot find res")
              throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Can't get resource by the path: ${img.uri}")
            } else {
              Log.d(IMAGE_MARKER_TAG, "res：$resId")
              val r = resources
              //                    InputStream is = r.openRawResource(resId);
              val bitmap = BitmapFactory.decodeResource(r, resId)
              //                    Bitmap bitmap = BitmapFactory.decodeStream(is);
              Log.d(IMAGE_MARKER_TAG, bitmap!!.height.toString() + "")
              val bg = Utils.scaleBitmap(
                bitmap, img.scale
              )
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
      val config =
        ImagePipelineConfig.newBuilder(context).experiment().setMaxBitmapSize(maxSize)
          .build()
      Fresco.initialize(context, config)
    }
  }

}
