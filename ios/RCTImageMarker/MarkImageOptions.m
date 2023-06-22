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
    if (![[opts allKeys] containsObject:@"markerSrc"] || opts[@"markerSrc"] == nil) {
        @throw [NSException exceptionWithName:@"PARAMS_REQUIRED" reason:@"marker image is required" userInfo:nil];
    }
    _markerSrc = opts[@"markerSrc"];
    _markerImageUri = _markerSrc[@"uri"];
    _markerScale = [opts objectForKey:@"markerScale"]? [RCTConvert CGFloat: opts[@"markerScale"]] : 1;
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
