package com.imagemarkerexample

import android.graphics.Bitmap
import android.graphics.Color
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.jimmydaddy.imagemarker.ImageMarkerRenderer
import com.jimmydaddy.imagemarker.base.MarkImageOptions
import org.junit.Assert.assertEquals
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

  private fun imageOptions(
    backgroundRotate: Int = 0,
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
}
