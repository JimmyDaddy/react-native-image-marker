package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

class WatermarkLayout(options: ReadableMap?) {
  val type: String
  private val gapX: String?
  private val gapY: String?
  private val offsetX: String?
  private val offsetY: String?
  private val stagger: Boolean

  val isTile: Boolean
    get() = type == TYPE_TILE

  init {
    type = if (options?.hasKey("type") == true && !options.isNull("type")) {
      options.getString("type") ?: TYPE_SINGLE
    } else {
      TYPE_SINGLE
    }
    require(type == TYPE_SINGLE || type == TYPE_TILE) {
      "layout.type must be single or tile"
    }
    gapX = readSpreadValue(options, "gapX")
    gapY = readSpreadValue(options, "gapY")
    offsetX = readSpreadValue(options, "offsetX")
    offsetY = readSpreadValue(options, "offsetY")
    stagger = if (options?.hasKey("stagger") == true && !options.isNull("stagger")) {
      options.getBoolean("stagger")
    } else {
      false
    }
  }

  fun placements(
    canvasWidth: Int,
    canvasHeight: Int,
    itemWidth: Number,
    itemHeight: Number
  ): List<Position> {
    require(isTile) { "placements are only available for tile layouts" }
    val width = itemWidth.toFloat()
    val height = itemHeight.toFloat()
    require(canvasWidth > 0 && canvasHeight > 0 && width.isFinite() && height.isFinite() && width > 0f && height > 0f) {
      "canvas and watermark dimensions must be finite and greater than zero"
    }

    val resolvedGapX = parseSpreadValue(gapX, canvasWidth.toFloat(), "layout.gapX")
    val resolvedGapY = parseSpreadValue(gapY, canvasHeight.toFloat(), "layout.gapY")
    require(resolvedGapX >= 0f && resolvedGapY >= 0f) {
      "layout gaps must be non-negative"
    }
    val stepX = width + resolvedGapX
    val stepY = height + resolvedGapY
    require(stepX.isFinite() && stepY.isFinite() && stepX > 0f && stepY > 0f) {
      "tile layout step must be finite and greater than zero"
    }

    val phaseX = normalizedOffset(
      parseSpreadValue(offsetX, canvasWidth.toFloat(), "layout.offsetX"),
      stepX
    )
    val phaseY = normalizedOffset(
      parseSpreadValue(offsetY, canvasHeight.toFloat(), "layout.offsetY"),
      stepY
    )
    val result = ArrayList<Position>()
    var row = -1
    var y = phaseY - stepY
    while (y < canvasHeight) {
      if (y + height > 0f) {
        val staggerOffset = if (stagger && row % 2 != 0) stepX / 2f else 0f
        val rowPhaseX = normalizedOffset(phaseX + staggerOffset, stepX)
        var x = rowPhaseX - stepX
        while (x < canvasWidth) {
          if (x + width > 0f) {
            result.add(Position(x, y))
            if (result.size > MAX_TILE_COPIES) {
              throw IllegalArgumentException(
                "tile layout exceeds the maximum of $MAX_TILE_COPIES copies per layer"
              )
            }
          }
          x += stepX
        }
      }
      row += 1
      y += stepY
    }
    return result
  }

  companion object {
    const val MAX_TILE_COPIES = 4096
    private const val TYPE_SINGLE = "single"
    private const val TYPE_TILE = "tile"

    private fun readSpreadValue(options: ReadableMap?, key: String): String? {
      if (options?.hasKey(key) != true || options.isNull(key)) return null
      val dynamic = options.getDynamic(key)
      return when (dynamic.type) {
        ReadableType.Number -> dynamic.asDouble().also {
          require(it.isFinite()) { "layout.$key must be a finite number or percentage" }
        }.toString()
        ReadableType.String -> dynamic.asString()?.trim()?.also {
          require(SPREAD_VALUE.matches(it)) {
            "layout.$key must be a finite number or percentage"
          }
        }
        else -> throw IllegalArgumentException(
          "layout.$key must be a finite number or percentage"
        )
      }
    }

    private fun parseSpreadValue(value: String?, relativeTo: Float, label: String): Float {
      if (value == null) return 0f
      val parsed = if (value.endsWith("%")) {
        value.dropLast(1).toFloatOrNull()?.let { relativeTo * it / 100f }
      } else {
        value.toFloatOrNull()
      }
      require(parsed != null && parsed.isFinite()) {
        "$label must be a finite number or percentage"
      }
      return parsed
    }

    private fun normalizedOffset(value: Float, step: Float): Float {
      return ((value % step) + step) % step
    }

    private val SPREAD_VALUE = Regex("^[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)%?$")
  }
}
