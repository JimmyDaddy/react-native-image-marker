package com.jimmydaddy.imagemarker.base;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

import java.lang.reflect.Array;

public class MarkTextOptions extends Options {
  public TextOptions[] watermarkTexts;

  public MarkTextOptions(ReadableMap options) {
    super(options);
    ReadableArray waterMarkTextsMap = options.getArray("watermarkTexts");
    if (waterMarkTextsMap.size() <= 0) return;
    watermarkTexts = new TextOptions[waterMarkTextsMap.size()];
    for (int i = 0; i < waterMarkTextsMap.size(); i++) {
      ReadableMap textMap = waterMarkTextsMap.getMap(i);
      watermarkTexts[i] = new TextOptions(textMap);
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
