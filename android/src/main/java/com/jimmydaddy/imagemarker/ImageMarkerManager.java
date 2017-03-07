package com.jimmydaddy.imagemarker;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.text.TextUtils;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.BufferedOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;


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
     * @param callback
     */
    @ReactMethod
    public static void addText(String imgSavePath, String mark, Integer X, Integer Y, String color, String fontName, int fontSize, Callback callback) {
       if (TextUtils.isEmpty(mark)){
           callback.invoke(imgSavePath);
       }
        BufferedOutputStream bos = null;
        boolean isFinished;
        Bitmap icon = null;
        try {
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空
            float percent =
                    options.outHeight > options.outWidth ? options.outHeight / 960f : options.outWidth / 960f;

            if (percent < 1) {
                percent = 1;
            }
            int width = (int) (options.outWidth / percent);
            int height = (int) (options.outHeight / percent);
            icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);

            //初始化画布 绘制的图像到icon上
            Canvas canvas = new Canvas(icon);
            //建立画笔
            Paint photoPaint = new Paint();
            //获取跟清晰的图像采样
            photoPaint.setDither(true);
            //过滤一些
            //                    photoPaint.setFilterBitmap(true);
            options.inJustDecodeBounds = false;

            Bitmap prePhoto = BitmapFactory.decodeFile(imgSavePath);
            if (percent > 1) {
                prePhoto = Bitmap.createScaledBitmap(prePhoto, width, height, true);
            }

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
            try {
                textPaint.setTypeface(Typeface.create(fontName, Typeface.NORMAL));
            } catch (Exception e) {

            } finally {
                textPaint.setTypeface(Typeface.DEFAULT);
            }
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

            bos = new BufferedOutputStream(new FileOutputStream(imgSavePath));

            int quaility = (int) (100 / percent > 80 ? 80 : 100 / percent);
            icon.compress(Bitmap.CompressFormat.JPEG, quaility, bos);
            bos.flush();
            //保存成功的
            callback.invoke(imgSavePath);
        } catch (Exception e) {
            e.printStackTrace();
            callback.invoke(e);
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
     * @param sizeWidth
     * @param sizeHeight
     * @param color
     * @param fontName
     * @param fontSize
     * @param callback
     */
    @ReactMethod
    public static void addTextByPostion(String imgSavePath, String mark, String position, Integer sizeWidth, Integer sizeHeight, String color, String fontName, Integer fontSize, Callback callback) {
        if (TextUtils.isEmpty(mark)){
            callback.invoke(imgSavePath);
        }
        BufferedOutputStream bos = null;
        boolean isFinished;
        Bitmap icon = null;
        try {

            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            //获取图片信息
            BitmapFactory.decodeFile(imgSavePath, options); //此时返回bm为空

            float percent =
                    options.outHeight > options.outWidth ? options.outHeight / 960f : options.outWidth / 960f;

            if (percent < 1) {
                percent = 1;
            }
            int width = (int) (options.outWidth / percent);
            int height = (int) (options.outHeight / percent);

            //根据图片宽高创建画布
            icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);

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

            Integer rectWidth = 120;
            Integer rectHeight = 211;

            if (sizeHeight != null){
                rectHeight = sizeHeight;
            }

            if (sizeWidth != null){
                rectWidth = sizeWidth;
            }


            Rect textBounds = getRectFromPosition(position, rectWidth, rectHeight, width, height);

            textPaint.setAntiAlias(true);

            //设置字体失败时使用默认字体
            try {
                textPaint.setTypeface(Typeface.create(fontName, Typeface.NORMAL));
            } catch (Exception e) {

            } finally {
                textPaint.setTypeface(Typeface.DEFAULT);
            }

            Integer fSize = 14;
            if (fontSize != null){
                fSize = fontSize;
            }

            textPaint.setTextSize(fSize);



            textPaint.getTextBounds(mark, 0, mark.length(), textBounds);
            textPaint.setColor(Color.parseColor(color));

            float textX = width - textBounds.width();
            float textY = height - textBounds.height();

            canvas.drawText(mark, textX, textY, textPaint);

            canvas.save(Canvas.ALL_SAVE_FLAG);
            canvas.restore();

            bos = new BufferedOutputStream(new FileOutputStream(imgSavePath));

            int quaility = (int) (100 / percent > 80 ? 80 : 100 / percent);


            icon.compress(Bitmap.CompressFormat.JPEG, quaility, bos);

            bos.flush();
            //保存成功的
            callback.invoke(imgSavePath);
        } catch (Exception e) {
            e.printStackTrace();
            callback.invoke(e.getMessage());
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


    static Rect getRectFromPosition(String position, int width, int height, int imageWidth, int imageHeigt){
        Rect rect = new Rect();
        int left = 20;
        int top = 20;
        int right = 20+width;
        int bottom = height + 20;
        switch (position) {
            case "topLeft":
                return new Rect(left, top, right, bottom);
            case "topCenter":
                left = (imageWidth)/2 - width;
                right = (imageWidth)/2 + width;

                return new Rect(left, top, right, bottom);
            case "topRight":
                left = imageWidth - width - 20;
                right = imageWidth - 20;
                return new Rect(left, top, right, bottom);
            case "center":
                left = (imageWidth)/2 - width;
                right = (imageWidth)/2 + width;
                top = (imageHeigt)/2 - height;
                bottom = (imageHeigt)/2 - height;
                return new Rect(left, top, right, bottom);
            case "bottomLeft":
                top = imageHeigt - height;
                bottom = imageHeigt;
                return new Rect(left, top, right, bottom);
            case "bottomRight":
                top = imageHeigt - height;
                bottom = imageHeigt;
                left = imageWidth - width - 20;
                right = imageWidth - 30;
                return new Rect(left, top, right, bottom);
            case "bottomCenter":
                top = imageHeigt - height;
                bottom = imageHeigt;
                left = (imageWidth)/2 - width;
                right = (imageWidth)/2 + width;
                return new Rect(left, top, right, bottom);
            default:
                return new Rect(left, top, right, bottom);


        }
    }
}
