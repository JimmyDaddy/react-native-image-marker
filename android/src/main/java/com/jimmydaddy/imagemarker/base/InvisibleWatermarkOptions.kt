package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.InvisibleWatermark

class InvisibleWatermarkOptions(options: ReadableMap) : Options(options) {
  val payload: String? = if (options.hasKey("payload")) options.getString("payload") else null
  val key: String = options.getString("key") ?: ""
  val strength: String = if (options.hasKey("strength")) options.getString("strength") ?: "balanced" else "balanced"
  val search: String = if (options.hasKey("search")) options.getString("search") ?: "fast" else "fast"

  init {
    val keyBytes = key.toByteArray(Charsets.UTF_8)
    if (keyBytes.size < InvisibleWatermark.MIN_KEY_BYTES) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "key must contain at least ${InvisibleWatermark.MIN_KEY_BYTES} UTF-8 bytes")
    }
    if (strength !in setOf("subtle", "balanced", "robust")) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "Unsupported invisible watermark strength: $strength")
    }
    if (search !in setOf("fast", "robust")) {
      throw MarkerError(ErrorCode.INVALID_PARAMS, "Unsupported invisible watermark search mode: $search")
    }
  }

  fun requirePayload(): String {
    val value = payload ?: throw MarkerError(ErrorCode.PARAMS_REQUIRED, "payload is required")
    val size = value.toByteArray(Charsets.UTF_8).size
    if (size !in 1..InvisibleWatermark.MAX_PAYLOAD_BYTES) {
      throw MarkerError(
        ErrorCode.INVALID_PARAMS,
        "payload must contain between 1 and ${InvisibleWatermark.MAX_PAYLOAD_BYTES} UTF-8 bytes"
      )
    }
    return value
  }

  companion object {
    fun checkEmbed(opts: ReadableMap, promise: Promise): InvisibleWatermarkOptions? =
      check(opts, promise, requirePayload = true)

    fun checkDetect(opts: ReadableMap, promise: Promise): InvisibleWatermarkOptions? =
      check(opts, promise, requirePayload = false)

    private fun check(
      opts: ReadableMap,
      promise: Promise,
      requirePayload: Boolean
    ): InvisibleWatermarkOptions? {
      return try {
        InvisibleWatermarkOptions(opts).also { if (requirePayload) it.requirePayload() }
      } catch (error: Exception) {
        val markerError = MarkerError.fromInvalidParams(error, "Invalid invisible watermark options")
        promise.reject(markerError.getErrorCode(), markerError.getErrMsg())
        null
      }
    }
  }
}
