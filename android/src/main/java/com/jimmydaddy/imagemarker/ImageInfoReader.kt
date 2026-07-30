package com.jimmydaddy.imagemarker

import android.annotation.SuppressLint
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.base.ErrorCode
import com.jimmydaddy.imagemarker.base.MarkerError
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

internal data class MarkerImageInfo(
  val encodedWidth: Int,
  val encodedHeight: Int,
  val format: String,
  val mimeType: String?,
  val orientation: Int
) {
  private val swapsDimensions: Boolean
    get() = orientation in 5..8

  val width: Int
    get() = if (swapsDimensions) encodedHeight else encodedWidth

  val height: Int
    get() = if (swapsDimensions) encodedWidth else encodedHeight

  val rotationDegrees: Int
    get() = when (orientation) {
      3, 4 -> 180
      5, 6 -> 90
      7, 8 -> 270
      else -> 0
    }

  val mirrored: Boolean
    get() = orientation in setOf(2, 4, 5, 7)

  fun toJson(): String {
    return JSONObject().apply {
      put("width", width)
      put("height", height)
      put("encodedWidth", encodedWidth)
      put("encodedHeight", encodedHeight)
      put("format", format)
      if (mimeType != null) put("mimeType", mimeType)
      put("orientation", orientation)
      put("rotationDegrees", rotationDegrees)
      put("mirrored", mirrored)
      put("requiresNormalization", orientation != 1)
    }.toString()
  }
}

internal class ImageInfoReader(
  private val context: ReactApplicationContext
) {
  fun read(source: ReadableMap): MarkerImageInfo {
    val uriValue =
      if (source.hasKey("uri") && !source.isNull("uri")) source.getString("uri") else null
    val uri = uriValue?.takeUnless { it.isBlank() }
      ?: throw MarkerError(ErrorCode.PARAMS_REQUIRED, "image source uri is required")

    val bytes = decodeDataUri(uri)
    val streamFactory: () -> InputStream = if (bytes != null) {
      { ByteArrayInputStream(bytes) }
    } else {
      { openSource(uri) }
    }

    val bounds = BitmapFactory.Options().apply {
      inJustDecodeBounds = true
      inScaled = false
    }
    streamFactory().use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
      throw MarkerError(
        ErrorCode.LOAD_IMAGE_FAILED,
        "Unable to read image metadata from source: $uri"
      )
    }

    val orientation = try {
      streamFactory().use {
        normalizeOrientation(
          ExifInterface(it).getAttributeInt(
            ExifInterface.TAG_ORIENTATION,
            ExifInterface.ORIENTATION_NORMAL
          )
        )
      }
    } catch (_: Exception) {
      ExifInterface.ORIENTATION_NORMAL
    }
    val mimeType = bounds.outMimeType
    return MarkerImageInfo(
      encodedWidth = bounds.outWidth,
      encodedHeight = bounds.outHeight,
      format = formatForMimeType(mimeType),
      mimeType = mimeType,
      orientation = orientation
    )
  }

  private fun normalizeOrientation(value: Int): Int {
    return if (value in 1..8) value else ExifInterface.ORIENTATION_NORMAL
  }

  private fun formatForMimeType(mimeType: String?): String {
    return when (mimeType?.lowercase()) {
      "image/jpeg", "image/jpg" -> "jpeg"
      "image/png" -> "png"
      "image/webp" -> "webp"
      "image/gif" -> "gif"
      "image/heif", "image/heic", "image/avif" -> "heif"
      "image/bmp", "image/x-ms-bmp" -> "bmp"
      else -> "unknown"
    }
  }

  private fun decodeDataUri(value: String): ByteArray? {
    if (!value.startsWith("data:image/", ignoreCase = true)) return null
    val separator = value.indexOf(',')
    if (separator < 0) {
      throw MarkerError(ErrorCode.LOAD_IMAGE_FAILED, "Invalid image data URI")
    }
    return try {
      val metadata = value.substring(0, separator)
      val payload = value.substring(separator + 1)
      if (metadata.endsWith(";base64", ignoreCase = true)) {
        Base64.decode(payload, Base64.DEFAULT)
      } else {
        Uri.decode(payload).toByteArray(Charsets.ISO_8859_1)
      }
    } catch (error: IllegalArgumentException) {
      throw MarkerError(ErrorCode.LOAD_IMAGE_FAILED, "Invalid image data URI").apply {
        initCause(error)
      }
    }
  }

  @SuppressLint("DiscouragedApi")
  private fun drawableResource(name: String): Int {
    val normalized = name.substringAfterLast('/').substringBeforeLast('.')
    val drawable = context.resources.getIdentifier(
      normalized,
      "drawable",
      context.packageName
    )
    return if (drawable != 0) {
      drawable
    } else {
      context.resources.getIdentifier(normalized, "mipmap", context.packageName)
    }
  }

  private fun openSource(value: String): InputStream {
    val uri = Uri.parse(value)
    return when (uri.scheme?.lowercase()) {
      "http", "https" -> openHttp(value)
      "content", "android.resource" ->
        context.contentResolver.openInputStream(uri)
          ?: throw MarkerError(ErrorCode.LOAD_IMAGE_FAILED, "Unable to open image: $value")
      "file" -> {
        val path = uri.path
          ?: throw MarkerError(ErrorCode.LOAD_IMAGE_FAILED, "Invalid file image URI")
        if (path.startsWith("/android_asset/")) {
          context.assets.open(path.removePrefix("/android_asset/"))
        } else {
          FileInputStream(File(path))
        }
      }
      "asset" -> context.assets.open(
        (uri.path ?: uri.schemeSpecificPart).trimStart('/')
      )
      null -> {
        val file = File(value)
        if (file.isFile) {
          FileInputStream(file)
        } else {
          val resource = drawableResource(value)
          if (resource == 0) {
            throw MarkerError(
              ErrorCode.GET_RESOURCE_FAILED,
              "Can't get resource by the path: $value"
            )
          }
          context.resources.openRawResource(resource)
        }
      }
      else ->
        context.contentResolver.openInputStream(uri)
          ?: throw MarkerError(
            ErrorCode.LOAD_IMAGE_FAILED,
            "Unsupported image URI scheme: ${uri.scheme}"
          )
    }
  }

  private fun openHttp(value: String): InputStream {
    val connection = URL(value).openConnection() as HttpURLConnection
    connection.connectTimeout = 15_000
    connection.readTimeout = 15_000
    connection.instanceFollowRedirects = true
    connection.connect()
    if (connection.responseCode !in 200..299) {
      connection.disconnect()
      throw MarkerError(
        ErrorCode.LOAD_IMAGE_FAILED,
        "Unable to load image metadata: HTTP ${connection.responseCode}"
      )
    }
    return object : InputStream() {
      private val delegate = connection.inputStream

      override fun read(): Int = delegate.read()

      override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        return delegate.read(buffer, offset, length)
      }

      override fun close() {
        try {
          delegate.close()
        } finally {
          connection.disconnect()
        }
      }
    }
  }
}
