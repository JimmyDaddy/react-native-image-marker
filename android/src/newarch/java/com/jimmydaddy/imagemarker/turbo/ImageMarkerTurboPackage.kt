package com.jimmydaddy.imagemarker.turbo

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.turbomodule.core.interfaces.TurboModule

/**
 * TurboModule package for ImageMarker
 * Registers the ImageMarkerTurboModule for new architecture
 */
class ImageMarkerTurboPackage : TurboReactPackage() {
    
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == ImageMarkerTurboModule.NAME) {
            ImageMarkerTurboModule(reactContext)
        } else {
            null
        }
    }
    
    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                ImageMarkerTurboModule.NAME to ReactModuleInfo(
                    ImageMarkerTurboModule.NAME,
                    ImageMarkerTurboModule.NAME,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    true,  // hasConstants
                    false, // isCxxModule
                    true   // isTurboModule
                )
            )
        }
    }
}