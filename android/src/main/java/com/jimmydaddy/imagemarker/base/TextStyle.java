package com.jimmydaddy.imagemarker.base;

import static com.jimmydaddy.imagemarker.base.Constants.*;
import static com.jimmydaddy.imagemarker.base.Utils.transRGBColor;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.views.text.ReactFontManager;

public class TextStyle {
  public String color;
  public String fontName;
  public Integer fontSize;
  public ShadowLayerStyle shadowLayerStyle;
  public TextBackgroundStyle textBackgroundStyle;
  public boolean underline;
  public Integer skewX;
  public boolean strikeThrough;
  public Paint.Align textAlign;
  public boolean italic;
  public boolean bold;
  public int rotate;

  public TextStyle(ReadableMap options) {
    color = null != options.getString("color") ? options.getString("color") : null;
    fontSize = options.hasKey("fontSize") ? options.getInt("fontSize") : DEFAULT_FONT_SIZE;
    fontName = null != options.getString("fontName") ? options.getString("fontName") : null;
    skewX = options.hasKey("skewX")? options.getInt("skewX") : null;
    rotate = options.hasKey("rotate")? options.getInt("rotate") : 0;

    underline = options.hasKey("underline")? options.getBoolean("underline") : false;
    strikeThrough = options.hasKey("strikeThrough")? options.getBoolean("strikeThrough") : false;
    italic = options.hasKey("italic")? options.getBoolean("italic") : false;
    bold = options.hasKey("bold")? options.getBoolean("bold") : false;

    ReadableMap myShadowStyle = options.getMap("shadowStyle");
    shadowLayerStyle = null != myShadowStyle ? new ShadowLayerStyle(myShadowStyle) : null;
    ReadableMap myTextBackgroundStyle = options.getMap("textBackgroundStyle");
    textBackgroundStyle = null != myTextBackgroundStyle ? new TextBackgroundStyle(myTextBackgroundStyle) : null;

    textAlign = Paint.Align.LEFT;

    if (options.hasKey("textAlign")) {
      switch (options.getString("textAlign")) {
        case "center":
          textAlign = Paint.Align.CENTER;
          break;
        case "right":
          textAlign = Paint.Align.RIGHT;
          break;
        default:
          textAlign = Paint.Align.LEFT;
          break;
      }
    }
  }
}
