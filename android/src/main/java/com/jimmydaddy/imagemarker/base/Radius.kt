package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap

data class Radius(val options: ReadableMap?) {

  var x: String = "0"
  var y: String = "0"

  init {
    x = Utils.handleDynamicToString(options?.getDynamic("x"))
    y = Utils.handleDynamicToString(options?.getDynamic("y"))
  }
}
