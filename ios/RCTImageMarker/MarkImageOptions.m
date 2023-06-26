//
//  Options+ImageMarkOptions.m
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/22.
//

#import "MarkImageOptions.h"
#import <RCTConvert+ImageMarker.h>

@implementation MarkImageOptions: Options

-(id)initWithDicOpts:(NSDictionary *)opts
{
    self = [super initWithDicOpts: opts];
    if (![[opts allKeys] containsObject:@"watermarkImage"] || opts[@"watermarkImage"] == nil) {
        @throw [NSException exceptionWithName:@"PARAMS_REQUIRED" reason:@"marker image is required" userInfo:nil];
    }
    _watermarkImage = [[ImageOptions alloc] initWithDicOpts: opts[@"watermarkImage"]];
    NSDictionary* positionOpts = [opts objectForKey:@"watermarkPositions"]? opts[@"watermarkPositions"] : nil;
    if (positionOpts != nil) {
        _X = [RCTConvert CGFloat:positionOpts[@"X"]];
        _Y = [RCTConvert CGFloat:positionOpts[@"Y"]];
        _position = [positionOpts objectForKey: @"position"]? [RCTConvert MarkerPosition: positionOpts[@"position"]] : -1;
    } else {
        _X = 20.0f;
        _Y = 20.0f;
        _position = 0;
    }
    return self;
}

+(id)checkParams: (NSDictionary *) opts rejecter:(RCTPromiseRejectBlock)reject
{
    @try {
        return [[MarkImageOptions alloc] initWithDicOpts: opts];
    }
    @catch (NSException *exception) {
        reject(exception.name, exception.reason, nil);
    }
}

@end
