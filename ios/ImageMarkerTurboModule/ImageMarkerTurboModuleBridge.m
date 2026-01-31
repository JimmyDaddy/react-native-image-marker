//
//  ImageMarkerTurboModuleBridge.m
//  react-native-image-marker
//
//  Created by Kiro on 2026/01/31.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTTurboModule.h>

// Export TurboModule for JSI communication
@interface RCT_EXTERN_MODULE(ImageMarkerTurboModule, NSObject)

// Export TurboModule methods to JSI with Promise support
RCT_EXTERN_METHOD(markWithText: (nonnull NSDictionary *) options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(markWithImage: (nonnull NSDictionary *) options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Export bridge setter for JSI communication
RCT_EXTERN_METHOD(setBridge: (nonnull RCTBridge *) bridge)

@end