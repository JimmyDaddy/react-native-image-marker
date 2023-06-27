//
//  NSObject+TextStyle.m
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/24.
//

#import "TextStyle.h"
#import "Utils.h"
#import <UIKit/UIKit.h>
#import "RCTConvert+ImageMarker.h"


@implementation TextStyle: NSObject

-(id)initWithDicOpts: (NSDictionary *) opts
{
    _color = [Utils getColor: opts[@"color"]];
    _shadow = [opts objectForKey:@"shadowStyle"]  ? [Utils getShadowStyle: opts[@"shadowStyle"]] : nil;
    _textBackground = [[TextBackground alloc] initWithTextBackgroundStyle: opts[@"textBackgroundStyle"]];
    CGFloat scale = [UIScreen mainScreen].scale;
    _font = [UIFont fontWithName:opts[@"fontName"] size: [opts objectForKey: @"fontSize"]? ([RCTConvert CGFloat: [opts objectForKey: @"fontSize"]]) * scale: 14.0 * scale];
    _skewX = [RCTConvert CGFloat:opts[@"skewX"]];
    _underline = [RCTConvert BOOL: opts[@"underline"]];
    _strikeThrough = [RCTConvert BOOL: opts[@"strikeThrough"]];
    _italic = [RCTConvert BOOL: opts[@"italic"]];
    _bold = [RCTConvert BOOL: opts[@"bold"]];
    _rotate = [RCTConvert NSInteger:opts[@"rotate"]];
    _textAlign = opts[@"textAlign"];

    return self;
}

@end
