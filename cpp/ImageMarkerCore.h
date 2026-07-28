#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>

namespace image_marker_core {

struct PixelSize {
  std::int32_t width;
  std::int32_t height;
};

/**
 * Fit pixel dimensions inside a square bound without cropping or upscaling.
 *
 * Invalid inputs return {0, 0}; public platform APIs validate and report their
 * own typed parameter errors before entering the shared core.
 */
inline PixelSize fitWithinMax(
    double width,
    double height,
    std::int32_t maxSize) noexcept {
  if (!std::isfinite(width) || !std::isfinite(height) || width <= 0.0 ||
      height <= 0.0 || maxSize <= 0) {
    return {0, 0};
  }

  const auto largest = std::max(width, height);
  if (largest <= static_cast<double>(maxSize)) {
    return {
        static_cast<std::int32_t>(std::min(
            std::round(width),
            static_cast<double>(std::numeric_limits<std::int32_t>::max()))),
        static_cast<std::int32_t>(std::min(
            std::round(height),
            static_cast<double>(std::numeric_limits<std::int32_t>::max()))),
    };
  }

  const auto ratio = static_cast<double>(maxSize) / largest;
  const auto boundedWidth = std::clamp<std::int64_t>(
      std::llround(width * ratio), 1, maxSize);
  const auto boundedHeight = std::clamp<std::int64_t>(
      std::llround(height * ratio), 1, maxSize);
  return {
      static_cast<std::int32_t>(boundedWidth),
      static_cast<std::int32_t>(boundedHeight),
  };
}

}  // namespace image_marker_core
