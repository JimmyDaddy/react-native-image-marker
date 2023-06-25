package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

open class Options(options: ReadableMap) {
    @JvmField
    var backgroundImage: ImageOptions
    @JvmField
    var quality: Int
    @JvmField
    var filename: String?
    @JvmField
    var saveFormat: SaveFormat
    @JvmField
    var maxSize: Int

    init {
        val backgroundImageOpts = options.getMap("backgroundImage")
            ?: throw MarkerError(
                ErrorCode.PARAMS_REQUIRED,
                "backgroundImage is required"
            )
        backgroundImage = ImageOptions(backgroundImageOpts)
        quality = if (options.hasKey("quality")) options.getInt("quality") else 100
        maxSize = if (options.hasKey("maxSize")) options.getInt("maxSize") else 2048
        filename = options.getString("filename")
        saveFormat = SaveFormat.Companion.getFormat(options.getString("saveFormat"))
    }

    companion object {
        const val PROP_ICON_URI = "uri"
        fun checkParams(opts: ReadableMap, promise: Promise): Options? {
            try {
                return Options(opts)
            } catch (e: MarkerError) {
                promise.reject(e.getErrorCode(), e.getErrMsg())
            }
            return null
        }
    }
}
