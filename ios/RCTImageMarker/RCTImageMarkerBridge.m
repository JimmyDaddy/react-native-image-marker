//
//  NSObject+RCTImageMarker.m
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/13.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ImageMarker, NSObject)

RCT_EXTERN_METHOD(markWithImage: (nonnull NSDictionary *) opts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(markWithText: (nonnull NSDictionary *) opts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
