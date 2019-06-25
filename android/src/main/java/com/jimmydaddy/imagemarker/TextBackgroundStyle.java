package com.jimmydaddy.imagemarker;

import android.graphics.Color;
import android.util.Log;
import com.facebook.react.bridge.ReadableMap;

import static com.jimmydaddy.imagemarker.Utils.transRGBColor;

public class TextBackgroundStyle {
    public String type = "";
    public float paddingX = 0F;
    public float paddingY = 0F;
    public int color = Color.TRANSPARENT;

    public TextBackgroundStyle(String type, float paddingX, float paddingY, int color) {
        this.type = type;
        this.paddingX = paddingX;
        this.paddingY = paddingY;
        this.color = color;
    }

    public TextBackgroundStyle(ReadableMap readableMap) {
        if (null != readableMap) {
            try {
                this.setType(readableMap.getString("type"));                
                this.setPaddingX((float) readableMap.getDouble("paddingX"));
                this.setPaddingY((float) readableMap.getDouble("paddingY"));
                this.setColor(readableMap.getString("color"));
            } catch (Exception e) {
                Log.d(Utils.TAG, "Unknown text background options ", e);
            }

        }
    }

    public String getType() {
        return type;
    }

    public float getPaddingX() {
        return paddingX;
    }

    public float getPaddingY() {
        return paddingY;
    }

    public int getColor() {
        return color;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setPaddingX(float paddingX) {
        this.paddingX = paddingX;
    }

    public void setPaddingY(float paddingY) {
        this.paddingY = paddingY;
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
