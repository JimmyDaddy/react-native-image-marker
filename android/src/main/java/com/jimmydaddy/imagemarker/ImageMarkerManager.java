package com.jimmydaddy.imagemarker;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.support.annotation.Nullable;
import android.text.TextUtils;
import android.util.Log;
import android.content.res.*;

import com.facebook.common.references.CloseableReference;
import com.facebook.datasource.DataSource;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.imagepipeline.datasource.BaseBitmapDataSubscriber;
import com.facebook.imagepipeline.image.CloseableImage;
import com.facebook.imagepipeline.request.ImageRequest;
import com.facebook.imagepipeline.request.ImageRequestBuilder;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.views.text.ReactFontManager;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;


/**
 * Created by jimmydaddy on 2017/3/6.
 */


public class ImageMarkerManager extends ReactContextBaseJavaModule {
    private ReactApplicationContext context;
    private static final String PROP_ICON_URI = "uri";
    private static final String IMAGE_MARKER_TAG = "[ImageMarker]";


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

    private Drawable getDrawableByName(String name) {
        int drawableResId = getDrawableResourceByName(name);
        if (drawableResId != 0) {
            return getResources().getDrawable(getDrawableResourceByName(name));
        } else {
            return null;
        }
    }

    private void markImage(
            final String imgSavePath,
            ReadableMap source,
            final String position,
            final Integer X,
            final Integer Y,
            final Float scale,
            final Float markerScale,
            final int quality,
            final Promise promise) {
        try {
            String preImgPath = imgSavePath;
            if (imgSavePath.startsWith("file://")) {
                preImgPath = imgSavePath.replace("file://", "");
            }
            File file = new File(preImgPath);
            if (!file.exists()){
                promise.reject( "error","Can't retrieve the file from the path: " + imgSavePath,null);
                return;
            }

            final String uri = source.getString(PROP_ICON_URI);

            Log.d(IMAGE_MARKER_TAG, uri);
            Log.d(IMAGE_MARKER_TAG, source.toString());

            if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://")) {
                ImageRequest imageRequest = ImageRequest.fromUri(uri);
                DataSource<CloseableReference<CloseableImage>> dataSource = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, null);
                Executor executor = Executors.newSingleThreadExecutor();
                dataSource.subscribe(new BaseBitmapDataSubscriber() {
                    @Override
                    public void onNewResultImpl(@Nullable Bitmap bitmap) {
                        if (bitmap != null) {
                            Bitmap mark = Utils.scaleBitmap(bitmap, markerScale);
                            String preImgPath = imgSavePath;
                            if (imgSavePath.startsWith("file://")) {
                                preImgPath = imgSavePath.replace("file://", "");
                            }
                            markImageByBitmap(preImgPath, mark, position, X, Y, scale, quality, promise);
                        } else {
                            promise.reject( "error","Can't retrieve the file from the path: " + uri,null);
                        }
                    }

                    @Override
                    public void onFailureImpl(DataSource dataSource) {
                        promise.reject( "error","Can't request the image from the uri: " + uri,null);
                    }
                }, executor);
            } else {
                int resId = getDrawableResourceByName(uri);
                if (resId == 0) {
                    Log.d(IMAGE_MARKER_TAG, "cannot find res");
                    promise.reject( "error","Can't get resource by the path: " + uri,null);
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
                    markImageByBitmap(preImgPath, mark, position, X, Y, scale, quality, promise);
                }
            }
        } catch (Exception e) {
            Log.d(IMAGE_MARKER_TAG, "error：" + e.getMessage());
            e.printStackTrace();
            promise.reject("error", e.getMessage(), e);
        }
    }


    private void markImageByBitmap (String imgSavePath, Bitmap marker, String position, Integer X, Integer Y, Float scale, int qulaity, final Promise promise) {
        BufferedOutputStream bos = null;
        Bitmap icon = null;
        try {

            // 原图生成 - start


            Bitmap prePhoto = Utils.scaleBitmap(imgSavePath, scale);


            int height = prePhoto.getHeight();
            int width =  prePhoto.getWidth();


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


            canvas.drawBitmap(prePhoto, 0, 0, photoPaint);

            // 原图生成 - end


            if (position != null) {
                Position pos = getRectFromPosition(position, marker.getWidth(), marker.getHeight(), width, height);
                canvas.drawBitmap(marker, pos.getX(), pos.getY(), photoPaint);
            } else {
                canvas.drawBitmap(marker, X, Y, photoPaint);
            }

            if (prePhoto != null && !prePhoto.isRecycled()) {
                prePhoto.recycle();
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
            String resultFile = generateCacheFilePathForMarker(imgSavePath);
            bos = new BufferedOutputStream(new FileOutputStream(resultFile));

//            int quaility = (int) (100 / percent > 80 ? 80 : 100 / percent);
            icon.compress(Bitmap.CompressFormat.JPEG, qulaity, bos);
            bos.flush();
            //保存成功的
            promise.resolve(resultFile);
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
     * @param imgSavePath
     * @param mark
     * @param X
     * @param Y
     * @param color
     * @param fontName
     * @param fontSize
     * @param promise
     */
    @ReactMethod
    public void addText(String imgSavePath, String mark, Integer X, Integer Y, String color, String fontName, int fontSize, float scale, int quality,  Promise promise) {
       if (TextUtils.isEmpty(mark)){
           promise.reject("error", "mark should not be empty", null);
       }
        BufferedOutputStream bos = null;
        boolean isFinished;
        Bitmap icon = null;
        try {


            String preImgPath = imgSavePath;
            if (imgSavePath.startsWith("file://")) {
                preImgPath = imgSavePath.replace("file://", "");
            }

            File file = new File(preImgPath);
            if (!file.exists()){
                promise.reject( "error","Can't retrieve the file from the path.",null);
                return;
            }
            Bitmap prePhoto = Utils.scaleBitmap(preImgPath, scale);


            int height = prePhoto.getHeight();
            int width =  prePhoto.getWidth();


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

            canvas.drawBitmap(prePhoto, 0, 0, photoPaint);

            if (prePhoto != null && !prePhoto.isRecycled()) {
                prePhoto.recycle();
                prePhoto = null;
                System.gc();
            }

            //设置画笔
            Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DEV_KERN_TEXT_FLAG);
            //字体大小
            textPaint.setTextSize(fontSize);

//            textPaint.setTypeface(Typeface.DEFAULT);
            //设置字体失败时使用默认字体

             textPaint.setTypeface(ReactFontManager.getInstance().getTypeface(fontName, Typeface.NORMAL, this.getReactApplicationContext().getAssets()) );

            //采用的颜色
            textPaint.setColor(Color.parseColor(color));
            //阴影设置
            //                textPaint.setShadowLayer(3f, 1, 1, Color.DKGRAY);
            float textWidth = textPaint.measureText(mark);

            float pX = width - textWidth - 30.0f;
            float pY = height - 30.0f;

            if (X != null){
                pX = X;
            }

            if (Y != null) {
                pY = Y;
            }
            String[] markParts = mark.split("\\n");
            Integer numOfTextLines = 0;
            for (String textLine : markParts) {
                canvas.drawText(textLine, pX, pY + numOfTextLines * 50, textPaint);
                numOfTextLines++;
            }
            String resultFile = generateCacheFilePathForMarker(imgSavePath);
            bos = new BufferedOutputStream(new FileOutputStream(resultFile));

            icon.compress(Bitmap.CompressFormat.JPEG, quality, bos);
            bos.flush();
            //保存成功的
            promise.resolve(resultFile);
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
                icon = null;
                System.gc();
            }
        }
    }

    /**
     *
     * @param imgSavePath
     * @param mark
     * @param position
     * @param color
     * @param fontName
     * @param fontSize
     * @param promise
     */
    @ReactMethod
    public void addTextByPostion(String imgSavePath, String mark, String position, String color, String fontName, Integer fontSize, float scale, Integer quality, Promise promise) {
        if (TextUtils.isEmpty(mark)){
            promise.reject("error", "mark should not be empty", null);
        }
        BufferedOutputStream bos = null;
        boolean isFinished;
        Bitmap icon = null;
        try {
            String preImgPath = imgSavePath;
            if (imgSavePath.startsWith("file://")) {
                preImgPath = imgSavePath.replace("file://", "");
            }

            File file = new File(preImgPath);
            if (!file.exists()){
                promise.reject( "error","Can't retrieve the file from the path.",null);
                return;
            }
            Bitmap prePhoto = Utils.scaleBitmap(preImgPath, scale);


            int height = prePhoto.getHeight();
            int width =  prePhoto.getWidth();


            icon = Utils.getBlankBitmap(width, height);

            //初始化画布 绘制的图像到icon上
            Canvas canvas = new Canvas(icon);
            //建立画笔
            Paint photoPaint = new Paint();
            //获取跟清晰的图像采样
            photoPaint.setDither(true);
            //过滤一些
            //                    photoPaint.setFilterBitmap(true);
            //创建画布背
            canvas.drawBitmap(prePhoto, 0, 0, photoPaint);
            //建立画笔
            Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DEV_KERN_TEXT_FLAG);

            //文字区域
            //获取size

            int left = 20;
            int top = 20;
            int right = 20+width;
            int bottom = height + 20;
            Rect textBounds = new Rect(left, top, right, bottom);

            textPaint.setAntiAlias(true);

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



            textPaint.getTextBounds(mark, 0, mark.length(), textBounds);
            textPaint.setColor(Color.parseColor(color));
            Position pos = getRectFromPosition(position, textBounds.width(), textBounds.height(), width, height);

            String[] markParts = mark.split("\\n");
            Integer numOfTextLines = 0;
            for (String textLine : markParts) {
                canvas.drawText(textLine, pos.getX(), pos.getY() + numOfTextLines * 50, textPaint);
                numOfTextLines++;
            }
            // canvas.save(Canvas.ALL_SAVE_FLAG);
            canvas.save();
            canvas.restore();

            String resultFile = generateCacheFilePathForMarker(imgSavePath);
            bos = new BufferedOutputStream(new FileOutputStream(resultFile));

//            int quaility = (int) (100 / percent > 80 ? 80 : 100 / percent);
            icon.compress(Bitmap.CompressFormat.JPEG, quality, bos);
            bos.flush();
            //保存成功的
            promise.resolve(resultFile);
        } catch (Exception e) {
            e.printStackTrace();
            promise.reject("error",e.getMessage(), e);
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
                icon = null;
                System.gc();
            }
        }
    }

    @ReactMethod
    public void markWithImage(String imgSavePath, ReadableMap marker, Integer X, Integer Y, Float scale, Float markerScale, int quality, final Promise promise ) {
        markImage(imgSavePath, marker, null, X, Y, scale, markerScale, quality, promise);
    }

    @ReactMethod
    public void markWithImageByPosition(String imgSavePath, ReadableMap marker, String position, Float scale, Float markerScale, int quality, final Promise promise ) {
        markImage(imgSavePath, marker, position, 0, 0, scale, markerScale, quality, promise);
    }

    static Position getRectFromPosition(String position, int width, int height, int imageWidth, int imageHeigt){
        Log.d("marker", "getRectFromPosition: "+position +" width:" +width+" height: "+height + " imageWidth: " + imageHeigt+" imageHeigt:" + imageHeigt);

        int left = 20;
        int top = 40;
        int right = imageWidth - width;
        Position pos = new Position(left, top);
        switch (position) {
            case "topLeft":
                Log.e("marker", "getRectFromPosition: "+position);
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

    private String generateCacheFilePathForMarker(String imgSavePath){
        String originName = imgSavePath.substring(imgSavePath.lastIndexOf("/") + 1, imgSavePath.length());

        String cacheDir = this.getReactApplicationContext().getCacheDir().getAbsolutePath();

        String name = UUID.randomUUID().toString()+"imagemarker"+originName;

        return cacheDir+"/"+name+".jpg";
    }
}
