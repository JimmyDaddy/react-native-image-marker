package com.imagemarkerexample

import android.graphics.Bitmap
import android.graphics.Color
import android.os.SystemClock
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import com.jimmydaddy.imagemarker.MarkerImageLoader
import com.jimmydaddy.imagemarker.ImageMarkerCore
import com.jimmydaddy.imagemarker.base.ImageOptions
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

@RunWith(AndroidJUnit4::class)
class MarkerImageLoaderTest {
  private val targetContext = InstrumentationRegistry.getInstrumentation().targetContext

  @Test
  fun packagesAndLoadsSharedCppCore() {
    assertEquals(true, ImageMarkerCore.isNativeAvailable)
  }

  @Test
  fun loadsContentUriThroughCoil() = runBlocking {
    val uri = "content://com.imagemarkerexample.test.imageprovider/image"

    val bitmap = load(uri, maxSize = 2)

    assertEquals(2, bitmap.width)
    assertEquals(1, bitmap.height)
    assertEquals(Color.MAGENTA, bitmap.getPixel(1, 0))
    bitmap.recycle()
  }

  @Test
  fun loadsAndroidResourceUriThroughCoil() = runBlocking {
    val uri = "android.resource://${targetContext.packageName}/${R.mipmap.ic_launcher}"

    val bitmap = load(uri)

    assertFalse(bitmap.isRecycled)
    assertEquals(true, bitmap.width > 0)
    assertEquals(true, bitmap.height > 0)
    bitmap.recycle()
  }

  @Test
  fun boundsNamedResourceBeforeApplyingScale() = runBlocking {
    val bitmap = load("ic_launcher", maxSize = 9)

    assertEquals(9, bitmap.width)
    assertEquals(9, bitmap.height)
    bitmap.recycle()
  }

  @Test
  fun appliesExifOrientationToBase64Jpeg() = runBlocking {
    val source = Bitmap.createBitmap(60, 30, Bitmap.Config.ARGB_8888).apply {
      for (y in 0 until height) {
        for (x in 0 until width) {
          setPixel(x, y, if (x < width / 2) Color.RED else Color.BLUE)
        }
      }
    }
    val jpeg = File(targetContext.cacheDir, "base64-exif-source.jpg")
    try {
      FileOutputStream(jpeg).use { stream ->
        check(source.compress(Bitmap.CompressFormat.JPEG, 100, stream))
      }
    } finally {
      source.recycle()
    }
    ExifInterface(jpeg).apply {
      setAttribute(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_ROTATE_90.toString())
      saveAttributes()
    }
    val dataUri = "data:image/jpeg;base64," + Base64.encodeToString(jpeg.readBytes(), Base64.NO_WRAP)

    val bitmap = load(dataUri)

    assertEquals(30, bitmap.width)
    assertEquals(60, bitmap.height)
    val top = bitmap.getPixel(bitmap.width / 2, 10)
    val bottom = bitmap.getPixel(bitmap.width / 2, bitmap.height - 10)
    assertEquals(true, Color.red(top) > Color.blue(top) + 80)
    assertEquals(true, Color.blue(bottom) > Color.red(bottom) + 80)
    bitmap.recycle()
    jpeg.delete()
    Unit
  }

  @Test
  fun base64DecodeHonorsRequestedSize() = runBlocking {
    val source = Bitmap.createBitmap(100, 80, Bitmap.Config.ARGB_8888).apply {
      eraseColor(Color.BLUE)
    }
    val bytes = ByteArrayOutputStream().use { stream ->
      check(source.compress(Bitmap.CompressFormat.PNG, 100, stream))
      stream.toByteArray()
    }
    source.recycle()
    val dataUri = "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)

    val bitmap = load(dataUri, width = 10, height = 8)

    assertEquals(10, bitmap.width)
    assertEquals(8, bitmap.height)
    bitmap.recycle()
  }

  @Test
  fun base64DecodeFitsSourceWithinMaxSizeWithoutCropping() = runBlocking {
    val bitmap = load(
      solidPngDataUri(100, 80, Color.GREEN),
      maxSize = 20
    )

    assertEquals(20, bitmap.width)
    assertEquals(16, bitmap.height)
    bitmap.recycle()
  }

  @Test
  fun repeatedlyDownsamplesLargeInputsWithinTheMemoryBound() = runBlocking {
    val source = solidPngDataUri(1600, 1200, Color.GREEN)
    val startedAt = SystemClock.elapsedRealtime()

    repeat(12) {
      val bitmap = load(source, maxSize = 400)
      assertEquals(400, bitmap.width)
      assertEquals(300, bitmap.height)
      bitmap.recycle()
    }

    assertTrue(
      "Repeated large-image downsampling exceeded the 15 second stress budget",
      SystemClock.elapsedRealtime() - startedAt < 15_000
    )
  }

  @Test
  fun explicitSourceSizeIsFitWithinMaxSizeBeforeBusinessScale() = runBlocking {
    val bitmap = load(
      solidPngDataUri(100, 50, Color.YELLOW),
      width = 40,
      height = 20,
      maxSize = 10,
      scale = 2.0
    )

    assertEquals(20, bitmap.width)
    assertEquals(10, bitmap.height)
    bitmap.recycle()
  }

  @Test
  fun scaleImagesAppliesBackgroundScaleButLeavesWatermarkForRenderer() = runBlocking {
    val dataUri = solidPngDataUri(4, 3, Color.CYAN)
    val background = imageOptions(dataUri, scale = 2.0)
    val watermark = imageOptions(dataUri, scale = 2.0)
    val context = ReactApplicationContext(targetContext.applicationContext)

    val bitmaps = MarkerImageLoader(context, 2048).loadImages(
      listOf(background, watermark),
      scaleImages = listOf(true, false)
    )

    assertEquals(8, bitmaps[0].width)
    assertEquals(6, bitmaps[0].height)
    assertEquals(4, bitmaps[1].width)
    assertEquals(3, bitmaps[1].height)
    bitmaps.forEach(Bitmap::recycle)
  }

  private suspend fun load(
    uri: String,
    width: Int = 0,
    height: Int = 0,
    maxSize: Int = 2048,
    scale: Double = 1.0
  ): Bitmap {
    val options = imageOptions(uri, width, height, scale)
    val context = ReactApplicationContext(targetContext.applicationContext)
    return MarkerImageLoader(context, maxSize).loadImages(listOf(options)).single()
  }

  private fun imageOptions(
    uri: String,
    width: Int = 0,
    height: Int = 0,
    scale: Double = 1.0
  ): ImageOptions {
    val source = JavaOnlyMap.of(
      "uri", uri,
      "width", width,
      "height", height,
      "scale", 1
    )
    val options = ImageOptions(
      JavaOnlyMap.of(
        "src", source,
        "scale", scale,
        "alpha", 1
      )
    )
    return options
  }

  private fun solidPngDataUri(width: Int, height: Int, color: Int): String {
    val source = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).apply {
      eraseColor(color)
    }
    val bytes = ByteArrayOutputStream().use { stream ->
      check(source.compress(Bitmap.CompressFormat.PNG, 100, stream))
      stream.toByteArray()
    }
    source.recycle()
    return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
  }
}
