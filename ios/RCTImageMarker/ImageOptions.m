//
//  NSObject+ImageOptions.m
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/25.
//

#import "ImageOptions.h"
#import "RCTConvert+ImageMarker.h"

@implementation ImageOptions: NSObject

-(id)initWithDicOpts: (NSDictionary *) opts
{
    if (![[opts allKeys] containsObject:@"src"] || opts[@"src"] == nil) {
        @throw [NSException exceptionWithName:@"PARAMS_REQUIRED" reason:@"image is required" userInfo:nil];
    }
    _src = opts[@"src"];
    _uri = _src[@"uri"];
    _scale = [opts objectForKey: @"scale"]? [RCTConvert CGFloat: [opts objectForKey: @"scale"]]: 1.0;
    _rotate = [opts objectForKey: @"rotate"]? [RCTConvert CGFloat: [opts objectForKey: @"rotate"]]: 0;
    _alpha = [opts objectForKey: @"alpha"]? [RCTConvert CGFloat: [opts objectForKey: @"alpha"]]: 1.0;
    return self;
}
@end
