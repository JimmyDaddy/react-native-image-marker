package com.jimmydaddy.imagemarker

import android.annotation.SuppressLint
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Build.VERSION.SDK_INT
import android.util.Base64
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.graphics.drawable.toBitmap
import coil.ImageLoader
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.decode.SvgDecoder
import coil.request.ImageRequest
import coil.size.Size
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.jimmydaddy.imagemarker.base.Constants.IMAGE_MARKER_TAG
import com.jimmydaddy.imagemarker.base.ErrorCode
import com.jimmydaddy.imagemarker.base.ImageOptions
import com.jimmydaddy.imagemarker.base.MarkerError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap

/**
 * Fabric-compatible image loader for Android TurboModule
 * Provides enhanced image loading with caching and compatibility
 */
class FabricImageLoader(private val context: ReactApplicationContext, private val maxSize: Int) {

    companion object {
        private const val TAG = "FabricImageLoader"
        private const val DEFAULT_CACHE_SIZE = 100
        private const val DEFAULT_RETRY_ATTEMPTS = 3
        private const val DEFAULT_TIMEOUT_MS = 30000L
        
        // Static cache shared across instances
        private val imageCache = ConcurrentHashMap<String, Bitmap?>()
        
        /**
         * Detects if Fabric renderer is available
         */
        fun isFabricEnabled(): Boolean {
            return try {
                // Check for Fabric-specific classes
                Class.forName("com.facebook.react.fabric.FabricUIManager") != null
            } catch (e: ClassNotFoundException) {
                false
            }
        }
        
        /**
         * Clears the image cache
         */
        fun clearCache() {
            imageCache.clear()
        }
        
        /**
         * Gets cache statistics
         */
        fun getCacheStats(): Map<String, Any> {
            return mapOf(
                "size" to imageCache.size,
                "keys" to imageCache.keys.toList()
            )
        }
    }

    private var imageLoader: ImageLoader = ImageLoader.Builder(context)
        .components {
            if (SDK_INT >= 28) {
                add(ImageDecoderDecoder.Factory())
            } else {
                add(GifDecoder.Factory())
            }
            add(SvgDecoder.Factory())
        }
        .allowHardware(false)
        .build()

    private val resources: Resources
        get() = context.resources

    /**
     * Load images with Fabric-compatible pipeline
     */
    @RequiresApi(Build.VERSION_CODES.N)
    suspend fun loadImages(images: List<ImageOptions>): List<Bitmap?> = withContext(Dispatchers.IO) {
        val isFabricEnabled = isFabricEnabled()
        Log.d(TAG, "Loading ${images.size} images with Fabric enabled: $isFabricEnabled")

        val deferredList = images.map { img ->
            async {
                try {
                    loadSingleImage(img, isFabricEnabled)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to load image: ${img.uri}", e)
                    null
                }
            }
        }
        deferredList.awaitAll()
    }

    /**
     * Load a single image with Fabric compatibility
     */
    private suspend fun loadSingleImage(img: ImageOptions, isFabricEnabled: Boolean): Bitmap? {
        val cacheKey = generateCacheKey(img)
        
        // Check cache first
        imageCache[cacheKey]?.let { cachedBitmap ->
            if (!cachedBitmap.isRecycled) {
                Log.d(TAG, "Using cached image for: ${img.uri}")
                return cachedBitmap
            } else {
                imageCache.remove(cacheKey)
            }
        }

        val bitmap = if (isFabricEnabled) {
            loadImageWithFabric(img)
        } else {
            loadImageWithLegacy(img)
        }

        // Cache the result if successful
        bitmap?.let { 
            if (imageCache.size >= DEFAULT_CACHE_SIZE) {
                cleanupCache()
            }
            imageCache[cacheKey] = it
        }

        return bitmap
    }

    /**
     * Load image using Fabric-compatible pipeline
     */
    private suspend fun loadImageWithFabric(img: ImageOptions): Bitmap? {
        Log.d(TAG, "Loading image with Fabric pipeline: ${img.uri}")
        
        // Check if the image source is a Fabric-processed source
        val fabricSource = img.src
        if (fabricSource is ReadableMap && fabricSource.hasKey("uri")) {
            return loadFabricImageSource(fabricSource, img)
        }
        
        // Fallback to legacy loading for non-Fabric sources
        return loadImageWithLegacy(img)
    }

    /**
     * Load image from Fabric-processed source
     */
    private suspend fun loadFabricImageSource(fabricSource: ReadableMap, img: ImageOptions): Bitmap? {
        val uri = fabricSource.getString("uri") ?: return null
        val isPackagerAsset = fabricSource.getBoolean("__packager_asset")
        val width = if (fabricSource.hasKey("width")) fabricSource.getInt("width") else 0
        val height = if (fabricSource.hasKey("height")) fabricSource.getInt("height") else 0
        val scale = if (fabricSource.hasKey("scale")) fabricSource.getDouble("scale").toFloat() else img.scale

        Log.d(TAG, "Loading Fabric image source - URI: $uri, Asset: $isPackagerAsset, Size: ${width}x${height}")

        return when {
            uri.startsWith("data:image/") -> {
                // Base64 image
                decodeBase64ToBitmap(uri)?.let { bitmap ->
                    ImageProcess.scaleBitmap(bitmap, scale)
                }
            }
            uri.startsWith("http://") || uri.startsWith("https://") -> {
                // Remote image with enhanced caching
                loadRemoteImageWithCaching(uri, width, height, scale)
            }
            uri.startsWith("file://") -> {
                // Local file
                loadLocalImage(uri, scale)
            }
            isPackagerAsset -> {
                // Packager asset - use the URI directly for remote loading
                loadRemoteImageWithCaching(uri, width, height, scale)
            }
            else -> {
                // Fallback to legacy loading
                loadImageWithLegacy(img)
            }
        }
    }

    /**
     * Load image using legacy pipeline (fallback)
     */
    private suspend fun loadImageWithLegacy(img: ImageOptions): Bitmap? {
        Log.d(TAG, "Loading image with legacy pipeline: ${img.uri}")
        
        val isCoilImg = isCoilImg(img.uri)
        
        return when {
            isBase64String(img.uri) -> {
                Log.d(TAG, "Loading Base64 Image")
                decodeBase64ToBitmap(img.uri)?.let { bitmap ->
                    val scaledBitmap = ImageProcess.scaleBitmap(bitmap, img.scale)
                        ?: throw MarkerError(ErrorCode.LOAD_IMAGE_FAILED, "Failed to scale Base64 image")
                    if (!bitmap.isRecycled && img.scale != 1f) {
                        bitmap.recycle()
                        System.gc()
                    }
                    scaledBitmap
                } ?: throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Failed to decode Base64 image")
            }
            isCoilImg -> {
                loadWithCoil(img)
            }
            else -> {
                loadResourceImage(img)
            }
        }
    }

    /**
     * Load remote image with enhanced caching for Fabric
     */
    private suspend fun loadRemoteImageWithCaching(uri: String, width: Int, height: Int, scale: Float): Bitmap? {
        val future = CompletableFuture<Bitmap?>()
        
        var request = ImageRequest.Builder(context)
            .data(uri)
            .memoryCachePolicy(coil.request.CachePolicy.ENABLED)
            .diskCachePolicy(coil.request.CachePolicy.ENABLED)
        
        if (width > 0 && height > 0) {
            request = request.size(width, height)
            Log.d(TAG, "Fabric image size: ${width}x${height}")
        } else {
            request = request.size(Size.ORIGINAL)
        }
        
        imageLoader.enqueue(request.target(
            onStart = { _ ->
                Log.d(TAG, "Start loading Fabric image: $uri")
            },
            onSuccess = { result ->
                val bitmap = result.toBitmap()
                val scaledBitmap = ImageProcess.scaleBitmap(bitmap, scale)
                if (scaledBitmap == null) {
                    future.completeExceptionally(MarkerError(ErrorCode.LOAD_IMAGE_FAILED,
                        "Can't retrieve the file from the src: $uri"))
                } else {
                    future.complete(scaledBitmap)
                }
            },
            onError = { _ ->
                future.completeExceptionally(MarkerError(ErrorCode.LOAD_IMAGE_FAILED,
                    "Can't retrieve the file from the src: $uri"))
            }
        ).build())
        
        return future.get()
    }

    /**
     * Load local file image
     */
    private suspend fun loadLocalImage(uri: String, scale: Float): Bitmap? {
        return withContext(Dispatchers.IO) {
            try {
                val path = uri.removePrefix("file://")
                val bitmap = BitmapFactory.decodeFile(path)
                bitmap?.let { ImageProcess.scaleBitmap(it, scale) }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load local image: $uri", e)
                null
            }
        }
    }

    /**
     * Load image using Coil (legacy method)
     */
    private suspend fun loadWithCoil(img: ImageOptions): Bitmap? {
        val future = CompletableFuture<Bitmap?>()
        var request = ImageRequest.Builder(context)
            .data(img.uri)
        
        if (img.src != null && img.src.width > 0 && img.src.height > 0) {
            request = request.size(img.src.width, img.src.height)
            Log.d(TAG, "src.width: ${img.src.width} src.height: ${img.src.height}")
        } else {
            request = request.size(Size.ORIGINAL)
        }
        
        imageLoader.enqueue(request.target(
            onStart = { _ ->
                Log.d(TAG, "start to load image: ${img.uri}")
            },
            onSuccess = { result ->
                val bitmap = result.toBitmap()
                val bg = ImageProcess.scaleBitmap(bitmap, img.scale)
                if (bg == null) {
                    future.completeExceptionally(MarkerError(ErrorCode.LOAD_IMAGE_FAILED,
                        "Can't retrieve the file from the src: ${img.uri}"))
                }
                future.complete(bg)
            },
            onError = { _ ->
                future.completeExceptionally(MarkerError(ErrorCode.LOAD_IMAGE_FAILED,
                    "Can't retrieve the file from the src: ${img.uri}"))
            }
        ).build())
        
        return future.get()
    }

    /**
     * Load resource image (legacy method)
     */
    private suspend fun loadResourceImage(img: ImageOptions): Bitmap? {
        val resId = getDrawableResourceByName(img.uri)
        Log.d(TAG, "resId: $resId")
        
        if (resId == 0) {
            Log.d(TAG, "cannot find res")
            throw MarkerError(ErrorCode.GET_RESOURCE_FAILED, "Can't get resource by the path: ${img.uri}")
        }
        
        val r = resources
        Log.d(TAG, "src.width: ${img.src.width} src.height: ${img.src.height}")
        val originalBitMap = BitmapFactory.decodeResource(r, resId)
        var bitmap = originalBitMap
        
        if (img.src != null && img.src.width > 0 && img.src.height > 0) {
            bitmap = Bitmap.createScaledBitmap(originalBitMap, img.src.width, img.src.height, true)
        }
        
        Log.d(TAG, "${bitmap!!.height}")
        val bg = ImageProcess.scaleBitmap(bitmap, img.scale)
        Log.d(TAG, "${bg!!.height}")
        
        if (!bitmap.isRecycled && img.scale != 1f) {
            bitmap.recycle()
            System.gc()
        }
        
        return bg
    }

    // Helper methods
    private fun isCoilImg(uri: String?): Boolean {
        return uri!!.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://") || 
               uri.startsWith("data:") && uri.contains("base64") && (uri.contains("img") || uri.contains("image"))
    }

    @SuppressLint("DiscouragedApi")
    private fun getDrawableResourceByName(name: String?): Int {
        return resources.getIdentifier(name, "drawable", context.packageName)
    }

    private fun isBase64String(s: String?): Boolean {
        if (s == null) return false
        return s.startsWith("data:image/") && s.contains(";base64,")
    }

    private fun decodeBase64ToBitmap(base64Str: String?): Bitmap? {
        if (base64Str == null) return null
        return try {
            val imageBytes = Base64.decode(base64Str.substring(base64Str.indexOf(",") + 1), Base64.DEFAULT)
            BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decode Base64 image", e)
            null
        }
    }

    private fun generateCacheKey(img: ImageOptions): String {
        return "${img.uri}_${img.scale}_${img.rotate}_${img.alpha}"
    }

    private fun cleanupCache() {
        // Simple cleanup: remove oldest entries (FIFO)
        val keysToRemove = imageCache.keys.take(imageCache.size - DEFAULT_CACHE_SIZE + 10)
        keysToRemove.forEach { key ->
            imageCache[key]?.let { bitmap ->
                if (!bitmap.isRecycled) {
                    bitmap.recycle()
                }
            }
            imageCache.remove(key)
        }
        System.gc()
    }
}