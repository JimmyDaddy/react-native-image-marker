package com.jimmydaddy.imagemarker.base;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

public class Options {
  public String uri;
  public Integer X;
  public Integer Y;
  public PositionEnum position;
  public String color;
  public String fontName;
  public Integer fontSize;
  public ShadowLayerStyle shadowLayerStyle;
  public TextBackgroundStyle textBackgroundStyle;
  public float scale;
  public int quality;
  public String filename;
  public SaveFormat saveFormat;
  public Integer maxSize;

  public static final String PROP_ICON_URI = "uri";

  public Options(ReadableMap options) {
    ReadableMap src = options.getMap("src");
    if (src == null) {
      throw new MarkerError(ErrorCode.PARAMS_REQUIRED, "image is required");
    }
    uri = src.getString(PROP_ICON_URI);

    ReadableMap myShadowStyle = options.getMap("shadowStyle");
    shadowLayerStyle = null != myShadowStyle ? new ShadowLayerStyle(myShadowStyle) : null;

    ReadableMap myTextBackgroundStyle = options.getMap("textBackgroundStyle");
    textBackgroundStyle = null != myTextBackgroundStyle ? new TextBackgroundStyle(myTextBackgroundStyle) : null;

    X = options.hasKey("X") ? options.getInt("X") : null;
    Y = options.hasKey("Y") ? options.getInt("Y") : null;
    scale = options.hasKey("scale") ? options.getInt("scale") : 1;
    quality = options.hasKey("quality") ? options.getInt("quality") : 100;
    maxSize = options.hasKey("maxSize") ? options.getInt("maxSize") : 2048;
    filename = options.getString("filename");
    saveFormat = SaveFormat.getFormat(options.getString("saveFormat"));
    position = null != options.getString("position") ? PositionEnum.getPosition(options.getString("position")) : null;
    color = null != options.getString("color") ? options.getString("color") : null;
    fontName = null != options.getString("fontName") ? options.getString("fontName") : null;
    fontSize = options.hasKey("fontSize") ? options.getInt("fontSize") : 14;
  }

  static public Options checkParams(ReadableMap opts, Promise promise) {
    try {
      return new Options(opts);
    } catch (MarkerError e) {
      promise.reject(e.getErrorCode(), e.getErrMsg());
    }
    return null;
  }
}
