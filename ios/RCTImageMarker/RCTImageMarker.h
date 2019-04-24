//
//  RCTImageMarker.h
//  RCTImageMarker
//
//  Created by Jimmy on 16/7/18.
//  Copyright © 2016年 Jimmy. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import <React/RCTImageLoader.h>



@interface ImageMarker : NSObject <RCTBridgeModule>

@end

@interface TextBackground : NSObject
@property (copy) UIColor * colorBg;
@property (copy) NSString * typeBg;
@property (assign) float paddingX;
@property (assign) float paddingY;
@end