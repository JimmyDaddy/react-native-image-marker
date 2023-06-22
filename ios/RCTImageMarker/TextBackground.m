//
//  NSObject+TextBackground.c
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

#include "TextBackground.h"
#include "RCTConvert+ImageMarker.h"
#import <React/RCTBridge.h>
#import <React/RCTConvert.h>
#import "Utils.h"

@implementation TextBackground

-(id)initWithTextBackgroundStyle:(NSDictionary *) textBackground
{
    if (textBackground == nil) return nil;
    _typeBg = textBackground[@"type"];
    _paddingX = [RCTConvert CGFloat: textBackground[@"paddingX"]];
    _paddingY = [RCTConvert CGFloat: textBackground[@"paddingY"]];
    if([textBackground[@"color"] length] > 1) {
        _colorBg = [Utils getColor:textBackground[@"color"]];
    } else {
        _colorBg = [UIColor clearColor];
    }
    return self;
    
}
@end
