package com.jimmydaddy.imagemarker.base;

public enum SaveFormat {
  PNG("png"),
  JPG("jpg"),
  BASE64("base64");

  private final String value;

  private SaveFormat(String value) {
    this.value = value;
  }

  public String getValue() {
    return value;
  }

  static public SaveFormat getFormat(String format) {
    switch (format) {
      case "jpg":
      case "JPG":
      case "JPEG":
      case "jpeg":
        return JPG;
      case "base64":
      case "BASE64":
        return BASE64;
      default:
        return PNG;
    }
  }
}
