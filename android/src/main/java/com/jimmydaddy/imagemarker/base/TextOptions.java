package com.jimmydaddy.imagemarker.base;

import static com.jimmydaddy.imagemarker.base.Utils.transRGBColor;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.util.TypedValue;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.views.text.ReactFontManager;

public class TextOptions {
  public String text;
  public Integer X;
  public Integer Y;
  public PositionEnum positionEnum;
  public TextStyle style;

  public TextOptions(ReadableMap options) {
    text = options.getString("text");
    if (text == null) {
      throw new MarkerError(ErrorCode.PARAMS_REQUIRED, "mark text is required");
    }
    ReadableMap positionOptions = null != options.getMap("positionOptions") ? options.getMap("positionOptions") : null;
    X = positionOptions.hasKey("X") ? positionOptions.getInt("X") : null;
    Y = positionOptions.hasKey("Y") ? positionOptions.getInt("Y") : null;
    positionEnum = null != positionOptions.getString("position")? PositionEnum.getPosition(positionOptions.getString("position")) : null;
    style = new TextStyle(options.getMap("style"));
  }

  public TextPaint applyStyle(ReactApplicationContext context, Canvas canvas, int maxWidth, int maxHeight) {
    TextPaint textPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG | Paint.DEV_KERN_TEXT_FLAG);
    textPaint.setAntiAlias(true);

    if (null != style.shadowLayerStyle) {
      textPaint.setShadowLayer(style.shadowLayerStyle.radius, style.shadowLayerStyle.dx, style.shadowLayerStyle.dy, style.shadowLayerStyle.color);
    }

    try {
      //设置字体失败时使用默认字体
      textPaint.setTypeface(ReactFontManager.getInstance().getTypeface(style.fontName, Typeface.NORMAL, context.getAssets()));
    } catch (Exception e) {
      textPaint.setTypeface(Typeface.DEFAULT);
    }

    float textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, style.fontSize, context.getResources().getDisplayMetrics());
    textPaint.setTextSize(textSize);
    textPaint.setColor(Color.parseColor(transRGBColor(style.color)));

    textPaint.setUnderlineText(style.underline);
    if (null != style.skewX) {
      textPaint.setTextSkewX(style.skewX);
      style.italic = false;
    }
    Typeface typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL);

    if (style.italic && style.bold) {
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD_ITALIC);
    } else if (style.italic) {
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.ITALIC);
    } else if (style.bold) {
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD);
    }

    textPaint.setStrikeThruText(style.strikeThrough);
    textPaint.setTypeface(typeface);
    textPaint.setTextAlign(style.textAlign);

    StaticLayout textLayout;
    // ALIGN_CENTER, ALIGN_NORMAL, ALIGN_OPPOSITE
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
      StaticLayout.Builder builder = StaticLayout.Builder.obtain(text, 0, text.length(), textPaint, canvas.getWidth());
      builder.setAlignment(Layout.Alignment.ALIGN_NORMAL);
      builder.setLineSpacing(0.0f, 1.0f);
      builder.setIncludePad(false);
      textLayout = builder.build();
    } else {
      textLayout = new StaticLayout(text, textPaint, canvas.getWidth(), Layout.Alignment.ALIGN_NORMAL, 1.0f, 0.0f, false);
    }
    int textHeight = textLayout.getHeight();
    int textWidth = 0;
    int count = textLayout.getLineCount();
    for (int a = 0; a < count; a++) {
      textWidth = (int) Math.ceil(Math.max(textWidth, textLayout.getLineWidth(a) + textLayout.getLineLeft(a)));
    }

    int margin = 20;

    Position position = new Position(margin, margin);
    if (positionEnum != null) {
      position = Position.getTextPosition(positionEnum, maxWidth, maxHeight, textWidth, textHeight);
    } else {
      if (null != X) {
        position.setX(X);
      }
      if (null != Y) {
        position.setX(Y);
      }
    }

    float x = position.X;
    float y = position.Y;

    // Draw text background
    if (null != style.textBackgroundStyle) {
      Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.LINEAR_TEXT_FLAG);
      paint.setStyle(Paint.Style.FILL);
      paint.setColor(style.textBackgroundStyle.color);
      if ("stretchX".equals(style.textBackgroundStyle.type)) {
        canvas.drawRect(0, y - style.textBackgroundStyle.paddingY, maxWidth, y + textHeight + style.textBackgroundStyle.paddingY, paint);
      } else if ("stretchY".equals(style.textBackgroundStyle.type)) {
        canvas.drawRect(x - style.textBackgroundStyle.paddingX, 0, x + textWidth + style.textBackgroundStyle.paddingX, maxHeight, paint);
      } else {
        canvas.drawRect(x - style.textBackgroundStyle.paddingX, y - style.textBackgroundStyle.paddingY,
          x + textWidth + style.textBackgroundStyle.paddingX, y + textHeight + style.textBackgroundStyle.paddingY, paint);
      }
    }
    canvas.save();
    canvas.translate(x, y);
    canvas.rotate(style.rotate);
    textLayout.draw(canvas);
    canvas.restore();
    textPaint.reset();
    return textPaint;
  }
}
