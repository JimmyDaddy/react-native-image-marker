package com.jimmydaddy.imagemarker;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.util.Log;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

/**
 * Created by jimmydaddy on 2018/4/8.
 */

public class Utils {
    public static String TAG = "[ImageMarker]";
    /**
     * 获取最大内存使用
     * @return
     */
    public  static int getMaxMemory () {
        return (int)Runtime.getRuntime().maxMemory()/1024;
    }


    /**
     * read stream from remote
     * @param url
     * @return
     */
    private InputStream getStreamFromInternet(String url) {
        HttpURLConnection connection = null;
        try {
            URL mUrl = new URL(url);
            connection = (HttpURLConnection) mUrl.openConnection();
            connection.setRequestMethod("GET");
            // 10 秒超时时间
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);

            connection.connect();

            int responeseCode = connection.getResponseCode();

            if (responeseCode == 200) {
                InputStream is = connection.getInputStream();
                return is;
            } else {
                Log.d(TAG, "getStreamFromInternet: read stream from remote: "+url+ " failed");
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (connection != null){
                connection.disconnect();
            }
        }
        return null;
    }


    public static Bitmap getBlankBitmap(int width, int height){
        Bitmap icon = null;
        try {
            icon = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        } catch (OutOfMemoryError e) {
            System.out.print(e.getMessage());
            while(icon == null) {
                System.gc();
                System.runFinalization();
                icon = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
            }
        }

        return icon;
    }

    public static int readDegree(String path) {
        int degree  = 0;
        try {
            ExifInterface exifInterface = new ExifInterface(path);
            int orientation = exifInterface.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            switch (orientation) {
                case ExifInterface.ORIENTATION_ROTATE_90:
                    degree = 90;
                    break;
                case ExifInterface.ORIENTATION_ROTATE_180:
                    degree = 180;
                    break;
                case ExifInterface.ORIENTATION_ROTATE_270:
                    degree = 270;
                    break;
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return degree;
    }


    public static Bitmap scaleBitmap(String path, Float scale) {
        int degree = readDegree(path);

        BitmapFactory.Options options = new BitmapFactory.Options();
        Bitmap prePhoto = null;
        options.inPurgeable = true;
        options.inInputShareable = true;
        options.inSampleSize = scale.intValue();
        try {
            prePhoto = BitmapFactory.decodeFile(path, options);
        } catch (OutOfMemoryError e) {
            System.out.print(e.getMessage());
            while(prePhoto == null) {
                System.gc();
                System.runFinalization();
                prePhoto = BitmapFactory.decodeFile(path, options);
            }
        }
//

        if(prePhoto == null)
            return null ;

        int w = options.outWidth;
        int h = options.outHeight;

        Matrix mtx = new Matrix();
        mtx.postRotate(degree);
        if (scale != 1 && scale >= 0) {
            mtx.postScale(scale, scale);
        }

        Bitmap scaledBitmap = null;

        try {
            scaledBitmap = Bitmap.createBitmap(prePhoto, 0, 0, w, h, mtx, true);
        } catch (OutOfMemoryError e) {
            System.out.print(e.getMessage());
            while(scaledBitmap == null) {
                System.gc();
                System.runFinalization();
                scaledBitmap = Bitmap.createBitmap(prePhoto, 0, 0, w, h, mtx, true);
            }
        }
        return scaledBitmap;
    }

    public static Bitmap scaleBitmap(Bitmap bitmap, Float scale) {
        int w = bitmap.getWidth();
        int h = bitmap.getHeight();

        Matrix mtx = new Matrix();
        if (scale != 1 && scale >= 0) {
            mtx.postScale(scale, scale);
        }

        Bitmap scaledBitmap = null;

        try {
            scaledBitmap = Bitmap.createBitmap(bitmap, 0, 0, w, h, mtx, true);
        } catch (OutOfMemoryError e) {
            System.out.print(e.getMessage());
            while(scaledBitmap == null) {
                System.gc();
                System.runFinalization();
                scaledBitmap = Bitmap.createBitmap(bitmap, 0, 0, w, h, mtx, true);
            }
        }
        return scaledBitmap;
    }
    
    public static String transRGBColor(String color) {
        String colorStr = color.substring(1);
        if (colorStr.length() == 3) {
            String fullColor = "";
            for (int i = 0; i < colorStr.length(); i++) {
                String temp = colorStr.substring(i, i + 1);
                fullColor += temp + temp;
            }
            return "#"+fullColor;
        } if (colorStr.length() == 4) {
            String alpha = colorStr.substring(3, 4);
            String hexColor = colorStr.substring(0, 3);
            String fullColor = alpha + alpha;
            for (int i = 0; i < hexColor.length(); i++) {
                String temp = colorStr.substring(i, i + 1);
                fullColor += temp + temp;
            }
            return "#"+fullColor;
        } if(colorStr.length() == 8) {
            String alpha = colorStr.substring(6, 8);
            String hexColor = colorStr.substring(0, 6);
            return "#" + alpha + hexColor;
        } else {
            return color;
        }
    }

    public static String getStringSafe(String key, Map<String, Object> map) {
        Object obj = map.get(key);
        return (obj != null) ? obj.toString() : null;
    }

//
//    public static BitmapFactory.Options getOptions () {
//
//    }


}
