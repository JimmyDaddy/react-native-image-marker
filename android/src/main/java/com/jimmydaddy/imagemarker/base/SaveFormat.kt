package com.jimmydaddy.imagemarker.base

enum class SaveFormat(val value: String) {
  PNG("png"), JPG("jpg"), BASE64("base64");

  companion object {
    fun getFormat(format: String?): SaveFormat {
      return when (format) {
        "jpg", "JPG", "JPEG", "jpeg" -> JPG
        "base64", "BASE64" -> BASE64
        else -> PNG
      }
    }
  }
}
