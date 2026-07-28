#import "ImageMarkerCoreBridge.h"

#include "../../cpp/ImageMarkerCore.h"

IMImageMarkerPixelSize IMImageMarkerFitWithinMax(
    double width,
    double height,
    int32_t maxSize) {
    const auto fitted =
        image_marker_core::fitWithinMax(width, height, maxSize);
    return {fitted.width, fitted.height};
}
