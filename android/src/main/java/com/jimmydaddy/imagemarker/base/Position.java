package com.jimmydaddy.imagemarker.base;

/**
 * Created by jimmydaddy on 2017/9/23.
 */

public class Position {
  public float X;
  public float Y;

  public Position(float x, float y) {
    X = x;
    Y = y;
  }

  public float getX() {
    return X;
  }

  public void setX(float x) {
    X = x;
  }

  public float getY() {
    return Y;
  }

  public void setY(float y) {
    Y = y;
  }

  static public Position getTextPosition(String position, int margin, int width, int height, int textWidth, int textHeight) {
    if (position == null) {
      return new Position(margin, margin);
    }
    switch (position) {
      case "topCenter":
        return new Position((width - textWidth) / 2, margin);
      case "topRight":
        return new Position(width - textWidth, margin);
      case "center":
        return new Position((width - textWidth) / 2, (height - textHeight) / 2);
      case "bottomLeft":
        return new Position(0, height - textHeight - margin);
      case "bottomCenter":
        return new Position((width - textWidth) / 2, height - textHeight);
      default:
        return new Position(width - textWidth - margin, height - textHeight - margin);
    }
  }

  static public Position getTextPosition(PositionEnum position, int width, int height, int textWidth, int textHeight) {
    // default margin
    int margin = 20;
    if (position == null) {
      return new Position(margin, margin);
    }
    switch (position) {
      case TOP_CENTER:
        return new Position((width - textWidth) / 2, margin);
      case TOP_RIGHT:
        return new Position(width - textWidth, margin);
      case CENTER:
        return new Position((width - textWidth) / 2, (height - textHeight) / 2);
      case BOTTOM_LEFT:
        return new Position(0, height - textHeight - margin);
      case BOTTOM_CENTER:
        return new Position((width - textWidth) / 2, height - textHeight);
      default:
        return new Position(width - textWidth - margin, height - textHeight - margin);
    }
  }

  static public Position getImageRectFromPosition(String position, int width, int height, int imageWidth, int imageHeigt) {
    int left = 20;
    int top = 40;
    int right = imageWidth - width;
    Position pos = new Position(left, top);
    if (position == null) {
      return pos;
    }
    switch (position) {
      case "topCenter":
        left = (imageWidth) / 2 - width / 2;
        pos.setX(left);
        break;
      case "topRight":
        pos.setX(right - 20);
        break;
      case "center":
        left = (imageWidth) / 2 - width / 2;
        top = (imageHeigt) / 2 - height / 2;
        pos.setX(left);
        pos.setY(top);
        break;
      case "bottomLeft":
        top = imageHeigt - height;
        pos.setY(top - 20);
        break;
      case "bottomRight":
        top = imageHeigt - height;
        left = imageWidth - width - 20;
        pos.setX(left - 20);
        pos.setY(top - 20);
        break;
      case "bottomCenter":
        top = imageHeigt - height;
        left = (imageWidth) / 2 - width / 2;
        pos.setX(left - 20);
        pos.setY(top - 20);
    }
    return pos;
  }

  static public Position getImageRectFromPosition(PositionEnum position, int width, int height, int imageWidth, int imageHeigt) {
    int left = 20;
    int top = 40;
    int right = imageWidth - width;
    Position pos = new Position(left, top);
    if (position == null) {
      return pos;
    }
    switch (position) {
      case TOP_CENTER:
        left = (imageWidth) / 2 - width / 2;
        pos.setX(left);
        break;
      case TOP_RIGHT:
        pos.setX(right - 20);
        break;
      case CENTER:
        left = (imageWidth) / 2 - width / 2;
        top = (imageHeigt) / 2 - height / 2;
        pos.setX(left);
        pos.setY(top);
        break;
      case BOTTOM_LEFT:
        top = imageHeigt - height;
        pos.setY(top - 20);
        break;
      case BOTTOM_RIGHT:
        top = imageHeigt - height;
        left = imageWidth - width - 20;
        pos.setX(left - 20);
        pos.setY(top - 20);
        break;
      case BOTTOM_CENTER:
        top = imageHeigt - height;
        left = (imageWidth) / 2 - width / 2;
        pos.setX(left - 20);
        pos.setY(top - 20);
    }
    return pos;
  }

}
