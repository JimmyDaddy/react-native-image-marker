//
//  NSObject+Utils.h
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTConvert.h>

NS_ASSUME_NONNULL_BEGIN

@interface Utils: NSObject

+ (UIColor *)getColor:(NSString *)hexColor;
+ (int)stringToInt:(NSString *)string;
+(NSShadow*)getShadowStyle:(NSDictionary *) shadowStyle;
+ (bool)isPng: (NSString *)saveFormat;
+ (NSString*) getExt: (NSString*) saveFormat;
+ (bool)isNULL: (NSDictionary*) obj;

@end

NS_ASSUME_NONNULL_END
