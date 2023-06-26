//
//  Options+TextMarkOptions.m
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

#import "MarkTextOptions.h"
#import "RCTConvert+ImageMarker.h"
#import "TextOptions.h"

@implementation MarkTextOptions: Options

-(id)initWithDicOpts:(NSDictionary *)opts
{
    self = [super initWithDicOpts: opts];
    if (![[opts allKeys] containsObject:@"watermarkTexts"] || opts[@"watermarkTexts"] == nil || [[RCTConvert NSArray:opts[@"watermarkTexts"]] count] <= 0) {
        @throw [NSException exceptionWithName:@"PARAMS_REQUIRED" reason:@"text is required" userInfo:nil];
    }
    NSMutableArray *array = [NSMutableArray array];
    for (NSDictionary *textOpt in [RCTConvert NSArray:opts[@"watermarkTexts"]]) {
        [array addObject: [[TextOptions alloc] initWithDicOpts:textOpt]];
    }
    _watermarkTexts = array;
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
