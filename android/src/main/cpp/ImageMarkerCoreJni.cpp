#include <jni.h>

#include <cstdint>

#include "ImageMarkerCore.h"

extern "C" JNIEXPORT jlong JNICALL
Java_com_jimmydaddy_imagemarker_ImageMarkerCore_fitWithinMaxNative(
    JNIEnv *,
    jclass,
    jint width,
    jint height,
    jint maxSize) {
  const auto fitted = image_marker_core::fitWithinMax(width, height, maxSize);
  const auto packedWidth = static_cast<std::uint64_t>(
      static_cast<std::uint32_t>(fitted.width));
  const auto packedHeight = static_cast<std::uint32_t>(fitted.height);
  return static_cast<jlong>((packedWidth << 32U) | packedHeight);
}
