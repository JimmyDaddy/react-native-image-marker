package com.imagemarkerexample

import android.graphics.Bitmap
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

  private fun imageOptions(
    backgroundRotate: Int = 0,
    watermarkScale: Double = 1.0,
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
            "alpha",
            1
          )
        ),
        "saveFormat",
        "png"
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

  private fun isBlackOrWhite(pixel: Int): Boolean {
    return pixel == Color.BLACK || pixel == Color.WHITE
  }
}
