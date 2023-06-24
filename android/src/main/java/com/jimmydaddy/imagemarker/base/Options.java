package com.jimmydaddy.imagemarker.base;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

public class Options {
  public ImageOptions backgroundImage;
  public int quality;
  public String filename;
  public SaveFormat saveFormat;
  public Integer maxSize;

  public static final String PROP_ICON_URI = "uri";

  public Options(ReadableMap options) {
    ReadableMap backgroundImageOpts = options.getMap("backgroundImage");
    if (backgroundImageOpts == null) {
      throw new MarkerError(ErrorCode.PARAMS_REQUIRED, "backgroundImage is required");
    }
    backgroundImage = new ImageOptions(backgroundImageOpts);
    quality = options.hasKey("quality") ? options.getInt("quality") : 100;
    maxSize = options.hasKey("maxSize") ? options.getInt("maxSize") : 2048;
    filename = options.getString("filename");
    saveFormat = SaveFormat.getFormat(options.getString("saveFormat"));
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
