package com.jimmydaddy.imagemarker.base;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

public class MarkImageOptions extends Options {
  public String markImageUri;
  public Float markerScale;

  public MarkImageOptions(ReadableMap options) {
    super(options);
    ReadableMap src = options.getMap("markerSrc");
    if (src == null) {
      throw new MarkerError(ErrorCode.PARAMS_REQUIRED, "marker image is required");
    }
    markImageUri = src.getString(PROP_ICON_URI);
    markerScale = options.hasKey("markerScale") ? (float) options.getDouble("markerScale") : 0.5f;
  }

  static public MarkImageOptions checkParams(ReadableMap opts, Promise promise) {
    try {
      return new MarkImageOptions(opts);
    } catch (MarkerError e) {
      promise.reject(e.getErrorCode(), e.getErrMsg());
    }
    return null;
  }
}
