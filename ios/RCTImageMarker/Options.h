//
//  NSObject+Options.h
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import "TextBackground.h"
#import "RCTConvert+ImageMarker.h"

NS_ASSUME_NONNULL_BEGIN

@interface Options: NSObject

@property (nonatomic, copy) NSDictionary * src;
@property (nonatomic, copy) UIColor * color;
@property (nonatomic, copy) NSString * uri;
@property (nonatomic, copy) UIFont * font;
@property (nonatomic, copy) NSShadow * shadow;
@property (nonatomic, copy) TextBackground* textBackground;
@property (nonatomic, assign) CGFloat scale;
@property (nonatomic, assign) NSInteger quality;
@property (nonatomic, copy) NSString * filename;
@property (nonatomic, assign) NSInteger maxSize;
@property (nonatomic, assign) CGFloat X;
@property (nonatomic, assign) CGFloat Y;
@property (nonatomic, copy) NSString * saveFormat;
@property (nonatomic, assign) MarkerPosition position;

-(id)initWithDicOpts: (NSDictionary *) opts;

+(id)checkParams: (NSDictionary *) opts rejecter:(RCTPromiseRejectBlock)reject;

@end

NS_ASSUME_NONNULL_END
