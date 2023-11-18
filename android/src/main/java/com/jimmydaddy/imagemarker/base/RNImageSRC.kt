package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap

data class RNImageSRC(val options: ReadableMap?) {

  var width: Int = 0
  var height: Int = 0
  var scale: Int = 1
  var uri: String = ""

  init {
    width = if (options?.hasKey("width") == true) options.getInt("width")!! else 0
    height = if (options?.hasKey("height") == true) options.getInt("height") else 0
    scale = if (options?.hasKey("scale") == true) options.getInt("scale") else 1
    uri = if (options?.hasKey("uri") == true) options.getString("uri").toString() else ""
  }
}
