//
//  NSObject+TextOptions.m
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/24.
//

#import "TextOptions.h"

@implementation TextOptions: NSObject

-(id)initWithDicOpts: (NSDictionary *) opts
{
    if (![[opts allKeys] containsObject:@"text"] || opts[@"text"] == nil) {
        @throw [NSException exceptionWithName:@"PARAMS_REQUIRED" reason:@"text is required" userInfo:nil];
    }

    NSDictionary* positionOpts = [opts objectForKey:@"positionOptions"]? opts[@"positionOptions"] : nil;
    if (positionOpts != nil) {
        _X = [RCTConvert CGFloat:positionOpts[@"X"]];
        _Y = [RCTConvert CGFloat:positionOpts[@"Y"]];
        _position = [positionOpts objectForKey: @"position"]? [RCTConvert MarkerPosition: positionOpts[@"position"]] : 0;
    } else {
        _X = 20.0f;
        _Y = 20.0f;
        _position = 0;
    }
    _text = opts[@"text"];
    _style = [[TextStyle alloc] initWithDicOpts: opts[@"style"]];
    return self;
}

@end
