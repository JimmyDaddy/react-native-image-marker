//
//  NSObject+Utils.m
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

#import "Utils.h"

@implementation Utils

+(UIColor *)getColor:(NSString *)hexColor {
    NSString *cString = [[hexColor stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] uppercaseString];

    if ([cString hasPrefix:@"0X"])
        cString = [cString substringFromIndex:2];
    if ([cString hasPrefix:@"#"])
        cString = [cString substringFromIndex:1];
    if ([cString length] != 8 && [cString length]!=6 && [cString length] != 3 && [cString length] != 4)
        return [UIColor clearColor];

    unsigned int red,green,blue;
    NSRange range;

    CGFloat alpha = 1.0f;
    if([cString length] == 8) {
        NSString *aString = [cString substringWithRange:NSMakeRange(6, 2)];
        unsigned int a;
        [[NSScanner scannerWithString:aString] scanHexInt:&a];
        alpha = (float)a / 255.0f;
        cString =  [cString substringWithRange:NSMakeRange(0, 6)];
    } else if([cString length] == 4) {
        NSString *aString = [cString substringWithRange:NSMakeRange(3, 1)];
        unsigned int a;
        [[NSScanner scannerWithString:aString] scanHexInt:&a];
        alpha = (float)a / 15.0f;
        cString =  [cString substringWithRange:NSMakeRange(0, 3)];
    }

    bool hex6 = [cString length] == 6? YES : NO;
    if (hex6 == YES) {
        range.length = 2;
    } else {
        range.length = 1;
    }

    /* 调用下面的方法处理字符串 */
    range.location = 0;
    NSString* redStr = [cString substringWithRange:range];
    red = [self stringToInt:redStr];

    range.location = hex6 == YES? 2 : 1;
    NSString* greenStr = [cString substringWithRange:range];
    green = [self stringToInt:greenStr];

    range.location = hex6 == YES? 4 : 2;
    NSString* blueStr = [cString substringWithRange:range];
    blue = [self stringToInt:blueStr];

    return [UIColor colorWithRed:(float)(red/255.0f) green:(float)(green / 255.0f) blue:(float)(blue / 255.0f) alpha: alpha];
}

+ (int)stringToInt:(NSString *)string {
    if ([string length] == 1) {
        unichar hex_char = [string characterAtIndex:0]; /* 两位16进制数中的第一位(高位*16) */
        int int_ch;
        if (hex_char >= '0' && hex_char <= '9')
            int_ch = (hex_char - 48) * 16;   /* 0 的Ascll - 48 */
        else if (hex_char >= 'A' && hex_char <='F')
            int_ch = (hex_char - 55) * 16; /* A 的Ascll - 65 */
        else
            int_ch = (hex_char - 87) * 16; /* a 的Ascll - 97 */
        return int_ch * 2;
    } else {
        unichar hex_char1 = [string characterAtIndex:0]; /* 两位16进制数中的第一位(高位*16) */
        int int_ch1;
        if (hex_char1 >= '0' && hex_char1 <= '9')
            int_ch1 = (hex_char1 - 48) * 16;   /* 0 的Ascll - 48 */
        else if (hex_char1 >= 'A' && hex_char1 <='F')
            int_ch1 = (hex_char1 - 55) * 16; /* A 的Ascll - 65 */
        else
            int_ch1 = (hex_char1 - 87) * 16; /* a 的Ascll - 97 */
        unichar hex_char2 = [string characterAtIndex:1]; /* 两位16进制数中的第二位(低位) */
        int int_ch2;
        if (hex_char2 >= '0' && hex_char2 <='9')
            int_ch2 = (hex_char2 - 48); /* 0 的Ascll - 48 */
        else if (hex_char1 >= 'A' && hex_char1 <= 'F')
            int_ch2 = hex_char2 - 55; /* A 的Ascll - 65 */
        else
            int_ch2 = hex_char2 - 87; /* a 的Ascll - 97 */
        return int_ch1+int_ch2;
    }
}

+(NSShadow*)getShadowStyle:(NSDictionary *) shadowStyle
{
    if (shadowStyle != nil) {
        NSShadow *shadow = [[NSShadow alloc]init];
        shadow.shadowBlurRadius = [RCTConvert CGFloat: shadowStyle[@"radius"]];
        shadow.shadowOffset = CGSizeMake([RCTConvert CGFloat: shadowStyle[@"dx"]], [RCTConvert CGFloat: shadowStyle[@"dy"]]);
        UIColor* color = [self getColor:shadowStyle[@"color"]];
        
        NSLog(@"color? %@", color!=nil?@"YES" : @"NO");
        shadow.shadowColor = color != nil? color : [UIColor grayColor];
        return shadow;
    } else {
        return nil;
    }
}

+(bool) isPng: (NSString *) saveFormat
{
    return saveFormat != nil && ([saveFormat isEqualToString:@"png"] || [saveFormat isEqualToString:@"PNG"]);
}

+(NSString*) getExt: (NSString*) saveFormat
{
    NSString* ext = saveFormat != nil && ([saveFormat isEqualToString:@"png"] || [saveFormat isEqualToString:@"PNG"])? @".png" : @".jpg";
    return ext;
}

+ (bool)isBase64: (NSString*) uri
{
    return uri != nil? [uri hasPrefix:@"data:"] : false;
}

@end
