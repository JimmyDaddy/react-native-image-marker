//
//  NSObject+Options.h
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import "ImageOptions.h"
#import "RCTConvert+ImageMarker.h"

NS_ASSUME_NONNULL_BEGIN

@interface Options: NSObject

@property (nonatomic, copy) ImageOptions * backgroundImage;
@property (nonatomic, assign) NSInteger quality;
@property (nonatomic, copy) NSString * filename;
@property (nonatomic, assign) NSInteger maxSize;
@property (nonatomic, copy) NSString * saveFormat;

-(id)initWithDicOpts: (NSDictionary *) opts;

+(id)checkParams: (NSDictionary *) opts rejecter:(RCTPromiseRejectBlock)reject;

@end

NS_ASSUME_NONNULL_END
