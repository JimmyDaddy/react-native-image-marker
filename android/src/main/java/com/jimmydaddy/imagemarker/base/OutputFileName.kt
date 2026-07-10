package com.jimmydaddy.imagemarker.base

internal object OutputFileName {
  private val knownImageExtension = Regex("\\.(?:jpe?g|png)$", RegexOption.IGNORE_CASE)

  fun resolve(filename: String?, saveFormat: SaveFormat?, generatedName: String): String {
    if (saveFormat == SaveFormat.BASE64) {
      return Constants.BASE64
    }

    val extension = if (saveFormat == SaveFormat.PNG) ".png" else ".jpg"
    val requestedName = filename?.takeUnless { it.isBlank() } ?: generatedName
    val baseName = requestedName.replace(knownImageExtension, "")
    return "$baseName$extension"
  }
}
