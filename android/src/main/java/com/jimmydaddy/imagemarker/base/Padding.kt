package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap

open class Padding(paddingData: ReadableMap?) {
  private var paddingTop: String = "0"
  private var paddingLeft: String = "0"
  private var paddingBottom: String = "0"
  private var paddingRight: String = "0"

  init {
    var topValue: String = "0"
    var leftValue: String = "0"
    var bottomValue: String = "0"
    var rightValue: String = "0"

    val iterator = paddingData?.entryIterator

    if (iterator != null) {
      while (iterator.hasNext())  {
        val entry = iterator.next()
        val paddingValue = entry.value
        when (entry.key) {
          "padding" -> {
            if (paddingValue is String) {
              var paddingValue = paddingValue.trim()
              if (!Utils.checkSpreadValue(paddingValue, maxLength = 4)) {
                throw Exception("padding is invalid")
              }
              val values = paddingValue.split(" ")
              when (values.size) {
                1 -> {
                  topValue = values[0]
                  leftValue = values[0]
                  bottomValue = values[0]
                  rightValue = values[0]
                }

                2 -> {
                  topValue = values[0]
                  leftValue = values[1]
                  bottomValue = values[0]
                  rightValue = values[1]
                }

                3 -> {
                  topValue = values[0]
                  leftValue = values[1]
                  bottomValue = values[2]
                  rightValue = values[1]
                }

                4 -> {
                  topValue = values[0]
                  leftValue = values[1]
                  bottomValue = values[2]
                  rightValue = values[3]
                }
              }
            } else if (paddingValue is Number) {
              topValue = paddingValue.toString()
              leftValue = paddingValue.toString()
              bottomValue = paddingValue.toString()
              rightValue = paddingValue.toString()
            }
          }

          "paddingLeft" -> {
            if (paddingValue is String) {
              if (!Utils.checkSpreadValue(paddingValue, maxLength = 1)) {
                throw Exception("padding is invalid")
              }
              leftValue = paddingValue
            } else if (paddingValue is Number) {
              leftValue = paddingValue.toString()
            }
          }

          "paddingRight" -> {
            if (paddingValue is String) {
              if (!Utils.checkSpreadValue(paddingValue, maxLength = 1)) {
                throw Exception("padding is invalid")
              }
              rightValue = paddingValue
            } else if (paddingValue is Number) {
              rightValue = paddingValue.toString()
            }
          }

          "paddingTop" -> {
            if (paddingValue is String) {
              if (!Utils.checkSpreadValue(paddingValue, maxLength = 1)) {
                throw Exception("padding is invalid")
              }
              topValue = paddingValue
            } else if (paddingValue is Number) {
              topValue = paddingValue.toString()
            }
          }

          "paddingBottom" -> {
            if (paddingValue is String) {
              if (!Utils.checkSpreadValue(paddingValue, maxLength = 1)) {
                throw Exception("padding is invalid")
              }
              bottomValue = paddingValue
            } else if (paddingValue is Number) {
              bottomValue = paddingValue.toString()
            }
          }

          "paddingHorizontal", "paddingX" -> {
            if (paddingValue is String) {
              if (!Utils.checkSpreadValue(paddingValue, maxLength = 1)) {
                throw Exception("padding is invalid")
              }
              rightValue = paddingValue
              leftValue = paddingValue
            } else if (paddingValue is Number) {
              leftValue = paddingValue.toString()
              rightValue = paddingValue.toString()
            }
          }

          "paddingVertical", "paddingY" -> {
            if (paddingValue is String) {
              if (!Utils.checkSpreadValue(paddingValue, maxLength = 1)) {
                throw Exception("padding is invalid")
              }
              topValue = paddingValue
              bottomValue = paddingValue
            } else if (paddingValue is Number) {
              topValue = paddingValue.toString()
              bottomValue = paddingValue.toString()
            }
          }

          else -> {}
        }
      }
    }

    paddingTop = topValue
    paddingLeft = leftValue
    paddingBottom = bottomValue
    paddingRight = rightValue
  }

  fun toEdgeInsets(width: Int, height: Int): MarkerInsets {
    val topValue = Utils.parseSpreadValue(paddingTop, relativeTo = height) ?: 0f
    val leftValue = Utils.parseSpreadValue(paddingLeft, relativeTo = width) ?: 0f
    val bottomValue = Utils.parseSpreadValue(paddingBottom, relativeTo = height) ?: 0f
    val rightValue = Utils.parseSpreadValue(paddingRight, relativeTo = width) ?: 0f
    return MarkerInsets(topValue.toInt(), leftValue.toInt(), bottomValue.toInt(), rightValue.toInt())
  }
}
