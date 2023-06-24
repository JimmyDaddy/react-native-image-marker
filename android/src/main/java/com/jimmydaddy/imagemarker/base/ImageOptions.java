package com.jimmydaddy.imagemarker.base;

import static com.jimmydaddy.imagemarker.base.Constants.*;

import android.graphics.Canvas;
import android.graphics.Paint;

import com.facebook.react.bridge.ReadableMap;

public class ImageOptions {
  public static final String PROP_ICON_URI = "uri";

  public ReadableMap src;
  public String uri;
  public float scale;
  public int rotate;
  public int alpha;

  public ImageOptions(ReadableMap options) {
    src = options.getMap("src");
    if (src == null) {
      throw new MarkerError(ErrorCode.PARAMS_REQUIRED, "image is required");
    }
    uri = src.getString(PROP_ICON_URI);
    scale = options.hasKey("scale") ? (float) options.getDouble("scale") : DEFAULT_SCALE;
    rotate = options.hasKey("rotate")? options.getInt("rotate") : DEFAULT_ROTATE;
    alpha = options.hasKey("alpha")? options.getInt("alpha"): DEFAULT_ALPHA;
  }

  public Paint applyStyle() {
    Paint paint = new Paint();
    paint.setAlpha(alpha);
    //获取更清晰的图像采样
    paint.setDither(true);
    return paint;
  }
}
