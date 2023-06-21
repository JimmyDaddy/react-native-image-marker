package com.jimmydaddy.imagemarker.base;

public enum ErrorCode {
  INVALID_PARAMS("INVALID_PARAMS"),
  PARAMS_REQUIRED("PARAMS_REQUIRED");

  private final String value;

  private ErrorCode(String value) {
    this.value = value;
  }

  public String getValue() {
    return value;
  }
}
