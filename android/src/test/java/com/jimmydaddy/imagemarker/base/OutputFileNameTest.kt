package com.jimmydaddy.imagemarker.base

import org.junit.Assert.assertEquals
import org.junit.Test

class OutputFileNameTest {
  @Test
  fun knownImageExtensionIsRebuiltFromSaveFormat() {
    assertEquals(
      "watermark.png",
      OutputFileName.resolve("watermark.jpg", SaveFormat.PNG, "generated")
    )
    assertEquals(
      "watermark.jpg",
      OutputFileName.resolve("watermark.JPEG", SaveFormat.JPG, "generated")
    )
    assertEquals(
      "watermark.jpg",
      OutputFileName.resolve("watermark.PNG", SaveFormat.JPG, "generated")
    )
  }

  @Test
  fun unknownExtensionIsPreservedBeforeTheSaveFormatExtension() {
    assertEquals(
      "watermark.webp.png",
      OutputFileName.resolve("watermark.webp", SaveFormat.PNG, "generated")
    )
  }

  @Test
  fun generatedNameUsesTheRequestedExtension() {
    assertEquals(
      "generated.png",
      OutputFileName.resolve(null, SaveFormat.PNG, "generated")
    )
    assertEquals(
      "generated.jpg",
      OutputFileName.resolve(null, null, "generated")
    )
  }

  @Test
  fun blankFilenameFallsBackToGeneratedName() {
    assertEquals(
      "generated.jpg",
      OutputFileName.resolve("", SaveFormat.JPG, "generated")
    )
    assertEquals(
      "generated.png",
      OutputFileName.resolve("   ", SaveFormat.PNG, "generated")
    )
  }

  @Test
  fun base64SentinelIsUnchanged() {
    assertEquals(
      Constants.BASE64,
      OutputFileName.resolve("ignored.jpeg", SaveFormat.BASE64, "generated")
    )
  }
}
