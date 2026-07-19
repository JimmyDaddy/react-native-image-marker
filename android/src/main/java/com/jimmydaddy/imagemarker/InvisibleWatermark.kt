package com.jimmydaddy.imagemarker

import android.graphics.Bitmap
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.ByteOrder
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

internal data class InvisibleWatermarkDetection(
  val detected: Boolean,
  val payload: String? = null,
  val confidence: Double,
  val bitErrorRate: Double? = null,
  val scale: Double? = null
) {
  fun toJson(): String = JSONObject().apply {
    put("detected", detected)
    payload?.let { put("payload", it) }
    put("confidence", confidence)
    bitErrorRate?.let { put("bitErrorRate", it) }
    scale?.let { put("scale", it) }
    put("algorithm", InvisibleWatermark.ALGORITHM)
  }.toString()
}

/** Native implementation of RFC 0003's versioned DCT-QIM pixel format. */
internal object InvisibleWatermark {
  const val ALGORITHM = "dct-qim-v1"
  const val MIN_WIDTH = 128
  const val MIN_HEIGHT = 88
  const val MAX_PAYLOAD_BYTES = 12
  const val MIN_KEY_BYTES = 16

  private const val BLOCK_SIZE = 8
  private const val TILE_WIDTH = 16
  private const val TILE_HEIGHT = 11
  private const val FRAME_BYTES = 22
  private const val FRAME_BITS = FRAME_BYTES * 8
  private const val PAYLOAD_OFFSET = 4
  private const val CRC_OFFSET = 16
  private const val AUTH_OFFSET = 18
  private const val MAGIC_0 = 0x49
  private const val MAGIC_1 = 0x4d
  private const val FRAME_VERSION = 1

  private val coefficientPairs = arrayOf(
    intArrayOf(1, 2, 2, 1),
    intArrayOf(2, 3, 3, 2),
    intArrayOf(1, 3, 3, 1),
    intArrayOf(2, 4, 4, 2)
  )
  private val basisCache = Array(5) { u -> Array(5) { v -> createBasis(u, v) } }

  private data class Observation(
    val differences: DoubleArray,
    val blockX: Int,
    val blockY: Int
  )

  private data class Candidate(
    val payload: String,
    val confidence: Double,
    val bitErrorRate: Double
  )

  internal data class PixelBuffer(
    val pixels: IntArray,
    val width: Int,
    val height: Int
  )

  private val resizeScales = doubleArrayOf(0.95, 1.05, 0.9, 1.1)
  private val channelShifts = intArrayOf(24, 16, 8, 0)

  fun embed(
    bitmap: Bitmap,
    payload: String,
    key: String,
    strength: String
  ): Bitmap {
    val pixels = IntArray(bitmap.width * bitmap.height)
    bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
    embedPixels(pixels, bitmap.width, bitmap.height, payload, key, strength)
    return Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888).apply {
      density = bitmap.density
      setPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
    }
  }

  fun detect(
    bitmap: Bitmap,
    key: String,
    strength: String,
    search: String
  ): InvisibleWatermarkDetection {
    val pixels = IntArray(bitmap.width * bitmap.height)
    bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
    return detectPixels(pixels, bitmap.width, bitmap.height, key, strength, search)
  }

  internal fun embedPixels(
    pixels: IntArray,
    width: Int,
    height: Int,
    payload: String,
    key: String,
    strength: String = "balanced"
  ) {
    validatePixels(pixels, width, height)
    val frame = buildFrame(payload, key)
    val bits = bytesToBits(frame)
    val keyBytes = key.toByteArray(Charsets.UTF_8)
    val seed = seedForKey(keyBytes)
    val permutation = permutation(key)
    val delta = strengthDelta(strength)
    val blocksX = width / BLOCK_SIZE
    val blocksY = height / BLOCK_SIZE
    for (blockY in 0 until blocksY) {
      for (blockX in 0 until blocksX) {
        val slot = (blockY % TILE_HEIGHT) * TILE_WIDTH + (blockX % TILE_WIDTH)
        val mixed = mixSlot(seed, slot)
        val pair = coefficientPairs[mixed and 3]
        val dither = ((((mixed ushr 8) and 0xffffff) / 16777216.0) - 0.5) * delta
        embedBlock(
          pixels,
          width,
          blockX * BLOCK_SIZE,
          blockY * BLOCK_SIZE,
          bits[permutation[slot]],
          pair,
          dither,
          delta
        )
      }
    }
  }

  internal fun detectPixels(
    pixels: IntArray,
    width: Int,
    height: Int,
    key: String,
    strength: String = "balanced",
    search: String = "fast"
  ): InvisibleWatermarkDetection {
    validatePixels(pixels, width, height)
    val keyBytes = key.toByteArray(Charsets.UTF_8)
    require(keyBytes.size >= MIN_KEY_BYTES) { "key must contain at least $MIN_KEY_BYTES UTF-8 bytes." }
    val delta = strengthDelta(strength)
    require(search == "fast" || search == "robust") { "Unsupported invisible watermark search mode: $search." }
    val permutation = permutation(key)
    val seed = seedForKey(keyBytes)
    val scales = if (search == "robust") doubleArrayOf(1.0, *resizeScales) else doubleArrayOf(1.0)

    for (scale in scales) {
      val candidateBuffer = if (scale == 1.0) {
        PixelBuffer(pixels, width, height)
      } else {
        val targetWidth = (width / scale).roundToInt()
        val targetHeight = (height / scale).roundToInt()
        if (targetWidth < MIN_WIDTH || targetHeight < MIN_HEIGHT) continue
        if (scale < 1) {
          resizePixelsNearest(pixels, width, height, targetWidth, targetHeight)
        } else {
          resizePixelsBilinear(pixels, width, height, targetWidth, targetHeight)
        }
      }
      val deltaFactors = if (scale == 1.0) doubleArrayOf(1.0) else doubleArrayOf(1.0, 0.9)
      for (factor in deltaFactors) {
        val candidate = detectAtScale(
          candidateBuffer.pixels,
          candidateBuffer.width,
          candidateBuffer.height,
          keyBytes,
          permutation,
          seed,
          delta * factor,
          robust = false
        )
        if (candidate != null) return candidate.toDetection(scale)
      }
    }

    if (search == "robust") {
      val candidate = detectAtScale(
        pixels,
        width,
        height,
        keyBytes,
        permutation,
        seed,
        delta,
        robust = true
      )
      if (candidate != null) return candidate.toDetection()
    }
    return InvisibleWatermarkDetection(false, confidence = 0.0)
  }

  private fun detectAtScale(
    pixels: IntArray,
    width: Int,
    height: Int,
    keyBytes: ByteArray,
    permutation: IntArray,
    seed: Int,
    delta: Double,
    robust: Boolean
  ): Candidate? {
    val offsets = if (robust) BLOCK_SIZE else 1
    val phaseXs = if (robust) TILE_WIDTH else 1
    val phaseYs = if (robust) TILE_HEIGHT else 1
    var best: Candidate? = null

    for (offsetY in 0 until offsets) {
      for (offsetX in 0 until offsets) {
        val observations = observeGrid(pixels, width, height, offsetX, offsetY)
        for (phaseY in 0 until phaseYs) {
          for (phaseX in 0 until phaseXs) {
            val candidate = decodeCandidate(
              observations,
              keyBytes,
              permutation,
              seed,
              delta,
              phaseX,
              phaseY
            ) ?: continue
            if (candidate.confidence > (best?.confidence ?: -1.0)) {
              best = candidate
              if (!robust || candidate.confidence >= 0.98) {
                return candidate
              }
            }
          }
        }
      }
    }
    return best
  }

  internal fun frameForTesting(payload: String, key: String): ByteArray = buildFrame(payload, key)

  internal fun permutationForTesting(key: String): IntArray = permutation(key)

  internal fun resizePixelsForTesting(
    pixels: IntArray,
    width: Int,
    height: Int,
    scale: Double
  ): PixelBuffer = resizePixelsBilinear(
    pixels,
    width,
    height,
    (width * scale).roundToInt(),
    (height * scale).roundToInt()
  )

  private fun Candidate.toDetection(scale: Double = 1.0) = InvisibleWatermarkDetection(
    detected = true,
    payload = payload,
    confidence = confidence,
    bitErrorRate = bitErrorRate,
    scale = scale.takeUnless { it == 1.0 }
  )

  private fun resizePixelsNearest(
    pixels: IntArray,
    width: Int,
    height: Int,
    targetWidth: Int,
    targetHeight: Int
  ): PixelBuffer {
    val output = IntArray(targetWidth * targetHeight)
    for (targetY in 0 until targetHeight) {
      val sourceY = min(height - 1, floor((targetY + 0.5) * height / targetHeight).toInt())
      for (targetX in 0 until targetWidth) {
        val sourceX = min(width - 1, floor((targetX + 0.5) * width / targetWidth).toInt())
        output[targetY * targetWidth + targetX] = pixels[sourceY * width + sourceX]
      }
    }
    return PixelBuffer(output, targetWidth, targetHeight)
  }

  private fun resizePixelsBilinear(
    pixels: IntArray,
    width: Int,
    height: Int,
    targetWidth: Int,
    targetHeight: Int
  ): PixelBuffer {
    require(targetWidth > 0 && targetHeight > 0) { "Resize dimensions must be positive." }
    val output = IntArray(targetWidth * targetHeight)
    val scaleX = width.toDouble() / targetWidth
    val scaleY = height.toDouble() / targetHeight
    for (targetY in 0 until targetHeight) {
      val sourceY = (targetY + 0.5) * scaleY - 0.5
      val top = max(0, min(height - 1, floor(sourceY).toInt()))
      val bottom = min(height - 1, top + 1)
      val weightY = max(0.0, min(1.0, sourceY - top))
      for (targetX in 0 until targetWidth) {
        val sourceX = (targetX + 0.5) * scaleX - 0.5
        val left = max(0, min(width - 1, floor(sourceX).toInt()))
        val right = min(width - 1, left + 1)
        val weightX = max(0.0, min(1.0, sourceX - left))
        val topLeft = pixels[top * width + left]
        val topRight = pixels[top * width + right]
        val bottomLeft = pixels[bottom * width + left]
        val bottomRight = pixels[bottom * width + right]
        var pixel = 0
        for (shift in channelShifts) {
          val topValue = channel(topLeft, shift) * (1 - weightX) + channel(topRight, shift) * weightX
          val bottomValue = channel(bottomLeft, shift) * (1 - weightX) + channel(bottomRight, shift) * weightX
          pixel = pixel or ((topValue * (1 - weightY) + bottomValue * weightY).roundToInt().coerceIn(0, 255) shl shift)
        }
        output[targetY * targetWidth + targetX] = pixel
      }
    }
    return PixelBuffer(output, targetWidth, targetHeight)
  }

  private fun channel(pixel: Int, shift: Int): Int = (pixel ushr shift) and 0xff

  private fun validatePixels(pixels: IntArray, width: Int, height: Int) {
    require(width >= MIN_WIDTH && height >= MIN_HEIGHT) {
      "invisible watermark images must be at least ${MIN_WIDTH}x${MIN_HEIGHT} pixels."
    }
    require(pixels.size >= width * height) { "Pixel buffer is smaller than its declared dimensions." }
  }

  private fun buildFrame(payload: String, key: String): ByteArray {
    val payloadBytes = payload.toByteArray(Charsets.UTF_8)
    val keyBytes = key.toByteArray(Charsets.UTF_8)
    require(payloadBytes.size in 1..MAX_PAYLOAD_BYTES) {
      "payload must contain between 1 and $MAX_PAYLOAD_BYTES UTF-8 bytes."
    }
    require(keyBytes.size >= MIN_KEY_BYTES) { "key must contain at least $MIN_KEY_BYTES UTF-8 bytes." }
    val frame = ByteArray(FRAME_BYTES)
    frame[0] = MAGIC_0.toByte()
    frame[1] = MAGIC_1.toByte()
    frame[2] = FRAME_VERSION.toByte()
    frame[3] = payloadBytes.size.toByte()
    payloadBytes.copyInto(frame, PAYLOAD_OFFSET)
    val crc = crc16(frame.copyOfRange(0, CRC_OFFSET))
    frame[CRC_OFFSET] = (crc ushr 8).toByte()
    frame[CRC_OFFSET + 1] = crc.toByte()
    val tag = hmac(keyBytes, frame.copyOfRange(0, AUTH_OFFSET))
    tag.copyInto(frame, AUTH_OFFSET, 0, 4)
    return frame
  }

  private fun parseFrame(frame: ByteArray, keyBytes: ByteArray): String? {
    val length = frame.getOrNull(3)?.toInt()?.and(0xff) ?: return null
    if (
      frame.size != FRAME_BYTES ||
      (frame[0].toInt() and 0xff) != MAGIC_0 ||
      (frame[1].toInt() and 0xff) != MAGIC_1 ||
      (frame[2].toInt() and 0xff) != FRAME_VERSION ||
      length !in 1..MAX_PAYLOAD_BYTES
    ) return null
    val expectedCrc = crc16(frame.copyOfRange(0, CRC_OFFSET))
    val actualCrc = ((frame[CRC_OFFSET].toInt() and 0xff) shl 8) or
      (frame[CRC_OFFSET + 1].toInt() and 0xff)
    if (expectedCrc != actualCrc) return null
    val expectedTag = hmac(keyBytes, frame.copyOfRange(0, AUTH_OFFSET)).copyOfRange(0, 4)
    if (!constantTimeEquals(expectedTag, frame.copyOfRange(AUTH_OFFSET, FRAME_BYTES))) return null
    return String(frame, PAYLOAD_OFFSET, length, Charsets.UTF_8)
  }

  private fun hmac(key: ByteArray, value: ByteArray): ByteArray =
    Mac.getInstance("HmacSHA256").run {
      init(SecretKeySpec(key, "HmacSHA256"))
      doFinal(value)
    }

  private fun seedForKey(keyBytes: ByteArray): Int {
    val digest = hmac(keyBytes, "react-native-image-marker:dct-qim-v1".toByteArray(Charsets.UTF_8))
    val seed = ByteBuffer.wrap(digest, 0, 4).order(ByteOrder.BIG_ENDIAN).int
    return if (seed == 0) 0x6d2b79f5 else seed
  }

  private fun permutation(key: String): IntArray {
    val keyBytes = key.toByteArray(Charsets.UTF_8)
    require(keyBytes.size >= MIN_KEY_BYTES) { "key must contain at least $MIN_KEY_BYTES UTF-8 bytes." }
    val result = IntArray(FRAME_BITS) { it }
    var state = seedForKey(keyBytes)
    for (index in result.lastIndex downTo 1) {
      state = xorshift32(state)
      val swapIndex = ((state.toLong() and 0xffffffffL) % (index + 1)).toInt()
      val value = result[index]
      result[index] = result[swapIndex]
      result[swapIndex] = value
    }
    return result
  }

  private fun xorshift32(value: Int): Int {
    var output = value
    output = output xor (output shl 13)
    output = output xor (output ushr 17)
    output = output xor (output shl 5)
    return output
  }

  private fun mixSlot(seed: Int, slot: Int): Int {
    var mixed = seed xor ((slot + 1) * 0x9e3779b1.toInt())
    mixed = mixed xor (mixed ushr 16)
    mixed *= 0x85ebca6b.toInt()
    mixed = mixed xor (mixed ushr 13)
    mixed *= 0xc2b2ae35.toInt()
    mixed = mixed xor (mixed ushr 16)
    return mixed
  }

  private fun crc16(bytes: ByteArray): Int {
    var crc = 0xffff
    for (byte in bytes) {
      crc = crc xor ((byte.toInt() and 0xff) shl 8)
      repeat(8) {
        crc = ((crc shl 1) xor if ((crc and 0x8000) != 0) 0x1021 else 0) and 0xffff
      }
    }
    return crc
  }

  private fun constantTimeEquals(left: ByteArray, right: ByteArray): Boolean {
    if (left.size != right.size) return false
    var mismatch = 0
    for (index in left.indices) mismatch = mismatch or (left[index].toInt() xor right[index].toInt())
    return mismatch == 0
  }

  private fun bytesToBits(bytes: ByteArray): IntArray = IntArray(bytes.size * 8) { index ->
    ((bytes[index ushr 3].toInt() and 0xff) ushr (7 - (index and 7))) and 1
  }

  private fun bitsToBytes(bits: IntArray): ByteArray {
    val bytes = ByteArray((bits.size + 7) / 8)
    for (index in bits.indices) {
      bytes[index ushr 3] = (bytes[index ushr 3].toInt() or
        (bits[index] shl (7 - (index and 7)))).toByte()
    }
    return bytes
  }

  private fun strengthDelta(strength: String): Double = when (strength) {
    "subtle" -> 18.0
    "balanced" -> 28.0
    "robust" -> 42.0
    else -> throw IllegalArgumentException("Unsupported invisible watermark strength: $strength.")
  }

  private fun createBasis(u: Int, v: Int): DoubleArray {
    val alphaU = if (u == 0) sqrt(1.0 / BLOCK_SIZE) else sqrt(2.0 / BLOCK_SIZE)
    val alphaV = if (v == 0) sqrt(1.0 / BLOCK_SIZE) else sqrt(2.0 / BLOCK_SIZE)
    return DoubleArray(BLOCK_SIZE * BLOCK_SIZE) { index ->
      val x = index % BLOCK_SIZE
      val y = index / BLOCK_SIZE
      alphaU * alphaV *
        cos(((2 * x + 1) * u * PI) / (2 * BLOCK_SIZE)) *
        cos(((2 * y + 1) * v * PI) / (2 * BLOCK_SIZE))
    }
  }

  private fun luminanceBlock(
    pixels: IntArray,
    width: Int,
    startX: Int,
    startY: Int
  ): Pair<DoubleArray, Boolean> {
    var opaque = 0
    val values = DoubleArray(BLOCK_SIZE * BLOCK_SIZE)
    for (y in 0 until BLOCK_SIZE) {
      for (x in 0 until BLOCK_SIZE) {
        val pixel = pixels[(startY + y) * width + startX + x]
        if ((pixel ushr 24) >= 224) opaque += 1
        val red = (pixel ushr 16) and 0xff
        val green = (pixel ushr 8) and 0xff
        val blue = pixel and 0xff
        values[y * BLOCK_SIZE + x] = red * 0.299 + green * 0.587 + blue * 0.114
      }
    }
    return values to (opaque >= 56)
  }

  private fun coefficient(luminance: DoubleArray, basis: DoubleArray): Double {
    var result = 0.0
    for (index in luminance.indices) result += luminance[index] * basis[index]
    return result
  }

  private fun embedBlock(
    pixels: IntArray,
    width: Int,
    startX: Int,
    startY: Int,
    bit: Int,
    pair: IntArray,
    dither: Double,
    delta: Double
  ) {
    val (luminance, usable) = luminanceBlock(pixels, width, startX, startY)
    if (!usable) return
    val first = basisCache[pair[0]][pair[1]]
    val second = basisCache[pair[2]][pair[3]]
    val difference = coefficient(luminance, first) - coefficient(luminance, second)
    val normalized = (difference - dither) / delta
    val rounded = roundLikeJavaScript(normalized)
    val quantized = if ((rounded and 1) == bit) rounded else {
      val lower = rounded - 1
      val upper = rounded + 1
      if (abs(normalized - lower) <= abs(normalized - upper)) lower else upper
    }
    val shift = (quantized * delta + dither - difference) / 2.0
    for (y in 0 until BLOCK_SIZE) {
      for (x in 0 until BLOCK_SIZE) {
        val offset = (startY + y) * width + startX + x
        val pixel = pixels[offset]
        val alpha = pixel ushr 24
        if (alpha < 224) continue
        val index = y * BLOCK_SIZE + x
        val luminanceShift = shift * (first[index] - second[index])
        val red = clampByte(((pixel ushr 16) and 0xff) + luminanceShift)
        val green = clampByte(((pixel ushr 8) and 0xff) + luminanceShift)
        val blue = clampByte((pixel and 0xff) + luminanceShift)
        pixels[offset] = (alpha shl 24) or (red shl 16) or (green shl 8) or blue
      }
    }
  }

  private fun roundLikeJavaScript(value: Double): Int = floor(value + 0.5).toInt()

  private fun clampByte(value: Double): Int = roundLikeJavaScript(value).coerceIn(0, 255)

  private fun observeGrid(
    pixels: IntArray,
    width: Int,
    height: Int,
    offsetX: Int,
    offsetY: Int
  ): List<Observation> {
    val blocksX = (width - offsetX) / BLOCK_SIZE
    val blocksY = (height - offsetY) / BLOCK_SIZE
    val observations = ArrayList<Observation>(blocksX * blocksY)
    for (blockY in 0 until blocksY) {
      for (blockX in 0 until blocksX) {
        val (luminance, usable) = luminanceBlock(
          pixels,
          width,
          offsetX + blockX * BLOCK_SIZE,
          offsetY + blockY * BLOCK_SIZE
        )
        if (!usable) continue
        val differences = DoubleArray(coefficientPairs.size) { index ->
          val pair = coefficientPairs[index]
          coefficient(luminance, basisCache[pair[0]][pair[1]]) -
            coefficient(luminance, basisCache[pair[2]][pair[3]])
        }
        observations += Observation(differences, blockX, blockY)
      }
    }
    return observations
  }

  private fun decodeCandidate(
    observations: List<Observation>,
    keyBytes: ByteArray,
    permutation: IntArray,
    seed: Int,
    delta: Double,
    phaseX: Int,
    phaseY: Int
  ): Candidate? {
    val votes = DoubleArray(FRAME_BITS)
    val counts = IntArray(FRAME_BITS)
    val hardBits = IntArray(observations.size)
    val frameIndexes = IntArray(observations.size)
    observations.forEachIndexed { observationIndex, observation ->
      val slot = ((observation.blockY + phaseY) % TILE_HEIGHT) * TILE_WIDTH +
        ((observation.blockX + phaseX) % TILE_WIDTH)
      val mixed = mixSlot(seed, slot)
      val dither = ((((mixed ushr 8) and 0xffffff) / 16777216.0) - 0.5) * delta
      val normalized = (observation.differences[mixed and 3] - dither) / delta
      val rounded = roundLikeJavaScript(normalized)
      val bit = abs(rounded % 2)
      val reliability = max(0.0, min(1.0, abs(normalized - floor(normalized) - 0.5) * 2.0))
      val frameIndex = permutation[slot]
      votes[frameIndex] += if (bit == 1) reliability else -reliability
      counts[frameIndex] += 1
      hardBits[observationIndex] = bit
      frameIndexes[observationIndex] = frameIndex
    }
    if (counts.any { it == 0 }) return null
    val decodedBits = IntArray(FRAME_BITS) { if (votes[it] >= 0) 1 else 0 }
    val payload = parseFrame(bitsToBytes(decodedBits), keyBytes) ?: return null
    var mismatches = 0
    hardBits.indices.forEach { index ->
      if (hardBits[index] != decodedBits[frameIndexes[index]]) mismatches += 1
    }
    val bitErrorRate = if (observations.isEmpty()) 1.0 else mismatches.toDouble() / observations.size
    var margin = 0.0
    for (index in 0 until FRAME_BITS) {
      margin += min(1.0, abs(votes[index]) / counts[index])
    }
    margin /= FRAME_BITS
    val confidence = max(0.0, min(1.0, margin * 0.6 + (1.0 - bitErrorRate) * 0.4))
    return Candidate(payload, confidence, bitErrorRate)
  }
}
