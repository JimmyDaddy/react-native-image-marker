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
    if (![[opts allKeys] containsObject:@"backgroundImage"] || opts[@"backgroundImage"] == nil || [Utils isNULL:opts[@"backgroundImage"]]) {
        @throw [NSException exceptionWithName:@"PARAMS_REQUIRED" reason:@"backgroundImage is required" userInfo:nil];
    }
    _backgroundImage = [[ImageOptions alloc] initWithDicOpts:opts[@"backgroundImage"]];
    _quality = [opts objectForKey: @"quality"]? [RCTConvert NSInteger: [opts objectForKey: @"quality"]]: 100;
    _saveFormat = opts[@"saveFormat"];
    _maxSize = [RCTConvert NSInteger: opts[@"maxSize"]];
    _filename = opts[@"fileName"];

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
