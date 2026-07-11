package com.jimmydaddy.imagemarker.base

enum class RotationCanvasMode(val value: String) {
  EXPAND("expand"),
  CROP("crop");

  companion object {
    fun fromValue(value: String?): RotationCanvasMode {
      return when (value?.lowercase()) {
        null, "expand" -> EXPAND
        "crop" -> CROP
        else -> throw MarkerError(
          ErrorCode.INVALID_PARAMS,
          "Invalid rotationCanvasMode: $value"
        )
      }
    }
  }
}
