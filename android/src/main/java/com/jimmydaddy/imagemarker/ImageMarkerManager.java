package com.jimmydaddy.imagemarker;

import static com.facebook.drawee.backends.pipeline.Fresco.getImagePipeline;
import static com.jimmydaddy.imagemarker.base.Utils.getStringSafe;

import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.util.Base64;
import android.util.Log;

import com.facebook.common.references.CloseableReference;
import com.facebook.datasource.DataSource;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.imagepipeline.core.ImagePipelineConfig;
import com.facebook.imagepipeline.datasource.BaseBitmapDataSubscriber;
import com.facebook.imagepipeline.image.CloseableImage;
import com.facebook.imagepipeline.request.ImageRequest;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.systeminfo.ReactNativeVersion;
import com.jimmydaddy.imagemarker.base.MarkImageOptions;
import com.jimmydaddy.imagemarker.base.MarkTextOptions;
import com.jimmydaddy.imagemarker.base.Position;
import com.jimmydaddy.imagemarker.base.SaveFormat;
import com.jimmydaddy.imagemarker.base.TextOptions;
import com.jimmydaddy.imagemarker.base.Utils;

import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;


/**
 * Created by jimmydaddy on 2017/3/6.
 */


public class ImageMarkerManager extends ReactContextBaseJavaModule {
  private ReactApplicationContext context;
  private static final String IMAGE_MARKER_TAG = "[ImageMarker]";
  private static final String BASE64 = "base64";
  public static final String NAME = "ImageMarker";


  public ImageMarkerManager(ReactApplicationContext reactContext) {
    super(reactContext);
    this.context = reactContext;
  }

  @Override
  public String getName() {
    return NAME;
  }

  private Resources getResources() {
    return this.context.getResources();
  }

  private int getDrawableResourceByName(String name) {
    return this.getResources().getIdentifier(
      name,
      "drawable",
      this.context.getPackageName());
  }

//    private Drawable getDrawableByName(String name) {
//        int drawableResId = getDrawableResourceByName(name);
//        if (drawableResId != 0) {
//            return getResources().getDrawable(getDrawableResourceByName(name));
//        } else {
//            return null;
//        }
//    }

  private Boolean isFrescoImg(String uri) {
    String base64Pattern = "^data:(image|img)/(bmp|jpg|png|tif|gif|pcx|tga|exif|fpx|svg|psd|cdr|pcd|dxf|ufo|eps|ai|raw|WMF|webp);base64,(([[A-Za-z0-9+/])*\\s\\S*)*";

    return uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://") || (uri.startsWith("data:") && uri.contains("base64") && (uri.contains("img") || uri.contains("image")));
  }

  private Bitmap.CompressFormat getSaveFormat(SaveFormat saveFormat) {
    return saveFormat != null && saveFormat == SaveFormat.PNG ? Bitmap.CompressFormat.PNG : Bitmap.CompressFormat.JPEG;
  }

  private void setMaxBitmapSize(int maxSize) {
    String major = getStringSafe("major", ReactNativeVersion.VERSION);
    String minor = getStringSafe("minor", ReactNativeVersion.VERSION);
    String patch = getStringSafe("patch", ReactNativeVersion.VERSION);
    if (Integer.valueOf(major) >= 0 && Integer.valueOf(minor) >= 60 && Integer.valueOf(patch) >= 0) {
      ImagePipelineConfig config = ImagePipelineConfig.newBuilder(this.context).experiment().setMaxBitmapSize(maxSize).build();
      Fresco.initialize(this.context, config);
    }
  }

  private void markImage(
    final Bitmap bg,
    final String dest,
    MarkImageOptions opts,
    final Promise promise) {
    try {
      final String uri = opts.watermarkImage.uri;
      Log.d(IMAGE_MARKER_TAG, uri);

      if (isFrescoImg(uri)) {
        ImageRequest imageRequest = ImageRequest.fromUri(uri);
        DataSource<CloseableReference<CloseableImage>> dataSource = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, context);
        Executor executor = Executors.newSingleThreadExecutor();
        dataSource.subscribe(new BaseBitmapDataSubscriber() {
          @Override
          public void onNewResultImpl(Bitmap bitmap) {
            if (bitmap != null) {
              Bitmap mark = Utils.scaleBitmap(bitmap, opts.watermarkImage.scale);

              markImageByBitmap(bg, mark, dest, opts, promise);
            } else {
              promise.reject("marker error", "Can't retrieve the file from the markerpath: " + uri);
            }
          }

          @Override
          public void onFailureImpl(DataSource dataSource) {
            promise.reject("error", "Can't request the image from the uri: " + uri, dataSource.getFailureCause());
          }
        }, executor);
      } else {
        int resId = getDrawableResourceByName(uri);
        if (resId == 0) {
          Log.d(IMAGE_MARKER_TAG, "cannot find res");
          promise.reject("error", "Can't get resource by the path: " + uri);
        } else {
          Log.d(IMAGE_MARKER_TAG, "res：" + resId);

          Resources r = this.getResources();
//                    InputStream is = r.openRawResource(resId);
          Bitmap bitmap = BitmapFactory.decodeResource(r, resId);
//                    Bitmap bitmap = BitmapFactory.decodeStream(is);
          Log.d(IMAGE_MARKER_TAG, bitmap.getHeight() + "");
          Bitmap mark = Utils.scaleBitmap(bitmap, opts.watermarkImage.scale);
          Log.d(IMAGE_MARKER_TAG, mark.getHeight() + "");

          if (bitmap != null && !bitmap.isRecycled() && opts.watermarkImage.scale != 1.0f) {
            bitmap.recycle();
            System.gc();
          }
          markImageByBitmap(bg, mark, dest, opts, promise);
        }
      }
    } catch (Exception e) {
      Log.d(IMAGE_MARKER_TAG, "error：" + e.getMessage());
      e.printStackTrace();
      promise.reject("error", e.getMessage(), e);
    }
  }

  private void markImageByBitmap(
    Bitmap bg,
    Bitmap marker,
    String dest,
    MarkImageOptions opts,
    final Promise promise
  ) {
    BufferedOutputStream bos = null;
    Bitmap icon = null;
    try {

      // 原图生成 - start
      int height = bg.getHeight();
      int width = bg.getWidth();

      icon = Utils.getBlankBitmap(width, height);
      //过滤一些

//            if (percent > 1) {
//                prePhoto = Bitmap.createScaledBitmap(prePhoto, width, height, true);
//            }
      Canvas canvas = new Canvas(icon);

      canvas.save();
      canvas.rotate(opts.backgroundImage.rotate);
      canvas.drawBitmap(bg, 0, 0, opts.backgroundImage.applyStyle());
      canvas.restore();
      // 原图生成 - end

      canvas.save();
      canvas.rotate(opts.watermarkImage.rotate);
      if (opts.positionEnum != null) {
        Position pos = Position.getImageRectFromPosition(opts.positionEnum, marker.getWidth(), marker.getHeight(), width, height);
        canvas.drawBitmap(marker, pos.getX(), pos.getY(), opts.watermarkImage.applyStyle());
      } else {
        canvas.drawBitmap(marker, opts.X, opts.Y, opts.watermarkImage.applyStyle());
      }
      canvas.restore();

      if (bg != null && !bg.isRecycled()) {
        bg.recycle();
        System.gc();
      }

      if (marker != null && !marker.isRecycled()) {
        marker.recycle();
        System.gc();
      }

      // 保存
      // canvas.save(Canvas.ALL_SAVE_FLAG);
      canvas.save();
      // 存储
      canvas.restore();
      // export base64
      if (dest.equals(BASE64)) {
        ByteArrayOutputStream base64Stream = new ByteArrayOutputStream();
        icon.compress(Bitmap.CompressFormat.PNG, opts.quality, base64Stream);
        base64Stream.flush();
        base64Stream.close();
        byte[] bitmapBytes = base64Stream.toByteArray();
        String result = Base64.encodeToString(bitmapBytes, Base64.DEFAULT);
        promise.resolve("data:image/png;base64,".concat(result));
      } else {
        bos = new BufferedOutputStream(new FileOutputStream(dest));
        icon.compress(getSaveFormat(opts.saveFormat), opts.quality, bos);
        bos.flush();
        bos.close();
        //保存成功的
        promise.resolve(dest);
      }

    } catch (Exception e) {
      e.printStackTrace();
      promise.reject("error", e.getMessage(), e);
    } finally {
      if (bos != null) {
        try {
          bos.close();
        } catch (IOException e) {
          e.printStackTrace();
        }
      }
      if (icon != null && !icon.isRecycled()) {
        icon.recycle();
        icon = null;
        System.gc();
      }
    }
  }

  /**
   * @param bg
   * @param dest
   * @param opts
   * @param promise
   */
  private void markImageByText(
    Bitmap bg,
    String dest,
    MarkTextOptions opts,
    final Promise promise
  ) {
    BufferedOutputStream bos = null;
    boolean isFinished;
    Bitmap icon = null;
    try {

      int height = bg.getHeight();
      int width = bg.getWidth();

      icon = Utils.getBlankBitmap(width, height);
      //初始化画布 绘制的图像到icon上
      Canvas canvas = new Canvas(icon);
      //建立画笔
      Paint photoPaint = new Paint();
      //获取跟清晰的图像采样
      photoPaint.setDither(true);

      canvas.drawBitmap(bg, 0, 0, photoPaint);

      if (bg != null && !bg.isRecycled()) {
        bg.recycle();
        System.gc();
      }

      Paint textPaint;
      for (TextOptions text : opts.watermarkTexts) {
        //建立画笔
        textPaint = text.applyStyle(this.getReactApplicationContext(), canvas, width, height);
        textPaint.reset();
      }

      if (dest.equals(BASE64)) {
        ByteArrayOutputStream base64Stream = new ByteArrayOutputStream();
        icon.compress(Bitmap.CompressFormat.PNG, opts.quality, base64Stream);
        base64Stream.flush();
        base64Stream.close();
        byte[] bitmapBytes = base64Stream.toByteArray();
        String result = Base64.encodeToString(bitmapBytes, Base64.DEFAULT);
        promise.resolve("data:image/png;base64,".concat(result));
      } else {
        bos = new BufferedOutputStream(new FileOutputStream(dest));
        icon.compress(getSaveFormat(opts.saveFormat), opts.quality, bos);
        bos.flush();
        bos.close();
        //保存成功的
        promise.resolve(dest);
      }


    } catch (Exception e) {
      e.printStackTrace();
      promise.reject("error", e.getMessage(), e);
    } finally {
      isFinished = true;
      if (bos != null) {
        try {
          bos.close();
        } catch (IOException e) {
          e.printStackTrace();
        }
      }
      if (icon != null && !icon.isRecycled()) {
        icon.recycle();
        System.gc();
      }
    }
  }

  /**
   * @param opts
   * @param promise
   */
  @ReactMethod
  public void markWithText(
    ReadableMap opts,
    final Promise promise
  ) {
    MarkTextOptions markOpts = MarkTextOptions.checkParams(opts, promise);
    if (null == markOpts) return;
    try {

      final String dest = generateCacheFilePathForMarker(markOpts.backgroundImage.uri, markOpts.filename, markOpts.saveFormat);

      Log.d(IMAGE_MARKER_TAG, "uri: " + markOpts.backgroundImage.uri);
      Log.d(IMAGE_MARKER_TAG, "src: " + markOpts.backgroundImage.src.toString());

      if (isFrescoImg(markOpts.backgroundImage.uri)) {
        ImageRequest imageRequest = ImageRequest.fromUri(markOpts.backgroundImage.uri);
        if (markOpts.maxSize > 0) {
          setMaxBitmapSize(markOpts.maxSize);
        }
        DataSource<CloseableReference<CloseableImage>> dataSource = getImagePipeline().fetchDecodedImage(imageRequest, null);
        Executor executor = Executors.newSingleThreadExecutor();
        dataSource.subscribe(new BaseBitmapDataSubscriber() {
          @Override
          public void onNewResultImpl(Bitmap bitmap) {
            if (bitmap != null) {
              Bitmap bg = Utils.scaleBitmap(bitmap, markOpts.backgroundImage.scale);

              markImageByText(bg, dest, markOpts, promise);

            } else {
              promise.reject("marker error", "Can't retrieve the file from the src: " + markOpts.backgroundImage.uri);
            }
          }

          @Override
          public void onFailureImpl(DataSource dataSource) {
            promise.reject("error", "Can't request the image from the uri: " + markOpts.backgroundImage.uri, dataSource.getFailureCause());
          }
        }, executor);
      } else {
        int resId = getDrawableResourceByName(markOpts.backgroundImage.uri);
        if (resId == 0) {
          Log.d(IMAGE_MARKER_TAG, "cannot find res");
          promise.reject("error", "Can't get resource by the path: " + markOpts.backgroundImage.uri);
        } else {
          Log.d(IMAGE_MARKER_TAG, "res：" + resId);

          Resources r = this.getResources();
//                    InputStream is = r.openRawResource(resId);
          Bitmap bitmap = BitmapFactory.decodeResource(r, resId);
//                    Bitmap bitmap = BitmapFactory.decodeStream(is);
          Log.d(IMAGE_MARKER_TAG, bitmap.getHeight() + "");
          Bitmap bg = Utils.scaleBitmap(bitmap, markOpts.backgroundImage.scale);
          Log.d(IMAGE_MARKER_TAG, bg.getHeight() + "");

          if (bitmap != null && !bitmap.isRecycled() && markOpts.backgroundImage.scale != 1) {
            bitmap.recycle();
            System.gc();
          }
          markImageByText(bg, dest, markOpts, promise);
        }
      }
    } catch (Exception e) {
      Log.d(IMAGE_MARKER_TAG, "error：" + e.getMessage());
      e.printStackTrace();
      promise.reject("error", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void markWithImage(
    ReadableMap opts,
    final Promise promise) {
    try {
      MarkImageOptions markOpts = MarkImageOptions.checkParams(opts, promise);
      if (null == markOpts) return;

      final String uri = markOpts.backgroundImage.uri;

      final String dest = generateCacheFilePathForMarker(uri, markOpts.filename, markOpts.saveFormat);

      Log.d(IMAGE_MARKER_TAG, uri);
      Log.d(IMAGE_MARKER_TAG, "src: " + markOpts.backgroundImage.src.toString());
      Log.d(IMAGE_MARKER_TAG, "markerSrc: " + markOpts.watermarkImage.src.toString());

      if (isFrescoImg(uri)) {
        ImageRequest imageRequest = ImageRequest.fromUri(uri);
        if (null != markOpts.maxSize && markOpts.maxSize > 0) {
          setMaxBitmapSize(markOpts.maxSize);
        }
        DataSource<CloseableReference<CloseableImage>> dataSource = getImagePipeline().fetchDecodedImage(imageRequest, null);
        Executor executor = Executors.newSingleThreadExecutor();
        dataSource.subscribe(new BaseBitmapDataSubscriber() {
          @Override
          public void onNewResultImpl(Bitmap bitmap) {
            if (bitmap != null) {
              Bitmap bg = Utils.scaleBitmap(bitmap, markOpts.backgroundImage.scale);
              markImage(bg, dest, markOpts, promise);
            } else {
              promise.reject("marker error", "Can't retrieve the file from the src: " + uri);
            }
          }

          @Override
          public void onFailureImpl(DataSource dataSource) {
            promise.reject("error", "Can't request the image from the uri: " + uri, dataSource.getFailureCause());
          }
        }, executor);
      } else {
        int resId = getDrawableResourceByName(uri);
        if (resId == 0) {
          Log.d(IMAGE_MARKER_TAG, "cannot find res");
          promise.reject("error", "Can't get resource by the path: " + uri);
        } else {
          Log.d(IMAGE_MARKER_TAG, "res：" + resId);

          Resources r = this.getResources();
//                    InputStream is = r.openRawResource(resId);
          Bitmap bitmap = BitmapFactory.decodeResource(r, resId);
//                    Bitmap bitmap = BitmapFactory.decodeStream(is);
          Log.d(IMAGE_MARKER_TAG, bitmap.getHeight() + "");
          Bitmap bg = Utils.scaleBitmap(bitmap, markOpts.backgroundImage.scale);
          Log.d(IMAGE_MARKER_TAG, bg.getHeight() + "");

          if (bitmap != null && !bitmap.isRecycled() && markOpts.backgroundImage.scale != 1) {
            bitmap.recycle();
            System.gc();
          }
          markImage(bg, dest, markOpts, promise);
        }
      }
    } catch (Exception e) {
      Log.d(IMAGE_MARKER_TAG, "error：" + e.getMessage());
      e.printStackTrace();
      promise.reject("error", e.getMessage(), e);
    }

  }

  private String generateCacheFilePathForMarker(String imgSavePath, String filename, SaveFormat saveFormat) {
    String cacheDir = this.getReactApplicationContext().getCacheDir().getAbsolutePath();

    if (saveFormat != null && saveFormat == SaveFormat.BASE64) {
      return BASE64;
    }
    String ext = saveFormat != null && (saveFormat == SaveFormat.PNG || saveFormat.equals("png")) ? ".png" : ".jpg";
    if (null != filename) {
      if (filename.endsWith(".jpg") || filename.endsWith(".png"))
        return cacheDir + "/" + filename;
      else
        return cacheDir + "/" + filename + ext;
    } else {
      String name = UUID.randomUUID().toString() + "imagemarker";

      return cacheDir + "/" + name + ext;
    }
  }
}
