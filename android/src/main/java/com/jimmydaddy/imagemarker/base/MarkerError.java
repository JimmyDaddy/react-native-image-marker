package com.jimmydaddy.imagemarker.base;

public class MarkerError extends Error {
  ErrorCode errorCode;
  String errMsg;

  MarkerError(ErrorCode errCode, String errMsg) {
    super();
    this.errMsg = errMsg;
    this.errorCode = errCode;
  }

  public String getErrorCode() {
    return errorCode.getValue();
  }

  public String getErrMsg() {
    return errMsg;
  }
}
