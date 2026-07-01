//
//  NSObject+RCTImageMarkerTurboModule.mm
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/13.
//

#ifdef RCT_NEW_ARCH_ENABLED

#import "RNImageMarkerSpec.h"
#import <React/RCTBridgeModule.h>
#import <memory>

@interface ImageMarker : NSObject
@end

@implementation ImageMarker (TurboModule)

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeImageMarkerSpecJSI>(params);
}

@end

#endif
