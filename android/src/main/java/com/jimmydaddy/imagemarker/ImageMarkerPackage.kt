package com.jimmydaddy.imagemarker

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class ImageMarkerPackage : TurboReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == NativeImageMarkerSpec.NAME) {
      ImageMarkerManager(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        NativeImageMarkerSpec.NAME to ReactModuleInfo(
          NativeImageMarkerSpec.NAME,
          ImageMarkerManager::class.java.name,
          false,
          false,
          false,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        )
      )
    }
  }
}
