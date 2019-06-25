package com.jimmydaddy.imagemarker;

import android.graphics.Color;
import android.util.Log;

import com.facebook.react.bridge.ReadableMap;

import static com.jimmydaddy.imagemarker.Utils.transRGBColor;

/**
 * Created by jimmydaddy on 2019/2/25.
 */

public class ShadowLayerStyle {
    public float radius = 0F;
    public float dx = 0F;
    public float dy = 0F;
    public int color = Color.TRANSPARENT;

    public ShadowLayerStyle(float radius, float dx, float dy, int color) {
        this.radius = radius;
        this.dx = dx;
        this.dy = dy;
        this.color = color;
    }

    public ShadowLayerStyle(ReadableMap readableMap) {
        if (null != readableMap) {
            try {
                this.setColor(readableMap.getString("color"));
                this.setDx((float) readableMap.getDouble("dx"));
                this.setDy((float) readableMap.getDouble("dy"));
                this.setRadius((float) readableMap.getDouble("radius"));
            } catch (Exception e) {
                Log.d(Utils.TAG, "Unknown shadow style options ", e);
            }

        }
    }

    public float getRadius() {
        return radius;
    }

    public float getDx() {
        return dx;
    }

    public float getDy() {
        return dy;
    }

    public int getColor() {
        return color;
    }

    public void setRadius(float radius) {
        this.radius = radius;
    }

    public void setDx(float dx) {
        this.dx = dx;
    }

    public void setDy(float dy) {
        this.dy = dy;
    }

    public void setColor(int color) {
        this.color = color;
    }

    public void setColor(String color) {
        try {
            Integer parsedColor = Color.parseColor(transRGBColor(color));
            if (null != parsedColor) {
                this.setColor(parsedColor);
            }
        } catch (Exception e) {
            Log.d(Utils.TAG, "Unknown color string ", e);
        }

    }
}
