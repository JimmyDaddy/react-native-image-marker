package com.jimmydaddy.imagemarker;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.text.TextUtils;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.views.text.ReactFontManager;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.UUID;


/**
 * Created by jimmydaddy on 2017/3/6.
 */

public class ImageMarkerManager extends ReactContextBaseJavaModule {


    public ImageMarkerManager(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ImageMarker";
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
    public void addText(String imgSavePath, String mark, Integer X, Integer Y, String color, String fontName, int fontSize, Promise promise) {
       if (TextUtils.isEmpty(mark)){
           promise.reject("error", "mark should not be empty", null);
       }
        BufferedOutputStream bos = null;
        boolean isFinished;
        Bitmap icon = null;
        try {


            File file = new File(imgSavePath);
            if (!file.exists()){
                promise.reject( "error","Can't retrieve the file from the path.",null);
            }
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            try {
                BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                System.gc();
                System.runFinalization();
                BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空

            }

            int height = options.outHeight;
            int width =  options.outWidth;
            try {
                icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                while(icon == null) {
                    System.gc();
                    System.runFinalization();
                    icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
                }
            }

            //初始化画布 绘制的图像到icon上
            Canvas canvas = new Canvas(icon);
            //建立画笔
            Paint photoPaint = new Paint();
            //获取跟清晰的图像采样
            photoPaint.setDither(true);
            //过滤一些
            //                    photoPaint.setFilterBitmap(true);
            options.inJustDecodeBounds = false;
            Bitmap prePhoto = null;
            try {
                prePhoto = BitmapFactory.decodeFile(imgSavePath);
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                while(prePhoto == null) {
                    System.gc();
                    System.runFinalization();
                    prePhoto = BitmapFactory.decodeFile(imgSavePath);
                }
            }
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
            canvas.drawText(mark, pX, pY, textPaint);

            String resultFile = generateCacheFilePathForMarker(imgSavePath);
            bos = new BufferedOutputStream(new FileOutputStream(resultFile));

//            int quaility = (int) (100 / percent > 80 ? 80 : 100 / percent);
            icon.compress(Bitmap.CompressFormat.JPEG, 80, bos);
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
    public void addTextByPostion(String imgSavePath, String mark, String position, String color, String fontName, Integer fontSize, Promise promise) {
        if (TextUtils.isEmpty(mark)){
            promise.reject("error", "mark should not be empty", null);
        }
        BufferedOutputStream bos = null;
        boolean isFinished;
        Bitmap icon = null;
        try {
            File file = new File(imgSavePath);
            if (!file.exists()){
                promise.reject("error", imgSavePath+"not exist", null);
            }
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            //获取图片信息
            try {
                BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                System.gc();
                System.runFinalization();
                BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空

            }
//            float percent =
//                    options.outHeight > options.outWidth ? options.outHeight / 960f : options.outWidth / 960f;

//            if (percent < 1) {
//                percent = 1;
//            }
//            int width = (int) (options.outWidth / percent);
//            int height = (int) (options.outHeight / percent);
            int height = options.outHeight;
            int width =  options.outWidth;

            //根据图片宽高创建画布
            try {
                icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                while(icon == null) {
                    System.gc();
                    System.runFinalization();
                    icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
                }
            }

            //初始化画布 绘制的图像到icon上
            Canvas canvas = new Canvas(icon);
            //建立画笔
            Paint photoPaint = new Paint();
            //获取跟清晰的图像采样
            photoPaint.setDither(true);
            //过滤一些
            //                    photoPaint.setFilterBitmap(true);
            options.inJustDecodeBounds = false;
            //创建画布背
            Bitmap originBitMap = BitmapFactory.decodeFile(imgSavePath);
            canvas.drawBitmap(originBitMap, 0, 0, photoPaint);
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

            canvas.drawText(mark, pos.getX(), pos.getY(), textPaint);

            canvas.save(Canvas.ALL_SAVE_FLAG);
            canvas.restore();

            String resultFile = generateCacheFilePathForMarker(imgSavePath);
            bos = new BufferedOutputStream(new FileOutputStream(resultFile));

//            int quaility = (int) (100 / percent > 80 ? 80 : 100 / percent);
            icon.compress(Bitmap.CompressFormat.JPEG, 80, bos);
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
    public void markWithImage(String imgSavePath, String markerPath, Integer X, Integer Y, Float scale, Promise promise ) {
        BufferedOutputStream bos = null;
        boolean isFinished;
        Bitmap icon = null;
        Bitmap marker = null;

        try {

            // 原图生成 - start
            File file = new File(imgSavePath);
            if (!file.exists()){
                promise.reject( "error","Can't retrieve the file from the path.",null);
            }
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            try {
                BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                System.gc();
                System.runFinalization();
                BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空

            }

            int height = options.outHeight;
            int width =  options.outWidth;
            try {
                icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                while(icon == null) {
                    System.gc();
                    System.runFinalization();
                    icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
                }
            }

            //初始化画布 绘制的图像到icon上
            //建立画笔
            Paint photoPaint = new Paint();
            //获取跟清晰的图像采样
            photoPaint.setDither(true);
            //过滤一些
            //                    photoPaint.setFilterBitmap(true);
            options.inJustDecodeBounds = false;
            Bitmap prePhoto = null;
            try {
                prePhoto = BitmapFactory.decodeFile(imgSavePath);
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                while(prePhoto == null) {
                    System.gc();
                    System.runFinalization();
                    prePhoto = BitmapFactory.decodeFile(imgSavePath);
                }
            }
//            if (percent > 1) {
//                prePhoto = Bitmap.createScaledBitmap(prePhoto, width, height, true);
//            }
            Canvas canvas = new Canvas(icon);


            canvas.drawBitmap(prePhoto, 0, 0, photoPaint);

            if (prePhoto != null && !prePhoto.isRecycled()) {
                prePhoto.recycle();
                prePhoto = null;
                System.gc();
            }

            // 原图生成 - end

            // marker生成 -start
            File markerFile = new File(markerPath);
            if (!markerFile.exists()){
                promise.reject( "error","Can't retrieve the file from the path.",null);
            }
            BitmapFactory.Options markerOptions = new BitmapFactory.Options();


            try {
                prePhoto = BitmapFactory.decodeFile(markerPath, markerOptions);
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                while(prePhoto == null) {
                    System.gc();
                    System.runFinalization();
                    prePhoto = BitmapFactory.decodeFile(markerPath, markerOptions);
                }
            }

            Bitmap newMarker = prePhoto;

            if (scale != 1 && scale >= 0){

                // 取得想要缩放的matrix参数
                Matrix matrix = new Matrix();
                matrix.postScale(scale, scale);
                // 得到新的图片
                newMarker = Bitmap.createBitmap(prePhoto, 0, 0, markerOptions.outWidth, markerOptions.outHeight, matrix,
                        true);
            }


            canvas.drawBitmap(newMarker, X, Y, photoPaint);


            if (prePhoto != null && !prePhoto.isRecycled()) {
                prePhoto.recycle();
                System.gc();
            }

            if (newMarker != null && !newMarker.isRecycled()){
                newMarker.recycle();
                System.gc();
            }


            // 保存
            canvas.save(Canvas.ALL_SAVE_FLAG);
            // 存储
            canvas.restore();
            String resultFile = generateCacheFilePathForMarker(imgSavePath);
            bos = new BufferedOutputStream(new FileOutputStream(resultFile));

//            int quaility = (int) (100 / percent > 80 ? 80 : 100 / percent);
            icon.compress(Bitmap.CompressFormat.JPEG, 80, bos);
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

    @ReactMethod
    public void markWithImageByPosition(String imgSavePath, String markerPath, String position, Float scale, Promise promise ) {
        BufferedOutputStream bos = null;
        Bitmap icon = null;
        Bitmap marker = null;
        try {

            // 原图生成 - start
            File file = new File(imgSavePath);
            if (!file.exists()){
                promise.reject( "error","Can't retrieve the file from the path.",null);
            }
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            try {
                BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                System.gc();
                System.runFinalization();
                BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空

            }

            int height = options.outHeight;
            int width =  options.outWidth;
            try {
                icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                while(icon == null) {
                    System.gc();
                    System.runFinalization();
                    icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
                }
            }

            //初始化画布 绘制的图像到icon上
            Canvas canvas = new Canvas(icon);
            //建立画笔
            Paint photoPaint = new Paint();
            //获取跟清晰的图像采样
            photoPaint.setDither(true);
            //过滤一些
            //                    photoPaint.setFilterBitmap(true);
            options.inJustDecodeBounds = false;
            Bitmap prePhoto = null;
            try {
                prePhoto = BitmapFactory.decodeFile(imgSavePath);
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                while(prePhoto == null) {
                    System.gc();
                    System.runFinalization();
                    prePhoto = BitmapFactory.decodeFile(imgSavePath);
                }
            }
//            if (percent > 1) {
//                prePhoto = Bitmap.createScaledBitmap(prePhoto, width, height, true);
//            }

            canvas.drawBitmap(prePhoto, 0, 0, photoPaint);

            if (prePhoto != null && !prePhoto.isRecycled()) {
                prePhoto.recycle();
                prePhoto = null;
                System.gc();
            }

            // 原图生成 - end

            // marker生成 -start
//            ImageLoaderModule loader = new ImageLoaderModule()

            // marker生成 -start
            File markerFile = new File(markerPath);
            if (!markerFile.exists()){
                promise.reject( "error","Can't retrieve the file from the path.",null);
            }
            BitmapFactory.Options markerOptions = new BitmapFactory.Options();


            try {
                prePhoto = BitmapFactory.decodeFile(markerPath, markerOptions);
            } catch (OutOfMemoryError e) {
                System.out.print(e.getMessage());
                while(prePhoto == null) {
                    System.gc();
                    System.runFinalization();
                    prePhoto = BitmapFactory.decodeFile(markerPath, markerOptions);
                }
            }

            Bitmap newMarker = prePhoto;

            if (scale != 1 && scale >= 0){

                // 取得想要缩放的matrix参数
                Matrix matrix = new Matrix();
                matrix.postScale(scale, scale);
                // 得到新的图片
                newMarker = Bitmap.createBitmap(prePhoto, 0, 0, markerOptions.outWidth, markerOptions.outHeight, matrix,
                        true);
            }

            Position pos = getRectFromPosition(position, newMarker.getWidth(), newMarker.getHeight(), width, height);



            canvas.drawBitmap(newMarker, pos.getX(), pos.getY(), photoPaint);



            if (prePhoto != null && !prePhoto.isRecycled()) {
                prePhoto.recycle();
                System.gc();
            }

            if (newMarker != null && !newMarker.isRecycled()){
                newMarker.recycle();
                System.gc();
            }


            // 保存
            canvas.save(Canvas.ALL_SAVE_FLAG);
            // 存储
            canvas.restore();

            String resultFile = generateCacheFilePathForMarker(imgSavePath);
            bos = new BufferedOutputStream(new FileOutputStream(resultFile));

//            int quaility = (int) (100 / percent > 80 ? 80 : 100 / percent);
            icon.compress(Bitmap.CompressFormat.JPEG, 80, bos);
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
                pos.setX(right);
                break;
            case "center":
                left = (imageWidth)/2 - width/2;
                top = (imageHeigt)/2 - height/2;
                pos.setX(left);
                pos.setY(top);
                break;
            case "bottomLeft":
                top = imageHeigt - height;
                pos.setY(top);
                break;
            case "bottomRight":
                top = imageHeigt - height;
                left = imageWidth - width - 20;
                pos.setX(left);
                pos.setY(top);
                break;
            case "bottomCenter":
                top = imageHeigt - height;
                left = (imageWidth)/2 - width/2;
                pos.setX(left);
                pos.setY(top);

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
