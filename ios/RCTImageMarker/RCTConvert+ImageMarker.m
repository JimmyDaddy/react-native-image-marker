//
//  RCTConvert+ImageMarker.m
//  RCTImageMarker
//
//  Created by Jimmy on 16/7/19.
//  Copyright © 2016年 Jimmy. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RCTConvert+ImageMarker.h"
@implementation RCTConvert(ImageMarker)

+ (CGSize)CGSize:(id)json offset:(NSUInteger)offset
{
    NSArray *arr = [self NSArray:json];
    if (arr.count < offset + 2) {
        RCTLogError(@"Too few elements in array (expected at least %zd): %@", 2 + offset, arr);
        return CGSizeZero;
    }
    return (CGSize){
        [self CGFloat:arr[offset]],
        [self CGFloat:arr[offset + 1]],
    };
}

+ (CGPoint)CGPoint:(id)json offset:(NSUInteger)offset
{
    NSArray *arr = [self NSArray:json];
    if (arr.count < offset + 2) {
        RCTLogError(@"Too few elements in array (expected at least %zd): %@", 2 + offset, arr);
        return CGPointZero;
    }
    return (CGPoint){
        [self CGFloat:arr[offset]],
        [self CGFloat:arr[offset + 1]],
    };
}


+ (CGRect)CGRect:(id)json offset:(NSUInteger)offset
{
    NSArray *arr = [self NSArray:json];
    if (arr.count < offset + 4) {
        RCTLogError(@"Too few elements in array (expected at least %zd): %@", 4 + offset, arr);
        return CGRectZero;
    }
    return (CGRect){
        {[self CGFloat:arr[offset]], [self CGFloat:arr[offset + 1]]},
        {[self CGFloat:arr[offset + 2]], [self CGFloat:arr[offset + 3]]},
    };
}

+ (CGColorRef)CGColor:(id)json offset:(NSUInteger)offset
{
    NSArray *arr = [self NSArray:json];
    if (arr.count < offset + 4) {
        RCTLogError(@"Too few elements in array (expected at least %zd): %@", 4 + offset, arr);
        return NULL;
    }
    return [self CGColor:[arr subarrayWithRange:(NSRange){offset, 4}]];
}
@end
