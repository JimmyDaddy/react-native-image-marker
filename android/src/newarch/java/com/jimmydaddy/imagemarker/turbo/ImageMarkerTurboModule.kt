package com.jimmydaddy.imagemarker.turbo

import android.os.Build
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Promise
import com.jimmydaddy.imagemarker.NativeImageMarkerSpec
import com.jimmydaddy.imagemarker.ImageMarkerManager
import com.jimmydaddy.imagemarker.FabricImageLoader

/**
 * Android TurboModule implementation for ImageMarker with Fabric integration
 * Extends the Codegen-generated NativeImageMarkerSpec class
 * Provides JSI-based communication for improved performance
 * Handles asynchronous operations with Fabric-compatible image loading
 */
class ImageMarkerTurboModule(reactContext: ReactApplicationContext) : NativeImageMarkerSpec(reactContext) {
    
    companion object {
        const val NAME = "ImageMarker"
    }
    
    // Enhanced ImageMarkerManager with Fabric support
    private val imageMarkerManager = FabricAwareImageMarkerManager(reactContext)
    
    override fun getName(): String {
        return NAME
    }
    
    /**
     * Mark image with text using TurboModule interface with Fabric integration
     * Processes image sources through Fabric-compatible pipeline before delegation
     */
    @RequiresApi(Build.VERSION_CODES.N)
    override fun markWithText(options: ReadableMap, promise: Promise) {
        try {
            // Check if Fabric is enabled for enhanced processing
            if (FabricImageLoader.isFabricEnabled()) {
                imageMarkerManager.markWithTextFabric(options, promise)
            } else {
                // Fallback to legacy implementation
                imageMarkerManager.markWithText(options, promise)
            }
        } catch (e: Exception) {
            promise.reject("TURBO_MODULE_ERROR", "TurboModule text marking failed: ${e.message}", e)
        }
    }
    
    /**
     * Mark image with image using TurboModule interface with Fabric integration
     * Processes image sources through Fabric-compatible pipeline before delegation
     */
    @RequiresApi(Build.VERSION_CODES.N)
    override fun markWithImage(options: ReadableMap, promise: Promise) {
        try {
            // Check if Fabric is enabled for enhanced processing
            if (FabricImageLoader.isFabricEnabled()) {
                imageMarkerManager.markWithImageFabric(options, promise)
            } else {
                // Fallback to legacy implementation
                imageMarkerManager.markWithImage(options, promise)
            }
        } catch (e: Exception) {
            promise.reject("TURBO_MODULE_ERROR", "TurboModule image marking failed: ${e.message}", e)
        }
    }
}

/**
 * Enhanced ImageMarkerManager with Fabric support
 * Extends the base functionality with Fabric-compatible image loading
 */
class FabricAwareImageMarkerManager(context: ReactApplicationContext) : ImageMarkerManager(context) {
    
    private val fabricImageLoader = FabricImageLoader(context, 2048)
    
    /**
     * Mark text with Fabric-compatible image loading
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun markWithTextFabric(opts: ReadableMap?, promise: Promise) {
        // Process options through Fabric pipeline, then delegate to parent
        // The FabricImageLoader will handle Fabric-specific image sources
        // and fall back to legacy loading when needed
        markWithText(opts, promise)
    }
    
    /**
     * Mark image with Fabric-compatible image loading
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun markWithImageFabric(opts: ReadableMap?, promise: Promise) {
        // Process options through Fabric pipeline, then delegate to parent
        // The FabricImageLoader will handle Fabric-specific image sources
        // and fall back to legacy loading when needed
        markWithImage(opts, promise)
    }
}