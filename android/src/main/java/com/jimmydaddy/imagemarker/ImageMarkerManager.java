package com.jimmydaddy.imagemarker;

import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.text.TextUtils;
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
import com.facebook.react.views.text.ReactFontManager;
import com.facebook.react.modules.systeminfo.ReactNativeVersion;

import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import static com.facebook.drawee.backends.pipeline.Fresco.getImagePipeline;
import static com.jimmydaddy.imagemarker.Utils.getStringSafe;
import static com.jimmydaddy.imagemarker.Utils.transRGBColor;


/**
 * Created by jimmydaddy on 2017/3/6.
 */


public class ImageMarkerManager extends ReactContextBaseJavaModule {
    private ReactApplicationContext context;
    private static final String PROP_ICON_URI = "uri";
    private static final String IMAGE_MARKER_TAG = "[ImageMarker]";
    private static final String BASE64 = "base64";


    public ImageMarkerManager(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext;
    }

    @Override
    public String getName() {
        return "ImageMarker";
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

    private Bitmap.CompressFormat getSaveFormat(String saveFormat) {
        return saveFormat != null && (saveFormat.equals("png") || saveFormat.equals("PNG"))? Bitmap.CompressFormat.PNG : Bitmap.CompressFormat.JPEG;
    }

    private void setMaxBitmapSize(int maxSize) {
        String major = getStringSafe("major", ReactNativeVersion.VERSION);
        String minor = getStringSafe("minor", ReactNativeVersion.VERSION);
        String patch = getStringSafe("patch", ReactNativeVersion.VERSION);
        if (Integer.valueOf(major) >= 0 && Integer.valueOf(minor) >= 60 && Integer.valueOf(patch) >= 0 ) {
            ImagePipelineConfig config = ImagePipelineConfig.newBuilder(this.context).experiment().setMaxBitmapSize(maxSize).build();
            Fresco.initialize(this.context, config);
        }
    }

    private void markImage(
            final Bitmap bg,
            ReadableMap source,
            final String position,
            final Integer X,
            final Integer Y,
            final Float markerScale,
            final int quality,
            final String dest,
            final String saveFormat,
            final Promise promise)
    {
        try {

//            String resultFile = generateCacheFilePathForMarker(imgSavePath, filename);

            final String uri = source.getString(PROP_ICON_URI);
            Log.d(IMAGE_MARKER_TAG, uri);
            Log.d(IMAGE_MARKER_TAG, source.toString());

            if (isFrescoImg(uri)) {
                ImageRequest imageRequest = ImageRequest.fromUri(uri);
                DataSource<CloseableReference<CloseableImage>> dataSource = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, context);
                Executor executor = Executors.newSingleThreadExecutor();
                dataSource.subscribe(new BaseBitmapDataSubscriber() {
                    @Override
                    public void onNewResultImpl(Bitmap bitmap) {
                        if (bitmap != null) {
                            Bitmap mark = Utils.scaleBitmap(bitmap, markerScale);

                            markImageByBitmap(bg, mark, position, X, Y, quality, dest, saveFormat, promise);
                        } else {
                            promise.reject( "marker error","Can't retrieve the file from the markerpath: " + uri);
                        }
                    }

                    @Override
                    public void onFailureImpl(DataSource dataSource) {
                        promise.reject( "error","Can't request the image from the uri: " + uri, dataSource.getFailureCause());
                    }
                }, executor);
            } else {
                int resId = getDrawableResourceByName(uri);
                if (resId == 0) {
                    Log.d(IMAGE_MARKER_TAG, "cannot find res");
                    promise.reject( "error","Can't get resource by the path: " + uri);
                } else {
                    Log.d(IMAGE_MARKER_TAG, "res：" + resId);

                    Resources r = this.getResources();
//                    InputStream is = r.openRawResource(resId);
                    Bitmap bitmap = BitmapFactory.decodeResource(r, resId);
//                    Bitmap bitmap = BitmapFactory.decodeStream(is);
                    Log.d(IMAGE_MARKER_TAG, bitmap.getHeight() + "");
                    Bitmap mark = Utils.scaleBitmap(bitmap, markerScale);
                    Log.d(IMAGE_MARKER_TAG, mark.getHeight() + "");

                    if (bitmap != null && !bitmap.isRecycled() && markerScale != 1) {
                        bitmap.recycle();
                        System.gc();
                    }
                    markImageByBitmap(bg, mark, position, X, Y, quality, dest, saveFormat, promise);
                }
            }
        } catch (Exception e) {
            Log.d(IMAGE_MARKER_TAG, "error：" + e.getMessage());
            e.printStackTrace();
            promise.reject("error", e.getMessage(), e);
        }
    }


    private void markImageByBitmap (
            Bitmap bg,
            Bitmap marker,
            String position,
            Integer X,
            Integer Y,
            int quality,
            String dest,
            String saveFormat,
            final Promise promise
    ) {
        BufferedOutputStream bos = null;
        Bitmap icon = null;
        try {

            // 原图生成 - start



            int height = bg.getHeight();
            int width =  bg.getWidth();


            icon = Utils.getBlankBitmap(width, height);

            //初始化画布 绘制的图像到icon上
            //建立画笔
            Paint photoPaint = new Paint();
            //获取跟清晰的图像采样
            photoPaint.setDither(true);
            //过滤一些

//            if (percent > 1) {
//                prePhoto = Bitmap.createScaledBitmap(prePhoto, width, height, true);
//            }
            Canvas canvas = new Canvas(icon);


            canvas.drawBitmap(bg, 0, 0, photoPaint);

            // 原图生成 - end


            if (position != null) {
                Position pos = getRectFromPosition(position, marker.getWidth(), marker.getHeight(), width, height);
                canvas.drawBitmap(marker, pos.getX(), pos.getY(), photoPaint);
            } else {
                canvas.drawBitmap(marker, X, Y, photoPaint);
            }

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
                icon.compress(Bitmap.CompressFormat.PNG, quality, base64Stream);
                base64Stream.flush();
                base64Stream.close();
                byte[] bitmapBytes = base64Stream.toByteArray();
                String result = Base64.encodeToString(bitmapBytes, Base64.DEFAULT);
                promise.resolve("data:image/png;base64,".concat(result));
            } else {
                bos = new BufferedOutputStream(new FileOutputStream(dest));

//            int quaility = (int) (100 / percent > 80 ? 80 : 100 / percent);
                icon.compress(getSaveFormat(saveFormat), quality, bos);
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
     *
     * @param bg
     * @param mark
     * @param position
     * @param color
     * @param fontName
     * @param fontSize
     * @param X
     * @param Y
     * @param quality
     * @param dest
     * @param promise
     */
    private void markImageByText(
            Bitmap bg,
            String mark,
            String position,
            String color,
            String fontName,
            Integer fontSize,
            ShadowLayerStyle shadowLayerStyle,
            TextBackgroundStyle textBackgroundStyle,
            Integer X,
            Integer Y,
            int quality,
            String dest,
            String saveFormat,
            final Promise promise
    ) {
        BufferedOutputStream bos = null;
        boolean isFinished;
        Bitmap icon = null;
        try {

            int height = bg.getHeight();
            int width =  bg.getWidth();

            icon = Utils.getBlankBitmap(width, height);
            //初始化画布 绘制的图像到icon上
            Canvas canvas = new Canvas(icon);
            //建立画笔
            Paint photoPaint = new Paint();
            //获取跟清晰的图像采样
            photoPaint.setDither(true);
            //过滤一些
//            if (percent > 1) {
//                prePhoto = Bitmap.createScaledBitmap(prePhoto, width, height, true);
//            }

            canvas.drawBitmap(bg, 0, 0, photoPaint);

            if (bg != null && !bg.isRecycled()) {
                bg.recycle();
                System.gc();
            }

            //设置画笔
            //建立画笔
            TextPaint textPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG | Paint.DEV_KERN_TEXT_FLAG);
            textPaint.setAntiAlias(true);
            if (null != shadowLayerStyle) {
                textPaint.setShadowLayer(shadowLayerStyle.radius, shadowLayerStyle.dx,shadowLayerStyle.dy, shadowLayerStyle.color);
            }
            try {
                //设置字体失败时使用默认字体
                textPaint.setTypeface(ReactFontManager.getInstance().getTypeface(fontName, Typeface.NORMAL, this.getReactApplicationContext().getAssets()) );
            } catch (Exception e) {
                textPaint.setTypeface(Typeface.DEFAULT);
            }

            Integer fSize = 14;
            if (fontSize != null){
                fSize = fontSize;
            }

            textPaint.setTextSize(fSize);
            textPaint.setColor(Color.parseColor(transRGBColor(color)));

            // ALIGN_CENTER, ALIGN_NORMAL, ALIGN_OPPOSITE
            StaticLayout textLayout = new StaticLayout(mark, textPaint, canvas.getWidth(), Layout.Alignment.ALIGN_NORMAL, 1.0f, 0.0f, false);

            int textHeight = textLayout.getHeight();
            int textWidth = 0;
            int count = textLayout.getLineCount();
            for (int a = 0; a < count; a++) {
                textWidth = (int) Math.ceil(Math.max(textWidth, textLayout.getLineWidth(a) + textLayout.getLineLeft(a)));
            }

            int margin = 20;
            float x = margin;
            float y = margin;

            if (position != null) {
                if("topCenter".equals(position)) {
                    x = (width - textWidth)/2;
                } else if("topRight".equals(position)) {
                    x = width - textWidth - margin;
                } else if("center".equals(position)) {
                    x = (width - textWidth) / 2;
                    y = (height - textHeight) / 2;
                } else if("bottomLeft".equals(position)) {
                    y = height - textHeight - margin;
                } else if("bottomCenter".equals(position)) {
                    x = (width - textWidth) / 2;
                    y = (height - textHeight);
                } else if("bottomRight".equals(position)) {
                    x = width - textWidth - margin;
                    y = height - textHeight - margin;
                }
            } else {
                if (null != X) {
                    x = X;
                }
                if ( null != Y) {
                    y = Y;
                }
            }

            // Draw text background
            if(null != textBackgroundStyle) {
                Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.LINEAR_TEXT_FLAG);
                paint.setStyle(Paint.Style.FILL);
                paint.setColor(textBackgroundStyle.color);
                if("stretchX".equals(textBackgroundStyle.type)) {
                    canvas.drawRect(0, y - textBackgroundStyle.paddingY, width, y + textHeight + textBackgroundStyle.paddingY, paint);
                } else if("stretchY".equals(textBackgroundStyle.type)) {
                    canvas.drawRect(x - textBackgroundStyle.paddingX, 0, x + textWidth + textBackgroundStyle.paddingX, height, paint);
                } else {
                    canvas.drawRect(x - textBackgroundStyle.paddingX, y - textBackgroundStyle.paddingY, 
                    x + textWidth + textBackgroundStyle.paddingX, y + textHeight + textBackgroundStyle.paddingY, paint);
                }
            }
            canvas.save();
            canvas.translate(x, y);
            textLayout.draw(canvas);
            canvas.restore();

            if (dest.equals(BASE64)) {
                ByteArrayOutputStream base64Stream = new ByteArrayOutputStream();
                icon.compress(Bitmap.CompressFormat.PNG, quality, base64Stream);
                base64Stream.flush();
                base64Stream.close();
                byte[] bitmapBytes = base64Stream.toByteArray();
                String result = Base64.encodeToString(bitmapBytes, Base64.DEFAULT);
                promise.resolve("data:image/png;base64,".concat(result));
            } else {
                bos = new BufferedOutputStream(new FileOutputStream(dest));
                icon.compress(getSaveFormat(saveFormat) , quality, bos);
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
     *
     * @param src
     * @param mark
     * @param X
     * @param Y
     * @param color
     * @param fontName
     * @param fontSize
     * @param promise
     */
    @ReactMethod
    public void addText(
            ReadableMap src,
            final String mark,
            final Integer X,
            final Integer Y,
            final String color,
            final String fontName,
            final Integer fontSize,
            ReadableMap shadowStyle,
            ReadableMap textBackgroundStyle,
            final float scale,
            final int quality,
            String filename,
            final String saveFormat,
            Integer maxSize,
            final Promise promise
    ) {
        if (TextUtils.isEmpty(mark)){
            promise.reject("error", "mark should not be empty");
        }

        try {

            final String uri = src.getString(PROP_ICON_URI);

            final String dest = generateCacheFilePathForMarker(uri, filename, saveFormat);

            final ShadowLayerStyle myShadowStyle  = null != shadowStyle? new ShadowLayerStyle(shadowStyle) : null;
            final TextBackgroundStyle myTextBackgroundStyle  = null != textBackgroundStyle ? new TextBackgroundStyle(textBackgroundStyle) : null;

            Log.d(IMAGE_MARKER_TAG, uri);
            Log.d(IMAGE_MARKER_TAG, src.toString());

            if (isFrescoImg(uri)) {
                ImageRequest imageRequest = ImageRequest.fromUri(uri);
                if (null != maxSize && maxSize > 0) {
                    setMaxBitmapSize(maxSize);
                }
                DataSource<CloseableReference<CloseableImage>> dataSource = getImagePipeline().fetchDecodedImage(imageRequest, null);
                Executor executor = Executors.newSingleThreadExecutor();
                dataSource.subscribe(new BaseBitmapDataSubscriber() {
                    @Override
                    public void onNewResultImpl(Bitmap bitmap) {
                        if (bitmap != null) {
                            Bitmap bg = Utils.scaleBitmap(bitmap, scale);
                            markImageByText(bg, mark, null, color, fontName, fontSize, myShadowStyle, myTextBackgroundStyle, X, Y, quality, dest, saveFormat, promise);
                        } else {
                            promise.reject( "marker error","Can't retrieve the file from the src: " + uri);
                        }
                    }

                    @Override
                    public void onFailureImpl(DataSource dataSource) {
                        promise.reject( "error","Can't request the image from the uri: " + uri, dataSource.getFailureCause());
                    }
                }, executor);
            } else {
                int resId = getDrawableResourceByName(uri);
                if (resId == 0) {
                    Log.d(IMAGE_MARKER_TAG, "cannot find res");
                    promise.reject( "error","Can't get resource by the path: " + uri);
                } else {
                    Log.d(IMAGE_MARKER_TAG, "res：" + resId);

                    Resources r = this.getResources();
//                    InputStream is = r.openRawResource(resId);
                    Bitmap bitmap = BitmapFactory.decodeResource(r, resId);
//                    Bitmap bitmap = BitmapFactory.decodeStream(is);
                    Log.d(IMAGE_MARKER_TAG, bitmap.getHeight() + "");
                    Bitmap bg = Utils.scaleBitmap(bitmap, scale);
                    Log.d(IMAGE_MARKER_TAG, bg.getHeight() + "");

                    if (bitmap != null && !bitmap.isRecycled() && scale != 1) {
                        bitmap.recycle();
                        System.gc();
                    }
                    markImageByText(bg, mark, null, color, fontName, fontSize, myShadowStyle, myTextBackgroundStyle, X, Y, quality, dest, saveFormat, promise);
                }
            }
        } catch (Exception e) {
            Log.d(IMAGE_MARKER_TAG, "error：" + e.getMessage());
            e.printStackTrace();
            promise.reject("error", e.getMessage(), e);
        }
    }

    /**
     *
     * @param src
     * @param mark
     * @param position
     * @param color
     * @param fontName
     * @param fontSize
     * @param promise
     */
    @ReactMethod
    public void addTextByPostion(
            ReadableMap src,
            final String mark,
            final String position,
            final String color,
            final String fontName,
            final Integer fontSize,
            ReadableMap shadowStyle,
            ReadableMap textBackgroundStyle,
            final float scale,
            final Integer quality,
            String filename,
            final String saveFormat,
            Integer maxSize,
            final Promise promise
    ) {
        if (TextUtils.isEmpty(mark)){
            promise.reject("error", "mark should not be empty");
        }
        try {

            final String uri = src.getString(PROP_ICON_URI);

            final String dest = generateCacheFilePathForMarker(uri, filename, saveFormat);

            final ShadowLayerStyle myShadowStyle  = null != shadowStyle? new ShadowLayerStyle(shadowStyle) : null;
            final TextBackgroundStyle myTextBackgroundStyle  = null != textBackgroundStyle ? new TextBackgroundStyle(textBackgroundStyle) : null;


            Log.d(IMAGE_MARKER_TAG, uri);
            Log.d(IMAGE_MARKER_TAG, src.toString());

            if (isFrescoImg(uri)) {
                ImageRequest imageRequest = ImageRequest.fromUri(uri);
                if (null != maxSize && maxSize > 0) {
                    setMaxBitmapSize(maxSize);
                }
                DataSource<CloseableReference<CloseableImage>> dataSource = getImagePipeline().fetchDecodedImage(imageRequest, null);
                Executor executor = Executors.newSingleThreadExecutor();
                dataSource.subscribe(new BaseBitmapDataSubscriber() {
                    @Override
                    public void onNewResultImpl(Bitmap bitmap) {
                        if (bitmap != null) {
                            Bitmap bg = Utils.scaleBitmap(bitmap, scale);
                            markImageByText(bg, mark, position, color, fontName, fontSize, myShadowStyle, myTextBackgroundStyle, null, null, quality, dest, saveFormat, promise);
                        } else {
                            promise.reject( "marker error","Can't retrieve the file from the src: " + uri);
                        }
                    }

                    @Override
                    public void onFailureImpl(DataSource dataSource) {
                        promise.reject( "error","Can't request the image from the uri: " + uri, dataSource.getFailureCause());
                    }
                }, executor);
            } else {
                int resId = getDrawableResourceByName(uri);
                if (resId == 0) {
                    Log.d(IMAGE_MARKER_TAG, "cannot find res");
                    promise.reject( "error","Can't get resource by the path: " + uri);
                } else {
                    Log.d(IMAGE_MARKER_TAG, "res：" + resId);

                    Resources r = this.getResources();
//                    InputStream is = r.openRawResource(resId);
                    Bitmap bitmap = BitmapFactory.decodeResource(r, resId);
//                    Bitmap bitmap = BitmapFactory.decodeStream(is);
                    Log.d(IMAGE_MARKER_TAG, bitmap.getHeight() + "");
                    Bitmap bg = Utils.scaleBitmap(bitmap, scale);
                    Log.d(IMAGE_MARKER_TAG, bg.getHeight() + "");

                    if (bitmap != null && !bitmap.isRecycled() && scale != 1) {
                        bitmap.recycle();
                        System.gc();
                    }
                    markImageByText(bg, mark, position, color, fontName, fontSize, myShadowStyle, myTextBackgroundStyle, null, null, quality, dest, saveFormat, promise);
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
            ReadableMap src,
            final ReadableMap marker,
            final Integer X,
            final Integer Y,
            final Float scale,
            final Float markerScale,
            final int quality,
            String filename,
            final String saveFormat,
            Integer maxSize,
            final Promise promise ) {


        try {

//            String resultFile = generateCacheFilePathForMarker(imgSavePath, filename);


            final String uri = src.getString(PROP_ICON_URI);

            final String dest = generateCacheFilePathForMarker(uri, filename, saveFormat);

            Log.d(IMAGE_MARKER_TAG, uri);
            Log.d(IMAGE_MARKER_TAG, src.toString());

            if (isFrescoImg(uri)) {
                ImageRequest imageRequest = ImageRequest.fromUri(uri);
                if (null != maxSize && maxSize > 0) {
                    setMaxBitmapSize(maxSize);
                }
                DataSource<CloseableReference<CloseableImage>> dataSource = getImagePipeline().fetchDecodedImage(imageRequest, null);
                Executor executor = Executors.newSingleThreadExecutor();
                dataSource.subscribe(new BaseBitmapDataSubscriber() {
                    @Override
                    public void onNewResultImpl(Bitmap bitmap) {
                        if (bitmap != null) {
                            Bitmap bg = Utils.scaleBitmap(bitmap, scale);
                            markImage(bg, marker, null, X, Y, markerScale, quality, dest, saveFormat, promise);
                        } else {
                            promise.reject( "marker error","Can't retrieve the file from the src: " + uri);
                        }
                    }

                    @Override
                    public void onFailureImpl(DataSource dataSource) {
                        promise.reject( "error","Can't request the image from the uri: " + uri, dataSource.getFailureCause());
                    }
                }, executor);
            } else {
                int resId = getDrawableResourceByName(uri);
                if (resId == 0) {
                    Log.d(IMAGE_MARKER_TAG, "cannot find res");
                    promise.reject( "error","Can't get resource by the path: " + uri);
                } else {
                    Log.d(IMAGE_MARKER_TAG, "res：" + resId);

                    Resources r = this.getResources();
//                    InputStream is = r.openRawResource(resId);
                    Bitmap bitmap = BitmapFactory.decodeResource(r, resId);
//                    Bitmap bitmap = BitmapFactory.decodeStream(is);
                    Log.d(IMAGE_MARKER_TAG, bitmap.getHeight() + "");
                    Bitmap bg = Utils.scaleBitmap(bitmap, scale);
                    Log.d(IMAGE_MARKER_TAG, bg.getHeight() + "");

                    if (bitmap != null && !bitmap.isRecycled() && scale != 1) {
                        bitmap.recycle();
                        System.gc();
                    }
                    markImage(bg, marker, null, X, Y, markerScale, quality, dest, saveFormat, promise);
                }
            }
        } catch (Exception e) {
            Log.d(IMAGE_MARKER_TAG, "error：" + e.getMessage());
            e.printStackTrace();
            promise.reject("error", e.getMessage(), e);
        }

    }

    @ReactMethod
    public void markWithImageByPosition(
            ReadableMap src,
            final ReadableMap marker,
            final String position,
            final Float scale,
            final Float markerScale,
            final int quality,
            final String filename,
            final String saveFormat,
            Integer maxSize,
            final Promise promise ) {

        try {

            final String uri = src.getString(PROP_ICON_URI);

            final String dest = generateCacheFilePathForMarker(uri, filename, saveFormat);

            Log.d(IMAGE_MARKER_TAG, uri);
            Log.d(IMAGE_MARKER_TAG, src.toString());

            if (isFrescoImg(uri)) {
                ImageRequest imageRequest = ImageRequest.fromUri(uri);
                if (null != maxSize && maxSize > 0) {
                    setMaxBitmapSize(maxSize);
                }
                DataSource<CloseableReference<CloseableImage>> dataSource = getImagePipeline().fetchDecodedImage(imageRequest, null);
                Executor executor = Executors.newSingleThreadExecutor();
                dataSource.subscribe(new BaseBitmapDataSubscriber() {
                    @Override
                    public void onNewResultImpl(Bitmap bitmap) {
                        if (bitmap != null) {
                            Bitmap bg = Utils.scaleBitmap(bitmap, scale);
                            markImage(bg, marker, position, 0, 0, markerScale, quality, dest, saveFormat, promise);
                        } else {
                            promise.reject( "marker error","Can't retrieve the file from the src: " + uri);
                        }
                    }

                    @Override
                    public void onFailureImpl(DataSource dataSource) {
                        promise.reject( "error","Can't request the image from the uri: " + uri, dataSource.getFailureCause());
                    }
                }, executor);
            } else {
                int resId = getDrawableResourceByName(uri);
                if (resId == 0) {
                    Log.d(IMAGE_MARKER_TAG, "cannot find res");
                    promise.reject( "error","Can't get resource by the path: " + uri);
                } else {
                    Log.d(IMAGE_MARKER_TAG, "res：" + resId);

                    Resources r = this.getResources();
//                    InputStream is = r.openRawResource(resId);
                    Bitmap bitmap = BitmapFactory.decodeResource(r, resId);
//                    Bitmap bitmap = BitmapFactory.decodeStream(is);
                    Log.d(IMAGE_MARKER_TAG, bitmap.getHeight() + "");
                    Bitmap bg = Utils.scaleBitmap(bitmap, scale);
                    Log.d(IMAGE_MARKER_TAG, bg.getHeight() + "");

                    if (bitmap != null && !bitmap.isRecycled() && scale != 1) {
                        bitmap.recycle();
                        System.gc();
                    }
                    markImage(bg, marker, position, 0, 0, markerScale, quality, dest, saveFormat, promise);
                }
            }
        } catch (Exception e) {
            Log.d(IMAGE_MARKER_TAG, "error：" + e.getMessage());
            e.printStackTrace();
            promise.reject("error", e.getMessage(), e);
        }
    }

    static Position getRectFromPosition(String position, int width, int height, int imageWidth, int imageHeigt){
        Log.d("marker", "getRectFromPosition: "+position +" width:" +width+" height: "+height + " imageWidth: " + imageHeigt+" imageHeigt:" + imageHeigt);

        int left = 20;
        int top = 40;
        int right = imageWidth - width;
        Position pos = new Position(left, top);
        switch (position) {
            case "topLeft":
                Log.d("marker", "getRectFromPosition: "+position);
                break;
            case "topCenter":
                left = (imageWidth)/2-width/2;
                pos.setX(left);
                break;
            case "topRight":
                pos.setX(right-20);
                break;
            case "center":
                left = (imageWidth)/2 - width/2;
                top = (imageHeigt)/2 - height/2;
                pos.setX(left);
                pos.setY(top);
                break;
            case "bottomLeft":
                top = imageHeigt - height;
                pos.setY(top-20);
                break;
            case "bottomRight":
                top = imageHeigt - height;
                left = imageWidth - width - 20;
                pos.setX(left-20);
                pos.setY(top-20);
                break;
            case "bottomCenter":
                top = imageHeigt - height;
                left = (imageWidth)/2 - width/2;
                pos.setX(left-20);
                pos.setY(top-20);

        }
        return pos;
    }

    private String generateCacheFilePathForMarker(String imgSavePath, String filename, String saveFormat){
        String cacheDir = this.getReactApplicationContext().getCacheDir().getAbsolutePath();

        if (saveFormat != null && saveFormat.equals(BASE64)) {
            return BASE64;
        }
        String ext = saveFormat != null && (saveFormat.equals("PNG") || saveFormat.equals("png"))? ".png" : ".jpg";
        if (null != filename) {
            if (filename.endsWith(".jpg") || filename.endsWith(".png"))
                return cacheDir + "/" + filename;
            else
                return cacheDir + "/" + filename + ext;
        } else {
            String name = UUID.randomUUID().toString()+"imagemarker";

            return cacheDir+"/"+name+ext;
        }
    }
}
