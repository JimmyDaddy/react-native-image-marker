package com.jimmydaddy.imagemarker.base

internal object OutputFileName {
  private val knownImageExtension = Regex("\\.(?:jpe?g|png|webp)$", RegexOption.IGNORE_CASE)

  fun resolve(filename: String?, saveFormat: SaveFormat?, generatedName: String): String {
    if (saveFormat == SaveFormat.BASE64) {
      return Constants.BASE64
    }

    val extension = when (saveFormat) {
      SaveFormat.PNG -> ".png"
      SaveFormat.WEBP -> ".webp"
      else -> ".jpg"
    }
    val requestedName = filename?.takeUnless { it.isBlank() } ?: generatedName
    validateBaseName(requestedName)
    val baseName = requestedName.replace(knownImageExtension, "")
    if (baseName.isBlank() || baseName == "." || baseName == "..") {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "filename must contain a safe base name")
    }
    return "$baseName$extension"
  }

  private fun validateBaseName(filename: String) {
    if (
      filename == "." ||
      filename == ".." ||
      filename.any { it == '/' || it == '\\' || it.code < 32 || it.code == 127 }
    ) {
      throw MarkerError(
        ErrorCode.INVALID_PARAMS,
        "filename must be a base name without path separators"
      )
    }
  }
}
