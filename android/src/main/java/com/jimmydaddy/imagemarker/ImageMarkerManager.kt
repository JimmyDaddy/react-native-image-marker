package com.jimmydaddy.imagemarker

import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.Bitmap.CompressFormat
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.util.Base64
import android.util.Log
import com.facebook.common.references.CloseableReference
import com.facebook.datasource.DataSource
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.imagepipeline.core.ImagePipelineConfig
import com.facebook.imagepipeline.datasource.BaseBitmapDataSubscriber
import com.facebook.imagepipeline.image.CloseableImage
import com.facebook.imagepipeline.request.ImageRequest
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.systeminfo.ReactNativeVersion
import com.jimmydaddy.imagemarker.base.MarkImageOptions
import com.jimmydaddy.imagemarker.base.MarkTextOptions
import com.jimmydaddy.imagemarker.base.Position.Companion.getImageRectFromPosition
import com.jimmydaddy.imagemarker.base.SaveFormat
import com.jimmydaddy.imagemarker.base.Utils.Companion.getBlankBitmap
import com.jimmydaddy.imagemarker.base.Utils.Companion.getStringSafe
import com.jimmydaddy.imagemarker.base.Utils.Companion.scaleBitmap
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID
import java.util.concurrent.Executor
import java.util.concurrent.Executors

/**
 * Created by jimmydaddy on 2017/3/6.
 */
class ImageMarkerManager(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(
  context
) {
  override fun getName(): String {
    return NAME
  }

  private val resources: Resources
    private get() = context.resources

  private fun getDrawableResourceByName(name: String?): Int {
    return resources.getIdentifier(
      name,
      "drawable",
      context.packageName
    )
  }

  private fun isFrescoImg(uri: String?): Boolean {
    val base64Pattern =
      "^data:(image|img)/(bmp|jpg|png|tif|gif|pcx|tga|exif|fpx|svg|psd|cdr|pcd|dxf|ufo|eps|ai|raw|WMF|webp);base64,(([[A-Za-z0-9+/])*\\s\\S*)*"
    return uri!!.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://") || uri.startsWith(
      "data:"
    ) && uri.contains("base64") && (uri.contains("img") || uri.contains("image"))
  }

  private fun getSaveFormat(saveFormat: SaveFormat?): CompressFormat {
    return if (saveFormat != null && saveFormat === SaveFormat.PNG) CompressFormat.PNG else CompressFormat.JPEG
  }

  private fun setMaxBitmapSize(maxSize: Int) {
    val major = getStringSafe("major", ReactNativeVersion.VERSION)
    val minor = getStringSafe("minor", ReactNativeVersion.VERSION)
    val patch = getStringSafe("patch", ReactNativeVersion.VERSION)
    if (Integer.valueOf(major) >= 0 && Integer.valueOf(minor) >= 60 && Integer.valueOf(
        patch
      ) >= 0
    ) {
      val config =
        ImagePipelineConfig.newBuilder(context).experiment().setMaxBitmapSize(maxSize)
          .build()
      Fresco.initialize(context, config)
    }
  }

  private fun markImage(
    bg: Bitmap?,
    dest: String,
    opts: MarkImageOptions,
    promise: Promise
  ) {
    try {
      val uri = opts.watermarkImage.uri
      Log.d(IMAGE_MARKER_TAG, uri!!)
      if (isFrescoImg(uri)) {
        val imageRequest = ImageRequest.fromUri(uri)
        val dataSource = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, context)
        val executor: Executor = Executors.newSingleThreadExecutor()
        dataSource.subscribe(object : BaseBitmapDataSubscriber() {
          public override fun onNewResultImpl(bitmap: Bitmap?) {
            if (bitmap != null) {
              val mark = scaleBitmap(bitmap, opts.watermarkImage.scale)
              markImageByBitmap(bg, mark, dest, opts, promise)
            } else {
              promise.reject(
                "marker error",
                "Can't retrieve the file from the markerpath: $uri"
              )
            }
          }

          override fun onFailureImpl(dataSource: DataSource<CloseableReference<CloseableImage>>) {
            promise.reject(
              "error",
              "Can't request the image from the uri: $uri",
              dataSource.failureCause
            )
          }
        }, executor)
      } else {
        val resId = getDrawableResourceByName(uri)
        if (resId == 0) {
          Log.d(IMAGE_MARKER_TAG, "cannot find res")
          promise.reject("error", "Can't get resource by the path: $uri")
        } else {
          Log.d(IMAGE_MARKER_TAG, "res：$resId")
          val r = resources
          //                    InputStream is = r.openRawResource(resId);
          val bitmap = BitmapFactory.decodeResource(r, resId)
          //                    Bitmap bitmap = BitmapFactory.decodeStream(is);
          Log.d(IMAGE_MARKER_TAG, bitmap!!.height.toString() + "")
          val mark = scaleBitmap(
            bitmap, opts.watermarkImage.scale
          )
          Log.d(IMAGE_MARKER_TAG, mark!!.height.toString() + "")
          if (bitmap != null && !bitmap.isRecycled && opts.watermarkImage.scale != 1.0f) {
            bitmap.recycle()
            System.gc()
          }
          markImageByBitmap(bg, mark, dest, opts, promise)
        }
      }
    } catch (e: Exception) {
      Log.d(IMAGE_MARKER_TAG, "error：" + e.message)
      e.printStackTrace()
      promise.reject("error", e.message, e)
    }
  }

  private fun markImageByBitmap(
    bg: Bitmap?,
    marker: Bitmap?,
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
      //过滤一些

//            if (percent > 1) {
//                prePhoto = Bitmap.createScaledBitmap(prePhoto, width, height, true);
//            }
      val canvas = Canvas(icon!!)
      canvas.save()
      if (opts.backgroundImage.rotate > 0) {
        canvas.rotate(opts.backgroundImage.rotate, (width / 2).toFloat(), (height/2).toFloat())
      }
      canvas.drawBitmap(bg, 0f, 0f, opts.backgroundImage.applyStyle())
      canvas.restore()
      // 原图生成 - end
      canvas.save()
      canvas.rotate(opts.watermarkImage.rotate, (marker!!.width / 2).toFloat(), (marker.height / 2).toFloat())
      if (opts.positionEnum != null) {
        val pos = getImageRectFromPosition(
          opts.positionEnum,
          marker!!.width,
          marker.height,
          width,
          height
        )
        canvas.drawBitmap(marker, pos.x, pos.y, opts.watermarkImage.applyStyle())
      } else {
        canvas.drawBitmap(
          marker!!,
          opts.x!!.toFloat(),
          opts.y!!.toFloat(),
          opts.watermarkImage.applyStyle()
        )
      }
      canvas.restore()
      if (bg != null && !bg.isRecycled) {
        bg.recycle()
        System.gc()
      }
      if (marker != null && !marker.isRecycled) {
        marker.recycle()
        System.gc()
      }

      // 保存
      // canvas.save(Canvas.ALL_SAVE_FLAG);
      canvas.save()
      // 存储
      canvas.restore()
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
        icon = null
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
      if (opts.backgroundImage.rotate > 0) {
        canvas.rotate(opts.backgroundImage.rotate, (width / 2).toFloat(), (height/2).toFloat())
      }
      canvas.drawBitmap(bg, 0f, 0f, opts.backgroundImage.applyStyle())
      canvas.restore()
      if (bg != null && !bg.isRecycled) {
        bg.recycle()
        System.gc()
      }
      var textPaint: Paint
      for (text in opts.watermarkTexts) {
        //建立画笔
        textPaint = text!!.applyStyle(this.reactApplicationContext, canvas, width, height)
        textPaint.reset()
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
  @ReactMethod
  fun markWithText(
    opts: ReadableMap?,
    promise: Promise
  ) {
    val markOpts = MarkTextOptions.checkParams(opts!!, promise) ?: return
    try {
      val dest = generateCacheFilePathForMarker(
        markOpts.filename,
        markOpts.saveFormat
      )
      Log.d(IMAGE_MARKER_TAG, "uri: " + markOpts.backgroundImage.uri)
      Log.d(IMAGE_MARKER_TAG, "src: " + markOpts.backgroundImage.src.toString())
      if (isFrescoImg(markOpts.backgroundImage.uri)) {
        val imageRequest = ImageRequest.fromUri(markOpts.backgroundImage.uri)
        if (markOpts.maxSize > 0) {
          setMaxBitmapSize(markOpts.maxSize)
        }
        val dataSource = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, null)
        val executor: Executor = Executors.newSingleThreadExecutor()
        dataSource.subscribe(object : BaseBitmapDataSubscriber() {
          public override fun onNewResultImpl(bitmap: Bitmap?) {
            if (bitmap != null) {
              val bg = scaleBitmap(bitmap, markOpts.backgroundImage.scale)
              markImageByText(bg, dest, markOpts, promise)
            } else {
              promise.reject(
                "marker error",
                "Can't retrieve the file from the src: " + markOpts.backgroundImage.uri
              )
            }
          }

          override fun onFailureImpl(dataSource: DataSource<CloseableReference<CloseableImage>>) {
            promise.reject(
              "error",
              "Can't request the image from the uri: " + markOpts.backgroundImage.uri,
              dataSource.failureCause
            )
          }
        }, executor)
      } else {
        val resId = getDrawableResourceByName(markOpts.backgroundImage.uri)
        if (resId == 0) {
          Log.d(IMAGE_MARKER_TAG, "cannot find res")
          promise.reject(
            "error",
            "Can't get resource by the path: " + markOpts.backgroundImage.uri
          )
        } else {
          Log.d(IMAGE_MARKER_TAG, "res：$resId")
          val r = resources
          //                    InputStream is = r.openRawResource(resId);
          val bitmap = BitmapFactory.decodeResource(r, resId)
          //                    Bitmap bitmap = BitmapFactory.decodeStream(is);
          Log.d(IMAGE_MARKER_TAG, bitmap!!.height.toString() + "")
          val bg = scaleBitmap(
            bitmap, markOpts.backgroundImage.scale
          )
          Log.d(IMAGE_MARKER_TAG, bg!!.height.toString() + "")
          if (bitmap != null && !bitmap.isRecycled && markOpts.backgroundImage.scale != 1f) {
            bitmap.recycle()
            System.gc()
          }
          markImageByText(bg, dest, markOpts, promise)
        }
      }
    } catch (e: Exception) {
      Log.d(IMAGE_MARKER_TAG, "error：" + e.message)
      e.printStackTrace()
      promise.reject("error", e.message, e)
    }
  }

  @ReactMethod
  fun markWithImage(
    opts: ReadableMap?,
    promise: Promise
  ) {
    try {
      val markOpts = MarkImageOptions.checkParams(opts!!, promise) ?: return
      val uri = markOpts.backgroundImage.uri
      val dest = generateCacheFilePathForMarker(markOpts.filename, markOpts.saveFormat)
      Log.d(IMAGE_MARKER_TAG, uri!!)
      Log.d(IMAGE_MARKER_TAG, "src: " + markOpts.backgroundImage.src.toString())
      Log.d(IMAGE_MARKER_TAG, "markerSrc: " + markOpts.watermarkImage.src.toString())
      if (isFrescoImg(uri)) {
        val imageRequest = ImageRequest.fromUri(uri)
        if (null != markOpts.maxSize && markOpts.maxSize > 0) {
          setMaxBitmapSize(markOpts.maxSize)
        }
        val dataSource = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, null)
        val executor: Executor = Executors.newSingleThreadExecutor()
        dataSource.subscribe(object : BaseBitmapDataSubscriber() {
          public override fun onNewResultImpl(bitmap: Bitmap?) {
            if (bitmap != null) {
              val bg = scaleBitmap(bitmap, markOpts.backgroundImage.scale)
              markImage(bg, dest, markOpts, promise)
            } else {
              promise.reject(
                "marker error",
                "Can't retrieve the file from the src: $uri"
              )
            }
          }

          override fun onFailureImpl(dataSource: DataSource<CloseableReference<CloseableImage>>) {
            promise.reject(
              "error",
              "Can't request the image from the uri: $uri",
              dataSource.failureCause
            )
          }
        }, executor)
      } else {
        val resId = getDrawableResourceByName(uri)
        if (resId == 0) {
          Log.d(IMAGE_MARKER_TAG, "cannot find res")
          promise.reject("error", "Can't get resource by the path: $uri")
        } else {
          Log.d(IMAGE_MARKER_TAG, "res：$resId")
          val r = resources
          //                    InputStream is = r.openRawResource(resId);
          val bitmap = BitmapFactory.decodeResource(r, resId)
          //                    Bitmap bitmap = BitmapFactory.decodeStream(is);
          Log.d(IMAGE_MARKER_TAG, bitmap!!.height.toString() + "")
          val bg = scaleBitmap(
            bitmap, markOpts.backgroundImage.scale
          )
          Log.d(IMAGE_MARKER_TAG, bg!!.height.toString() + "")
          if (bitmap != null && !bitmap.isRecycled && markOpts.backgroundImage.scale != 1f) {
            bitmap.recycle()
            System.gc()
          }
          markImage(bg, dest, markOpts, promise)
        }
      }
    } catch (e: Exception) {
      Log.d(IMAGE_MARKER_TAG, "error：" + e.message)
      e.printStackTrace()
      promise.reject("error", e.message, e)
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
      val name = UUID.randomUUID().toString() + "imagemarker"
      "$cacheDir/$name$ext"
    }
  }

  companion object {
    private const val IMAGE_MARKER_TAG = "[ImageMarker]"
    private const val BASE64 = "base64"
    const val NAME = "ImageMarker"
  }
}
