package com.jimmydaddy.imagemarker.turbo

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Legacy architecture stub for ImageMarkerTurboPackage
 * This file exists only to satisfy build requirements when newArchEnabled=false
 * The actual TurboPackage implementation is in src/newarch/
 * 
 * In legacy architecture, the ImageMarkerPackage provides the native module
 * through the standard React Native bridge mechanism.
 */
class ImageMarkerTurboPackage : TurboReactPackage() {
    
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        // In legacy architecture, modules are provided by ImageMarkerPackage
        return null
    }
    
    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            // Return empty map in legacy architecture
            emptyMap<String, ReactModuleInfo>()
        }
    }
}
