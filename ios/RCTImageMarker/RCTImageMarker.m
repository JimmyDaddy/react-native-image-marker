//
//  RCTImageMarker.m
//  RCTImageMarker
//
//  Created by Jimmy on 16/7/18.
//  Copyright © 2016年 Jimmy. All rights reserved.
//

#import "RCTImageMarker.h"
#import <React/RCTBridgeModule.h>
#import <React/RCTImageSource.h>
#include <CoreText/CTFont.h>
#include <CoreText/CTStringAttributes.h>
#include "RCTConvert+ImageMarker.h"
#import "MarkTextOptions.h"
#import "Options.h"
#import "Utils.h"
#import "MarkImageOptions.h"

@implementation ImageMarker

@synthesize  bridge = _bridge;

RCT_EXPORT_MODULE();

//NSString* saveImageForMarker(UIImage * image, float quality, NSString* filename, NSString * saveFormat)

NSString* saveImageForMarker(UIImage * image, Options* opts)
{
    NSString* fullPath = generateCacheFilePathForMarker([Utils getExt: opts.saveFormat], opts.filename);
    if (opts.saveFormat != nil && [opts.saveFormat isEqualToString:@"base64"]) {
        return [@"data:image/png;base64," stringByAppendingString:[UIImagePNGRepresentation(image) base64EncodedStringWithOptions:NSDataBase64Encoding64CharacterLineLength]];
    }
    NSData* data = [Utils isPng: opts.saveFormat]? UIImagePNGRepresentation(image) : UIImageJPEGRepresentation(image, opts.quality / 100.0);
    NSFileManager* fileManager = [NSFileManager defaultManager];
    [fileManager createFileAtPath:fullPath contents:data attributes:nil];
    return fullPath;
}

NSString * generateCacheFilePathForMarker(NSString * ext, NSString * filename)
{
    NSArray* paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
    NSString* cacheDirectory = [paths firstObject];
    if (NULL != filename && nil != filename && filename.length > 0) {
        if ([filename hasSuffix: ext]) {
            return [cacheDirectory stringByAppendingPathComponent:filename];
        } else {
            NSString* fullName = [NSString stringWithFormat:@"%@%@", filename, ext];
            return [cacheDirectory stringByAppendingPathComponent:fullName];
        }
    } else {
        NSString* name = [[NSUUID UUID] UUIDString];
        NSString* fullName = [NSString stringWithFormat:@"%@%@", name, ext];
        NSString* fullPath = [cacheDirectory stringByAppendingPathComponent:fullName];
        return fullPath;
    }
}

//UIImage * markerImgWithText(UIImage *image, NSString* text, CGFloat X, CGFloat Y, UIColor* color, UIFont* font, CGFloat scale, NSShadow* shadow, TextBackground* textBackground){

UIImage * markerImgWithText(UIImage *image, MarkTextOptions* opts){
    int w = image.size.width;
    int h = image.size.height;
    
    UIGraphicsBeginImageContextWithOptions(image.size, NO, opts.scale);
    [image drawInRect:CGRectMake(0, 0, w, h)];
    NSDictionary *attr = @{
        NSFontAttributeName: opts.font,   //设置字体
        NSForegroundColorAttributeName : opts.color,      //设置字体颜色
        NSShadowAttributeName : opts.shadow
    };
    
    CGSize size = [opts.text sizeWithAttributes:attr];
    TextBackground* textBackground = opts.textBackground;
    if (textBackground != nil) {
        CGContextRef context = UIGraphicsGetCurrentContext();
        CGContextSetFillColorWithColor(context, textBackground.colorBg.CGColor);
        if([textBackground.typeBg isEqualToString:@"stretchX"]) {
            CGContextFillRect(context, CGRectMake(0, [opts Y] - textBackground.paddingY, w, size.height + 2*textBackground.paddingY));
        } else if([textBackground.typeBg isEqualToString:@"stretchY"]) {
            CGContextFillRect(context, CGRectMake([opts X] - textBackground.paddingX, 0, size.width + 2*textBackground.paddingX, h));
        } else {
            CGContextFillRect(context, CGRectMake([opts X] - textBackground.paddingX, [opts Y] - textBackground.paddingY,
                                                  size.width + 2*textBackground.paddingX, size.height + 2*textBackground.paddingY));
        }
    }
    CGRect rect = (CGRect){ CGPointMake(opts.X, opts.Y), size };
    
    //    CGRect position = CGRectMake(X, Y, w, h);
    [opts.text drawInRect:rect withAttributes:attr];
    UIImage *aimg = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return aimg;
    
}

/**
 *
 */
UIImage * markeImageWithImage(UIImage *image, UIImage * waterImage, MarkImageOptions* opts){
    int w = image.size.width;
    int h = image.size.height;
    
    int ww = waterImage.size.width * opts.markerScale;
    int wh = waterImage.size.height * opts.markerScale;
    
    UIGraphicsBeginImageContextWithOptions(image.size, NO, opts.scale);
    [image drawInRect:CGRectMake(0, 0, w, h)];
    CGRect position = CGRectMake(opts.X, opts.Y, ww, wh);
    [waterImage drawInRect:position];
    UIImage * newImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return newImage;
}

UIImage * markeImageWithImageByPostion(UIImage *image, UIImage * waterImage, MarkImageOptions* opts) {
    int w = image.size.width;
    int h = image.size.height;
    
    int ww = waterImage.size.width * opts.markerScale;
    int wh = waterImage.size.height * opts.markerScale;
    UIGraphicsBeginImageContextWithOptions(image.size, NO, opts.scale);
    [image drawInRect:CGRectMake(0, 0, w, h)];
    
    CGSize size = CGSizeMake(ww, wh);
    
    
    CGRect rect;
    
    switch (opts.position) {
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
    
    [waterImage drawInRect:rect];
    UIImage * newImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return newImage;
}

UIImage * markerImgWithTextByPosition(UIImage *image, MarkTextOptions* opts){
    int w = image.size.width;
    int h = image.size.height;
    
    NSDictionary *attr = @{
        NSFontAttributeName: opts.font,   //设置字体
        NSForegroundColorAttributeName : opts.color,      //设置字体颜色
        NSShadowAttributeName : opts.shadow
    };
    
    CGSize size = [opts.text sizeWithAttributes:attr];
    
    //    CGSize size = CGSizeMake(fontSize, height);
    UIGraphicsBeginImageContextWithOptions(image.size, NO, opts.scale);
    [image drawInRect:CGRectMake(0, 0, w, h)];
    
    int margin = 20;
    int posX = margin;
    int posY = margin;
    
    switch (opts.position) {
        case TopLeft:
            posX = margin;
            posY = margin;
            break;
        case TopCenter:
            posX = (w-(size.width))/2;
            break;
        case TopRight:
            posX = (w-size.width) - margin;
            break;
        case BottomLeft:
            posY = h-size.height - margin;
            break;
        case BottomCenter:
            posX = (w-(size.width))/2;
            posY = h-size.height - margin;
            break;
        case BottomRight:
            posX = w-(size.width) - margin;
            posY = h-size.height - margin;
            break;
        case Center:
            posX = (w-(size.width))/2;
            posY = (h-size.height)/2;
            break;
    }
    
    TextBackground* textBackground = opts.textBackground;
    if (textBackground != nil) {
        CGContextRef context = UIGraphicsGetCurrentContext();
        CGContextSetFillColorWithColor(context, textBackground.colorBg.CGColor);
        if([textBackground.typeBg isEqualToString:@"stretchX"]) {
            CGContextFillRect(context, CGRectMake(0, posY - textBackground.paddingY, w, size.height + 2*textBackground.paddingY));
        } else if([textBackground.typeBg isEqualToString:@"stretchY"]) {
            CGContextFillRect(context, CGRectMake(posX - textBackground.paddingX, 0, size.width + 2*textBackground.paddingX, h));
        } else {
            CGContextFillRect(context, CGRectMake(posX - textBackground.paddingX, posY - textBackground.paddingY,
                                                  size.width + 2*textBackground.paddingX, size.height + 2*textBackground.paddingY));
        }
    }
    
    CGRect rect = (CGRect){ CGPointMake(posX, posY), size };
    [opts.text drawInRect:rect withAttributes:attr];
    UIImage *aimg = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return aimg;
}

RCT_EXPORT_METHOD(addText: (nonnull NSDictionary *) opts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    MarkTextOptions* markOpts = [MarkTextOptions checkParams:opts rejecter:reject];
    //这里之前是loadImageOrDataWithTag
    [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest: markOpts.src] callback:^(NSError *error, UIImage *image) {
        if (error || image == nil) {
            image = [[UIImage alloc] initWithContentsOfFile: markOpts.uri];
            if (image == nil) {
                NSLog(@"Can't retrieve the file from the path");
                
                reject(@"error", @"Can't retrieve the file from the path.", error);
                return;
            }
        }
        
        UIImage * scaledImage = markerImgWithText(image, markOpts);
        if (scaledImage == nil) {
            NSLog(@"Can't mark the image");
            reject(@"error",@"Can't mark the image.", error);
            return;
        }
        NSLog(@" file from the path");
        
        NSString * res = saveImageForMarker(scaledImage, markOpts);
        resolve(res);
    }];
}

RCT_EXPORT_METHOD(addTextByPosition: (nonnull NSDictionary *)opts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  ){
    MarkTextOptions* markOpts = [MarkTextOptions checkParams:opts rejecter:reject];
    //这里之前是loadImageOrDataWithTag
    [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest:markOpts.src] callback:^(NSError *error, UIImage *image) {
        if (error || image == nil) {
            image = [[UIImage alloc] initWithContentsOfFile: markOpts.uri];
            if (image == nil) {
                NSLog(@"Can't retrieve the file from the path");
                
                reject(@"error", @"Can't retrieve the file from the path.", error);
                return;
            }
        }
        
        // Do mark
        UIImage * scaledImage = markerImgWithTextByPosition(image, markOpts);
        if (scaledImage == nil) {
            NSLog(@"Can't mark the image");
            reject(@"error",@"Can't mark the image.", error);
            return;
        }
        NSLog(@" file from the path");
        
        NSString* res = saveImageForMarker(scaledImage, markOpts);
        resolve(res);
    }];
}

RCT_EXPORT_METHOD(markWithImage: (nonnull NSDictionary *) opts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    MarkImageOptions* markOpts = [MarkImageOptions checkParams:opts rejecter:reject];
    //这里之前是loadImageOrDataWithTag
    [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest:markOpts.src] callback:^(NSError *error, UIImage *image) {
        if (error || image == nil) {
            image = [[UIImage alloc] initWithContentsOfFile:markOpts.uri];
            if (image == nil) {
                NSLog(@"Can't retrieve the file from the path");
                
                reject(@"error", @"Can't retrieve the file from the path.", error);
                return;
            }
        }
        
        [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest:markOpts.markerSrc] callback:^(NSError *markerError, UIImage *marker) {
            if (markerError || marker == nil) {
                marker = [[UIImage alloc] initWithContentsOfFile:markOpts.markerImageUri];
                if (marker == nil) {
                    NSLog(@"Can't retrieve the file from the path");
                    
                    reject(@"error", @"Can't retrieve the file from the path.", markerError);
                    return;
                }
            }
            // Do mark
            UIImage * scaledImage = markeImageWithImage(image, marker, markOpts);
            if (scaledImage == nil) {
                NSLog(@"Can't mark the image");
                reject(@"error",@"Can't mark the image.", error);
                return;
            }
            NSLog(@" file from the path");
            
            NSString* res = saveImageForMarker(scaledImage, markOpts);
            resolve(res);
        }];
    }];
}

RCT_EXPORT_METHOD(markWithImageByPosition: (nonnull NSDictionary *) opts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    MarkImageOptions* markOpts = [MarkImageOptions checkParams:opts rejecter:reject];
    //这里之前是loadImageOrDataWithTag
    [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest:markOpts.src] callback:^(NSError *error, UIImage *image) {
        if (error || image == nil) {
            image = [[UIImage alloc] initWithContentsOfFile:markOpts.uri];
            if (image == nil) {
                NSLog(@"Can't retrieve the file from the path");
                
                reject(@"error", @"Can't retrieve the file from the path.", error);
                return;
            }
        }
        
        [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest:markOpts.markerSrc] callback:^(NSError *markerError, UIImage *marker) {
            if (markerError || marker == nil) {
                marker = [[UIImage alloc] initWithContentsOfFile:markOpts.markerImageUri];
                if (marker == nil) {
                    NSLog(@"Can't retrieve the file from the path");
                    
                    reject(@"error", @"Can't retrieve the file from the path.", markerError);
                    return;
                }
            }
            // Do mark
            UIImage * scaledImage = markeImageWithImageByPostion(image, marker, markOpts);
            if (scaledImage == nil) {
                NSLog(@"Can't mark the image");
                reject(@"error",@"Can't mark the image.", error);
                return;
            }
            NSLog(@" file from the path");
            
            NSString * res = saveImageForMarker(scaledImage, markOpts);
            resolve(res);
        }];
    }];
}

@end
