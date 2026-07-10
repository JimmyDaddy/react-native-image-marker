package com.imagemarkerexample

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import com.jimmydaddy.imagemarker.ImageMarkerRenderer
import com.jimmydaddy.imagemarker.base.MarkImageOptions
import com.jimmydaddy.imagemarker.base.MarkWatermarkOptions
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.ByteArrayOutputStream

@RunWith(AndroidJUnit4::class)
class ImageMarkerRendererTest {
  @Test
  fun rendersImageWatermarkUsingAnchoredOffsets() {
    val background = solidBitmap(8, 6, Color.RED)
    val marker = solidBitmap(2, 2, Color.BLUE)
    val options = imageOptions(
      watermarkPosition = JavaOnlyMap.of(
        "position",
        "topRight",
        "X",
        1,
        "Y",
        1
      )
    )

    val output = ImageMarkerRenderer.renderImageWatermarks(
      background,
      listOf(marker),
      options
    )

    assertEquals(8, output.width)
    assertEquals(6, output.height)
    assertEquals(Color.RED, output.getPixel(4, 1))
    assertEquals(Color.BLUE, output.getPixel(5, 1))
    assertEquals(Color.BLUE, output.getPixel(6, 2))
    assertEquals(Color.RED, output.getPixel(7, 1))
  }

  @Test
  fun rotatesRenderedBackgroundWhenRequested() {
    val background = solidBitmap(3, 2, Color.RED)
    val marker = solidBitmap(1, 1, Color.BLUE)
    val options = imageOptions(
      backgroundRotate = 90,
      watermarkPosition = JavaOnlyMap.of(
        "position",
        "topLeft",
        "X",
        0,
        "Y",
        0
      )
    )

    val output = ImageMarkerRenderer.renderImageWatermarks(
      background,
      listOf(marker),
      options
    )

    assertEquals(2, output.width)
    assertEquals(3, output.height)
  }

  @Test
  fun fortyFiveDegreeExpandGrowsCanvasAndKeepsPngCornersTransparent() {
    val output = ImageMarkerRenderer.renderImageWatermarks(
      solidBitmap(10, 10, Color.RED),
      listOf(solidBitmap(1, 1, Color.BLUE)),
      imageOptions(
        backgroundRotate = 45,
        watermarkPosition = JavaOnlyMap.of("X", 4, "Y", 4)
      )
    )

    assertEquals(15, output.width)
    assertEquals(15, output.height)
    assertEquals(0, Color.alpha(output.getPixel(0, 0)))
    assertEquals(Color.RED, output.getPixel(7, 2))
  }

  @Test
  fun fortyFiveDegreeCropKeepsOriginalDimensions() {
    val output = ImageMarkerRenderer.renderImageWatermarks(
      solidBitmap(10, 10, Color.RED),
      listOf(solidBitmap(1, 1, Color.BLUE)),
      imageOptions(
        backgroundRotate = 45,
        rotationCanvasMode = "crop",
        watermarkPosition = JavaOnlyMap.of("X", 4, "Y", 4)
      )
    )

    assertEquals(10, output.width)
    assertEquals(10, output.height)
    assertEquals(0, Color.alpha(output.getPixel(0, 0)))
    assertEquals(Color.RED, output.getPixel(5, 2))
  }

  @Test
  fun jpegRenderingUsesConfiguredMatteAndPngIgnoresIt() {
    val jpegOutput = ImageMarkerRenderer.renderImageWatermarks(
      solidBitmap(10, 10, Color.RED),
      listOf(solidBitmap(1, 1, Color.BLUE)),
      imageOptions(
        backgroundRotate = 45,
        saveFormat = "jpg",
        matteColor = "#00FF00",
        watermarkPosition = JavaOnlyMap.of("X", 4, "Y", 4)
      )
    )
    val pngOutput = ImageMarkerRenderer.renderImageWatermarks(
      solidBitmap(10, 10, Color.RED),
      listOf(solidBitmap(1, 1, Color.BLUE)),
      imageOptions(
        backgroundRotate = 45,
        saveFormat = "png",
        matteColor = "#00FF00",
        watermarkPosition = JavaOnlyMap.of("X", 4, "Y", 4)
      )
    )

    assertEquals(Color.GREEN, jpegOutput.getPixel(0, 0))
    assertEquals(0, Color.alpha(pngOutput.getPixel(0, 0)))
  }

  @Test
  fun jpegMatteIsOpaqueEvenWhenTheConfiguredColorContainsAlpha() {
    val output = ImageMarkerRenderer.renderImageWatermarks(
      solidBitmap(10, 10, Color.RED),
      listOf(solidBitmap(1, 1, Color.BLUE)),
      imageOptions(
        backgroundRotate = 45,
        saveFormat = "jpg",
        matteColor = "#00FF0080",
        watermarkPosition = JavaOnlyMap.of("X", 4, "Y", 4)
      )
    )

    val corner = output.getPixel(0, 0)
    assertEquals(255, Color.alpha(corner))
    assertEquals(Color.GREEN, corner)
  }

  @Test
  fun jpegEncoderPreservesWhiteMatteInsteadOfBlackCorners() {
    val output = ImageMarkerRenderer.renderImageWatermarks(
      solidBitmap(20, 20, Color.RED),
      listOf(solidBitmap(1, 1, Color.BLUE)),
      imageOptions(
        backgroundRotate = 45,
        saveFormat = "jpg",
        matteColor = "#FFFFFF",
        watermarkPosition = JavaOnlyMap.of("X", 9, "Y", 9)
      )
    )
    val bytes = ByteArrayOutputStream().use { stream ->
      assertTrue(output.compress(Bitmap.CompressFormat.JPEG, 100, stream))
      stream.toByteArray()
    }
    val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    val corner = decoded.getPixel(0, 0)

    assertTrue(Color.red(corner) > 240)
    assertTrue(Color.green(corner) > 240)
    assertTrue(Color.blue(corner) > 240)
  }

  @Test
  fun rendersWatermarkLayersInArrayOrder() {
    val background = solidBitmap(8, 6, Color.RED)
    val firstMarker = solidBitmap(2, 2, Color.BLUE)
    val secondMarker = solidBitmap(2, 2, Color.GREEN)
    val options = MarkWatermarkOptions(
      JavaOnlyMap.of(
        "backgroundImage",
        JavaOnlyMap.of(
          "src",
          imageSource("background"),
          "alpha",
          1
        ),
        "watermarks",
        JavaOnlyArray.of(
          JavaOnlyMap.of(
            "type",
            "image",
            "src",
            imageSource("first"),
            "position",
            JavaOnlyMap.of("X", 1, "Y", 1),
            "alpha",
            1
          ),
          JavaOnlyMap.of(
            "type",
            "image",
            "src",
            imageSource("second"),
            "position",
            JavaOnlyMap.of("X", 1, "Y", 1),
            "alpha",
            1
          )
        ),
        "saveFormat",
        "png"
      )
    )

    val output = ImageMarkerRenderer.renderWatermarks(
      background,
      listOf(firstMarker, secondMarker),
      options,
      ReactApplicationContext(
        InstrumentationRegistry.getInstrumentation().targetContext.applicationContext
      )
    )

    assertEquals(8, output.width)
    assertEquals(6, output.height)
    assertEquals(Color.GREEN, output.getPixel(1, 1))
  }

  @Test
  fun rendersScaledImageWatermarkWithoutInterpolatedEdges() {
    val background = solidBitmap(8, 8, Color.RED)
    val marker = checkerBitmap(4, 4)
    val options = imageOptions(
      watermarkScale = 0.5,
      watermarkPosition = JavaOnlyMap.of("X", 0, "Y", 0)
    )

    val output = ImageMarkerRenderer.renderImageWatermarks(
      background,
      listOf(marker),
      options
    )

    for (y in 0 until 2) {
      for (x in 0 until 2) {
        val pixel = output.getPixel(x, y)
        assertTrue("Expected a hard black or white watermark pixel, got $pixel", isBlackOrWhite(pixel))
      }
    }
    assertEquals(Color.RED, output.getPixel(2, 0))
    assertEquals(Color.RED, output.getPixel(0, 2))
  }

  @Test
  fun rotatedBackgroundUsesFilteredSampling() {
    val output = ImageMarkerRenderer.renderImageWatermarks(
      checkerBitmap(4, 4),
      listOf(solidBitmap(1, 1, Color.TRANSPARENT)),
      imageOptions(
        backgroundRotate = 15,
        watermarkPosition = JavaOnlyMap.of("edgeInset", 0)
      )
    )

    var foundInterpolatedPixel = false
    for (y in 0 until output.height) {
      for (x in 0 until output.width) {
        val pixel = output.getPixel(x, y)
        val red = Color.red(pixel)
        if (
          Color.alpha(pixel) > 0 &&
          red in 1..254 &&
          red == Color.green(pixel) &&
          red == Color.blue(pixel)
        ) {
          foundInterpolatedPixel = true
        }
      }
    }

    assertTrue("Expected bilinear sampling to produce an interpolated background pixel", foundInterpolatedPixel)
  }

  @Test
  fun trimTransparentPaddingPositionsVisiblePixelsAtTheAnchor() {
    val background = solidBitmap(8, 8, Color.RED)
    val paddedMarker = paddedMarkerBitmap()
    val withoutTrim = ImageMarkerRenderer.renderImageWatermarks(
      background,
      listOf(paddedMarker),
      imageOptions(
        trimTransparentPadding = false,
        watermarkPosition = JavaOnlyMap.of(
          "position",
          "topLeft",
          "edgeInset",
          0
        )
      )
    )
    val withTrim = ImageMarkerRenderer.renderImageWatermarks(
      solidBitmap(8, 8, Color.RED),
      listOf(paddedMarkerBitmap()),
      imageOptions(
        trimTransparentPadding = true,
        watermarkPosition = JavaOnlyMap.of(
          "position",
          "topLeft",
          "edgeInset",
          0
        )
      )
    )

    assertEquals(Color.RED, withoutTrim.getPixel(0, 0))
    assertEquals(Color.BLUE, withoutTrim.getPixel(2, 2))
    assertEquals(Color.BLUE, withTrim.getPixel(0, 0))
    assertEquals(Color.RED, withTrim.getPixel(2, 2))
  }

  @Test
  fun transparentBoundsFindOnlyVisibleContent() {
    assertEquals(
      android.graphics.Rect(2, 2, 4, 4),
      ImageMarkerRenderer.findNonTransparentBounds(paddedMarkerBitmap())
    )
    assertEquals(
      android.graphics.Rect(0, 0, 4, 4),
      ImageMarkerRenderer.findNonTransparentBounds(
        Bitmap.createBitmap(4, 4, Bitmap.Config.ARGB_8888)
      )
    )
  }

  private fun imageOptions(
    backgroundRotate: Int = 0,
    watermarkScale: Double = 1.0,
    rotationCanvasMode: String = "expand",
    saveFormat: String = "png",
    matteColor: String = "#FFFFFF",
    trimTransparentPadding: Boolean = false,
    watermarkPosition: JavaOnlyMap
  ): MarkImageOptions {
    return MarkImageOptions(
      JavaOnlyMap.of(
        "backgroundImage",
        JavaOnlyMap.of(
          "src",
          imageSource("background"),
          "rotate",
          backgroundRotate,
          "alpha",
          1
        ),
        "watermarkImages",
        JavaOnlyArray.of(
          JavaOnlyMap.of(
            "src",
            imageSource("watermark"),
            "scale",
            watermarkScale,
            "position",
            watermarkPosition,
            "trimTransparentPadding",
            trimTransparentPadding,
            "alpha",
            1
          )
        ),
        "saveFormat",
        saveFormat,
        "matteColor",
        matteColor,
        "rotationCanvasMode",
        rotationCanvasMode
      )
    )
  }

  private fun imageSource(uri: String): JavaOnlyMap {
    return JavaOnlyMap.of(
      "uri",
      uri,
      "width",
      1,
      "height",
      1,
      "scale",
      1
    )
  }

  private fun solidBitmap(width: Int, height: Int, color: Int): Bitmap {
    return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also {
      it.eraseColor(color)
    }
  }

  private fun checkerBitmap(width: Int, height: Int): Bitmap {
    return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { bitmap ->
      for (y in 0 until height) {
        for (x in 0 until width) {
          bitmap.setPixel(x, y, if ((x + y) % 2 == 0) Color.BLACK else Color.WHITE)
        }
      }
    }
  }

  private fun paddedMarkerBitmap(): Bitmap {
    return Bitmap.createBitmap(6, 6, Bitmap.Config.ARGB_8888).also { bitmap ->
      for (y in 2 until 4) {
        for (x in 2 until 4) {
          bitmap.setPixel(x, y, Color.BLUE)
        }
      }
    }
  }

  private fun isBlackOrWhite(pixel: Int): Boolean {
    return pixel == Color.BLACK || pixel == Color.WHITE
  }
}
