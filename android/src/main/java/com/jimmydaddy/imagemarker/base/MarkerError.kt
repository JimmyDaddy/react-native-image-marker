package com.jimmydaddy.imagemarker.base

class MarkerError internal constructor(var errorCode: ErrorCode, var errMsg: String) : Error() {

  fun getErrorCode(): String {
    return errorCode.value
  }

  @JvmName("functionOfKotlin")
  fun getErrMsg(): String? {
    return errMsg
  }
}
