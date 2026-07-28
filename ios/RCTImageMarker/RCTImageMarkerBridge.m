//
//  NSObject+RCTImageMarker.m
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/13.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ImageMarker, NSObject)

RCT_EXTERN_METHOD(markWithImage: (nonnull NSDictionary *) opts
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(markWithText: (nonnull NSDictionary *) opts
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(markWithWatermarks: (nonnull NSDictionary *) opts
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(embedInvisible: (nonnull NSDictionary *) opts
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(detectInvisible: (nonnull NSDictionary *) opts
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cancel: (nonnull NSString *) jobId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
