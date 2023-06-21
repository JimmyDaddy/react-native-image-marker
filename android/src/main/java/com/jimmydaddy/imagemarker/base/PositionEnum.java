package com.jimmydaddy.imagemarker.base;

public enum PositionEnum {
  TOP_LEFT("topLeft"),
  TOP_CENTER("topCenter"),
  TOP_RIGHT("topRight"),
  CENTER("center"),
  BOTTOM_LEFT("bottomLeft"),
  BOTTOM_CENTER("bottomCenter"),
  BOTTOM_RIGHT("bottomRight");

  private final String value;

  private PositionEnum(String value) {
    this.value = value;
  }

  public String getValue() {
    return value;
  }

  static public PositionEnum getPosition(String position) {
    switch (position) {
      case "topCenter":
        return TOP_CENTER;
      case "topRight":
        return TOP_RIGHT;
      case "center":
        return CENTER;
      case "bottomLeft":
        return BOTTOM_LEFT;
      case "bottomCenter":
        return BOTTOM_CENTER;
      case "topLeft":
        return TOP_LEFT;
      default:
        return BOTTOM_RIGHT;
    }
  }
}
