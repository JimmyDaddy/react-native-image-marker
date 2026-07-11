package com.jimmydaddy.imagemarker.base

class MarkerError internal constructor(private var errorCode: ErrorCode, private var errMsg: String) :
  Exception(errMsg) {

  fun getErrorCode(): String {
    return errorCode.value
  }

  @JvmName("functionOfKotlin")
  fun getErrMsg(): String {
    return errMsg
  }

  companion object {
    internal fun fromInvalidParams(error: Exception, message: String): MarkerError {
      return if (error is MarkerError) {
        error
      } else {
        MarkerError(ErrorCode.INVALID_PARAMS, message).apply { initCause(error) }
      }
    }
  }
}
