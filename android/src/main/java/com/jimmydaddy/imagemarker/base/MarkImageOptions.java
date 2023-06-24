package com.jimmydaddy.imagemarker.base;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

public class MarkImageOptions extends Options {

  public ImageOptions watermarkImage;
  public Integer X;
  public Integer Y;
  public PositionEnum positionEnum;

  public MarkImageOptions(ReadableMap options) {
    super(options);
    ReadableMap markerImageOpts = options.getMap("watermarkImage");
    if (markerImageOpts == null) {
      throw new MarkerError(ErrorCode.PARAMS_REQUIRED, "marker image is required");
    }

    ReadableMap positionOptions = null != options.getMap("watermarkPosition") ? options.getMap("watermarkPosition") : null;
    X = positionOptions.hasKey("X") ? positionOptions.getInt("X") : null;
    Y = positionOptions.hasKey("Y") ? positionOptions.getInt("Y") : null;
    positionEnum = null != positionOptions.getString("position")? PositionEnum.getPosition(positionOptions.getString("position")) : null;
    watermarkImage = new ImageOptions(markerImageOpts);
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
