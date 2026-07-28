#pragma once

#include <stdint.h>

typedef struct {
    int32_t width;
    int32_t height;
} IMImageMarkerPixelSize;

#ifdef __cplusplus
extern "C" {
#endif

IMImageMarkerPixelSize IMImageMarkerFitWithinMax(
    double width,
    double height,
    int32_t maxSize);

#ifdef __cplusplus
}
#endif
