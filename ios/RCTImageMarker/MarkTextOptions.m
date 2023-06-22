//
//  Options+TextMarkOptions.m
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

#import "MarkTextOptions.h"

@implementation MarkTextOptions: Options

-(id)initWithDicOpts:(NSDictionary *)opts
{
    self = [super initWithDicOpts: opts];
    if (![[opts allKeys] containsObject:@"text"] || opts[@"text"] == nil) {
        @throw [NSException exceptionWithName:@"PARAMS_REQUIRED" reason:@"text is required" userInfo:nil];
    }
    _text = opts[@"text"];
    return self;
}

+(id)checkParams: (NSDictionary *) opts rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        return [[MarkTextOptions alloc] initWithDicOpts: opts];
    }
    @catch (NSException *exception) {
        reject(exception.name, exception.reason, nil);
    }
}

@end
