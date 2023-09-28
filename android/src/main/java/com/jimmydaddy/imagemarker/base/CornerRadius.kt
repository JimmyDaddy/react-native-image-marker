package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap

import android.graphics.RectF

data class CornerRadius(val opts: ReadableMap?) {
  private var topLeft: Radius? = null
  private var topRight: Radius? = null
  private var bottomLeft: Radius? = null
  private var bottomRight: Radius? = null
  private var all: Radius? = null

  init {

    val iterator = opts?.entryIterator

    if (iterator != null) {
      while (iterator.hasNext()) {
        val entry = iterator.next()
        val cornerRadius = entry.value

        when (entry.key) {
          "topLeft" -> {
            if (cornerRadius == null) break
            topLeft = Radius(cornerRadius as ReadableMap?)
          }

          "topRight" -> {
            if (cornerRadius == null) break
            topRight = Radius(cornerRadius as ReadableMap?)
          }

          "bottomLeft" -> {
            if (cornerRadius == null) break
            bottomLeft = Radius(cornerRadius as ReadableMap?)
          }

          "bottomRight" -> {
            if (cornerRadius == null) break
            bottomRight = Radius(cornerRadius as ReadableMap?)
          }

          else -> {
            if (cornerRadius == null) break
            all = Radius(cornerRadius as ReadableMap?)
          }
        }
      }
    }
  }

  fun radii(rect: RectF): FloatArray {
    var mxRadius = 0f
    var myRadius = 0f

    if (all != null) {
      mxRadius = Utils.parseSpreadValue(all!!.x, rect.width())
      myRadius = Utils.parseSpreadValue(all!!.y, rect.height())
    }

    val radii = floatArrayOf(
      mxRadius, // topLeftX
      myRadius, // topLeftY
      mxRadius, // topRightX
      myRadius, // topRightY
      mxRadius, // bottomRightX
      myRadius, // bottomRightY
      mxRadius, // bottomLeftX
      myRadius  // bottomLeftY
    )

    if (topLeft != null) {
      radii[0] = Utils.parseSpreadValue(topLeft!!.x, rect.width())
      radii[1] = Utils.parseSpreadValue(topLeft!!.y, rect.height())
    }

    if (topRight != null) {
      radii[2] = Utils.parseSpreadValue(topRight!!.x, rect.width())
      radii[3] = Utils.parseSpreadValue(topRight!!.y, rect.height())
    }

    if (bottomRight != null) {
      radii[4] = Utils.parseSpreadValue(bottomRight!!.x, rect.width())
      radii[5] = Utils.parseSpreadValue(bottomRight!!.y, rect.height())
    }

    if (bottomLeft != null) {
      radii[6] = Utils.parseSpreadValue(bottomLeft!!.x, rect.width())
      radii[7] = Utils.parseSpreadValue(bottomLeft!!.y, rect.height())
    }

    return radii
  }
}
