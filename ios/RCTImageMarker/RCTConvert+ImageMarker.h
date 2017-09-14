//
//  RCTConvert+ImageMarker.h
//  RCTImageMarker
//
//  Created by Jimmy on 16/7/19.
//  Copyright © 2016年 Jimmy. All rights reserved.
//

#ifndef RCTConvert_ImageMarker_h
#define RCTConvert_ImageMarker_h
#import <React/RCTConvert.h>

@interface RCTConvert(ImageMarker)
+ (CGPoint)CGPoint:(id)json offset:(NSUInteger)offset;
+ (CGRect)CGRect:(id)json offset:(NSUInteger)offset;
+ (CGColorRef)CGColor:(id)json offset:(NSUInteger)offset;
+ (CGSize)CGSize:(id)json offset:(NSUInteger)offset;
@end

#endif /* RCTConvert_ImageMarker_h */
