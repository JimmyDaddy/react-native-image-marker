package com.jimmydaddy.imagemarker.base;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

public class MarkTextOptions extends Options {
  public String text;

  public MarkTextOptions(ReadableMap options) {
    super(options);
    text = options.getString("text");
    if (text == null) {
      throw new MarkerError(ErrorCode.PARAMS_REQUIRED, "mark text is required");
    }
  }

  static public MarkTextOptions checkParams(ReadableMap opts, Promise promise) {
    try {
      return new MarkTextOptions(opts);
    } catch (MarkerError e) {
      promise.reject(e.getErrorCode(), e.getErrMsg());
    }
    return null;
  }
}
