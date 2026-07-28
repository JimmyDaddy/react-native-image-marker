package com.jimmydaddy.imagemarker.base

enum class SaveFormat(val value: String) {
  PNG("png"), JPG("jpg"), WEBP("webp"), BASE64("base64");

  companion object {
    fun getFormat(format: String?): SaveFormat {
      return when (format) {
        "jpg", "JPG", "JPEG", "jpeg" -> JPG
        "base64", "BASE64" -> BASE64
        "png", "PNG" -> PNG
        "webp", "WEBP" -> WEBP
        null -> JPG
        else -> throw MarkerError(ErrorCode.INVALID_PARAMS, "Unsupported saveFormat: $format")
      }
    }
  }
}
