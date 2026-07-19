package com.jimmydaddy.imagemarker

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap

abstract class NativeImageMarkerSpec(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return NAME
  }

  abstract fun markWithText(options: ReadableMap, promise: Promise)

  abstract fun markWithImage(options: ReadableMap, promise: Promise)

  abstract fun markWithWatermarks(options: ReadableMap, promise: Promise)

  abstract fun embedInvisible(options: ReadableMap, promise: Promise)

  abstract fun detectInvisible(options: ReadableMap, promise: Promise)

  companion object {
    const val NAME = "ImageMarker"
  }
}
