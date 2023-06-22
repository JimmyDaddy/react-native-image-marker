//
//  NSObject+Options.m
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

#import "Options.h"
#import "Utils.h"
#import <UIKit/UIKit.h>
#import "RCTConvert+ImageMarker.h"

@implementation Options

-(id) initWithDicOpts:(NSDictionary *)opts
{
    if (![[opts allKeys] containsObject:@"src"] || opts[@"src"] == nil) {
        @throw [NSException exceptionWithName:@"PARAMS_REQUIRED" reason:@"image is required" userInfo:nil];
    }
    _src = opts[@"src"];
    _uri = _src[@"uri"];
    _color = [Utils getColor: opts[@"color"]];
    _shadow = [Utils getShadowStyle: opts[@"shadowStyle"]];
    _textBackground = [[TextBackground alloc] initWithTextBackgroundStyle: opts[@"textBackgroundStyle"]];
    _X = [RCTConvert CGFloat:opts[@"X"]];
    _Y = [RCTConvert CGFloat:opts[@"Y"]];
    _font = [UIFont fontWithName:opts[@"fontName"] size: [opts objectForKey: @"fontSize"]? [RCTConvert CGFloat: [opts objectForKey: @"fontSize"]]: 14.0];
    _scale = [opts objectForKey: @"scale"]? [RCTConvert CGFloat: [opts objectForKey: @"scale"]]: 1.0;
    _quality = [opts objectForKey: @"quality"]? [RCTConvert NSInteger: [opts objectForKey: @"quality"]]: 100;
    _saveFormat = opts[@"saveFormat"];
    _maxSize = [RCTConvert NSInteger: opts[@"maxSize"]];
    _filename = opts[@"fileName"];
    _position = [RCTConvert MarkerPosition: opts[@"position"]];

    return self;
}

+(id)checkParams: (NSDictionary *) opts rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        return [[Options alloc] initWithDicOpts: opts];
    }
    @catch (NSException *exception) {
        reject(exception.name, exception.reason, nil);
    }
}

@end
