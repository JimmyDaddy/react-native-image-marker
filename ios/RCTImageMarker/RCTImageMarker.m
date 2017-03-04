//
//  RCTImageMarker.m
//  RCTImageMarker
//
//  Created by Jimmy on 16/7/18.
//  Copyright © 2016年 Jimmy. All rights reserved.
//

#import "RCTImageMarker.h"
#import "RCTBridgeModule.h"
#include <CoreText/CTFont.h>
#include <CoreText/CTStringAttributes.h>
#include "RCTConvert+ImageMarker.h"

typedef enum{
    TopLeft = 0,
    TopCenter = 1,
    TopRight = 2,
    BottomLeft = 3,
    BottomCenter = 4,
    BottomRight = 5,
    Center = 6
} MarkerPosition;

@implementation RCTConvert(MarkerPosition)

RCT_ENUM_CONVERTER(MarkerPosition,
                   (@{
                      @"topLeft" : @(TopLeft),
                      @"topCenter" : @(TopCenter),
                      @"topRight" : @(TopRight),
                      @"bottomLeft": @(BottomLeft),
                      @"bottomCenter": @(BottomCenter),
                      @"bottomRight": @(BottomRight),
                      @"center": @(Center)
                      }), BottomRight, integerValue)

@end

@implementation ImageMarker




@synthesize  bridge = _bridge;



RCT_EXPORT_MODULE();

void saveImageForMarker(NSString * fullPath, UIImage * image, float quality)
{
    NSData* data = UIImageJPEGRepresentation(image, quality / 100.0);
    NSFileManager* fileManager = [NSFileManager defaultManager];
    [fileManager createFileAtPath:fullPath contents:data attributes:nil];
}

NSString * generateCacheFilePathForMarker(NSString * ext)
{
    NSArray* paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
    NSString* cacheDirectory = [paths firstObject];
    NSString* name = [[NSUUID UUID] UUIDString];
    NSString* fullName = [NSString stringWithFormat:@"%@%@", name, ext];
    NSString* fullPath = [cacheDirectory stringByAppendingPathComponent:fullName];
    
    return fullPath;
}

UIImage * markerImg(UIImage *image, NSString* text, CGRect position, UIColor* color, UIFont* font){
    int w = image.size.width;
    int h = image.size.height;

    UIGraphicsBeginImageContext(image.size);
    [image drawInRect:CGRectMake(0, 0, w, h)];
    NSDictionary *attr = @{
                           NSFontAttributeName: font,   //设置字体
                           NSForegroundColorAttributeName : color      //设置字体颜色
                           };
    [text drawInRect:position withAttributes:attr];
    UIImage *aimg = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return aimg;
    
}

UIImage * markerImgByPostion(UIImage *image, NSString* text, MarkerPosition position, CGSize size, UIColor* color, UIFont* font){
    int w = image.size.width;
    int h = image.size.height;
    
    UIGraphicsBeginImageContext(image.size);
    [image drawInRect:CGRectMake(0, 0, w, h)];
    NSDictionary *attr = @{
                           NSFontAttributeName: font,   //设置字体
                           NSForegroundColorAttributeName : color      //设置字体颜色
                           };
    CGRect rect;
    switch (position) {
        case TopLeft:
            rect = (CGRect){
                CGPointMake(20, 20),
                size
            };
            break;
        case TopCenter:
            rect = (CGRect){
                CGPointMake((w-(size.width))/2, 20),
                size
            };
            break;
        case TopRight:
            rect = (CGRect){
                CGPointMake((w-size.width-20), 20),
                size
            };
            break;
        case BottomLeft:
            rect = (CGRect){
                CGPointMake(20, h-size.height-20),
                size
            };
            break;
        case BottomCenter:
            rect = (CGRect){
                CGPointMake((w-(size.width))/2, h-size.height-20),
                size
            };
            break;
        case BottomRight:
            rect = (CGRect){
                CGPointMake(w-(size.width), h-size.height-20),
                size
            };
            break;
        case Center:
            rect = (CGRect){
                CGPointMake((w-(size.width))/2, (h-size.height)/2),
                size
            };
            break;
        default:
            rect = (CGRect){
                CGPointMake(20, 20),
                size
            };
            break;
    }
    [text drawInRect:rect withAttributes:attr];
    UIImage *aimg = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return aimg;
    
}
RCT_EXPORT_METHOD(addText: (NSString *)path
                  text:(NSString*)text
                  position:(CGRect)position
                  color:(UIColor*)color
                  fontName:(NSString*)fontName
                  fontSize:(CGFloat)fontSize
                  callback:(RCTResponseSenderBlock)callback)
{
    NSString* fullPath = generateCacheFilePathForMarker(@".jpg");
    //这里之前是loadImageOrDataWithTag
    [_bridge.imageLoader loadImageWithURLRequest:[RCTConvert NSURLRequest:path] callback:^(NSError *error, UIImage *image) {
        if (error || image == nil) {
            image = [[UIImage alloc] initWithContentsOfFile:path];
            if (image == nil) {
                NSLog(@"Can't retrieve the file from the path");
                
                callback(@[@"Can't retrieve the file from the path.", @""]);
                return;
            }
        }
        
        // Do mark
        UIFont* font = [UIFont fontWithName:fontName size:fontSize];
        UIImage * scaledImage = markerImg(image, text, position, color, font);
        if (scaledImage == nil) {
            NSLog(@"Can't mark the image");
            callback(@[@"Can't mark the image.", @""]);
            return;
        }
        NSLog(@" file from the path");
        
        saveImageForMarker(fullPath, scaledImage, 1);
        callback(@[[NSNull null], fullPath]);
    }];
}

RCT_EXPORT_METHOD(addTextByPostion: (NSString *)path
                  text:(NSString*)text
                  position:(MarkerPosition)position
                  size:(CGSize)size
                  color:(UIColor*)color
                  fontName:(NSString*)fontName
                  fontSize:(CGFloat)fontSize
                  callback:(RCTResponseSenderBlock)callback)
{
    NSString* fullPath = generateCacheFilePathForMarker(@".jpg");
    //这里之前是loadImageOrDataWithTag
    [_bridge.imageLoader loadImageWithURLRequest:[RCTConvert NSURLRequest:path] callback:^(NSError *error, UIImage *image) {
        if (error || image == nil) {
            if ([path hasPrefix:@"data:"] || [path hasPrefix:@"file:"]) {
                NSURL *imageUrl = [[NSURL alloc] initWithString:path];
                image = [UIImage imageWithData:[NSData dataWithContentsOfURL:imageUrl]];
            } else {
                image = [[UIImage alloc] initWithContentsOfFile:path];
            }
            if (image == nil) {
                callback(@[@"Can't retrieve the file from the path.", @""]);
                return;
            }
        }
        
        // Do mark
        UIFont* font = [UIFont fontWithName:fontName size:fontSize];
        UIImage * scaledImage = markerImgByPostion(image, text, position, size, color, font);
        if (scaledImage == nil) {
            NSLog(@"Can't mark the image");
            callback(@[@"Can't mark the image.", @""]);
            return;
        }
        NSLog(@" file from the path");
        
        saveImageForMarker(fullPath, scaledImage, 1);
        callback(@[[NSNull null], fullPath]);
    }];
}

@end
