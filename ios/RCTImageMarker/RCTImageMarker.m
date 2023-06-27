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
#import "TextBackground.h"
#import "TextOptions.h"

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
    
    UIGraphicsBeginImageContextWithOptions(image.size, NO, opts.backgroundImage.scale);
    
    CGContextRef context = UIGraphicsGetCurrentContext();
    if (opts.backgroundImage.alpha != 1.0 || opts.backgroundImage.rotate != 0) {
        CGContextSaveGState(context);
        
        if(opts.backgroundImage.alpha != 1) {
            CGContextBeginTransparencyLayer(context, NULL);
            CGContextSetAlpha(context, opts.backgroundImage.alpha);
            CGContextSetBlendMode(context, kCGBlendModeMultiply);
        }
        
        // 在 iOS 中，图像的坐标系原点在左上角，而不是左下角。这意味着，当使用 CGContextDrawImage 函数绘制图像时，它会默认将图像翻转，以使其与坐标系匹配
        CGContextTranslateCTM(context, 0, h);
        CGContextScaleCTM(context, 1.0, -1.0);
        
        CGFloat x = 0;
        CGFloat y = 0;
        
        if(opts.backgroundImage.rotate > 0) {
            CGContextTranslateCTM(context, w / 2, h / 2);
            CGContextRotateCTM(context, - opts.backgroundImage.rotate * M_PI / 180);
            x = - w / 2;
            y = - h / 2;
        }
        CGContextDrawImage(context, CGRectMake(x, y, w, h), image.CGImage);
        if(opts.backgroundImage.alpha != 1) {
            CGContextEndTransparencyLayer(context);
        }
        CGContextSetBlendMode(context, kCGBlendModeNormal);
        CGContextRestoreGState(context);
    } else {
        CGContextDrawImage(context, CGRectMake(0, 0, w, h), image.CGImage);
    }
    
    for (TextOptions *textOpts in opts.watermarkTexts) {
        CGContextSaveGState(context);
        UIFont *font = textOpts.style.font;
        if(textOpts.style.italic && textOpts.style.bold) {
            UIFontDescriptor *boldItalicFontDescriptor = [textOpts.style.font.fontDescriptor fontDescriptorWithSymbolicTraits:UIFontDescriptorTraitBold | UIFontDescriptorTraitItalic];
            font = [UIFont fontWithDescriptor:boldItalicFontDescriptor size: font.pointSize];
        } else if(textOpts.style.italic) {
            UIFontDescriptor *boldItalicFontDescriptor = [textOpts.style.font.fontDescriptor fontDescriptorWithSymbolicTraits: UIFontDescriptorTraitItalic];
            font = [UIFont fontWithDescriptor:boldItalicFontDescriptor size: font.pointSize];
        } else if (textOpts.style.bold) {
            UIFontDescriptor * boldItalicFontDescriptor = [textOpts.style.font.fontDescriptor fontDescriptorWithSymbolicTraits: UIFontDescriptorTraitBold];
            font = [UIFont fontWithDescriptor:boldItalicFontDescriptor size: font.pointSize];
        }
        
        NSMutableDictionary *attributes = [[NSMutableDictionary alloc] initWithDictionary:@{
            NSFontAttributeName: font,   //设置字体
            NSForegroundColorAttributeName : textOpts.style.color,      //设置字体颜色
        }];
        
        if (textOpts.style.shadow != nil) {
            attributes[NSShadowAttributeName] = textOpts.style.shadow;
        }
        if (textOpts.style.underline) {
            attributes[NSUnderlineStyleAttributeName] = @(NSUnderlineStyleSingle);
        }
        if (textOpts.style.strikeThrough) {
            attributes[NSStrikethroughStyleAttributeName] = @(NSUnderlineStyleSingle);
        }
        if (textOpts.style.textAlign != nil) {
            NSMutableParagraphStyle *paragraphStyle = [[NSMutableParagraphStyle alloc] init];
            if ([textOpts.style.textAlign isEqual:@"right"]) {
                paragraphStyle.alignment = NSTextAlignmentRight;
            } else if ([textOpts.style.textAlign isEqual:@"center"]) {
                paragraphStyle.alignment = NSTextAlignmentCenter;
            } else {
                paragraphStyle.alignment = NSTextAlignmentLeft;
            }
            attributes[@[NSParagraphStyleAttributeName]] = paragraphStyle;
        }
        if(textOpts.style.skewX != 0) {
            attributes[@[NSObliquenessAttributeName]] = @(textOpts.style.skewX);
        }
        
        NSAttributedString *attributedText = [[NSAttributedString alloc] initWithString:textOpts.text attributes:attributes];
        
        CGSize maxSize = CGSizeMake(w, h); // 最大宽度和高度
        CGRect textRect = [attributedText boundingRectWithSize:maxSize options:NSStringDrawingUsesLineFragmentOrigin context:nil];
        CGSize size = textRect.size;
        
        int margin = 20;
        int posX = margin;
        int posY = margin;
        if (textOpts.position != 0) {
            switch (textOpts.position) {
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
        } else {
            posX = textOpts.X;
            posY = textOpts.Y;
        }
        
        TextBackground* textBackground = textOpts.style.textBackground;
        if (textBackground != nil) {
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
        if (textOpts.style.rotate > 0) {
            //            CGContextTranslateCTM(context, posX, posY);
            CGContextRotateCTM(context, textOpts.style.rotate);
        }
        
        CGRect rect = (CGRect){ CGPointMake(posX, posY), size };
        //    CGRect position = CGRectMake(X, Y, w, h);
        [textOpts.text drawInRect:rect withAttributes:attributes];
        CGContextRestoreGState(context);
    }
    
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
    
    int ww = waterImage.size.width * opts.watermarkImage.scale;
    int wh = waterImage.size.height * opts.watermarkImage.scale;
    
    UIGraphicsBeginImageContextWithOptions(image.size, NO, opts.backgroundImage.scale);
    CGContextRef context = UIGraphicsGetCurrentContext();
    if (opts.backgroundImage.alpha != 1.0 || opts.backgroundImage.rotate != 0) {
        CGContextSaveGState(context);
        
        if(opts.backgroundImage.alpha != 1) {
            CGContextBeginTransparencyLayer(context, NULL);
            CGContextSetAlpha(context, opts.backgroundImage.alpha);
            CGContextSetBlendMode(context, kCGBlendModeMultiply);
        }
        CGContextTranslateCTM(context, 0, h);
        CGContextScaleCTM(context, 1.0, -1.0);
        
        CGFloat x = 0;
        CGFloat y = 0;
        
        if(opts.backgroundImage.rotate > 0) {
            CGContextTranslateCTM(context, w / 2, h / 2);
            CGContextRotateCTM(context, - opts.backgroundImage.rotate * M_PI / 180);
            x = - w / 2;
            y = - h / 2;
        }
        CGContextDrawImage(context, CGRectMake(x, y, w, h), image.CGImage);
        if(opts.backgroundImage.alpha != 1) {
            CGContextEndTransparencyLayer(context);
        }
        CGContextSetBlendMode(context, kCGBlendModeNormal);
        CGContextRestoreGState(context);
    } else {
        CGContextSaveGState(context);
        CGContextDrawImage(context, CGRectMake(0, 0, w, h), image.CGImage);
        CGContextRestoreGState(context);
    }
    
    CGSize size = CGSizeMake(ww, wh);
    
    CGRect rect;
    if (opts.position != -1) {
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
                    CGPointMake(w-(size.width) - 20, h-size.height-20),
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
    } else {
        rect = CGRectMake(opts.X, opts.Y, ww, wh);
    }
    
    if (opts.watermarkImage.alpha != 1.0 || opts.watermarkImage.rotate != 0) {
        UIGraphicsBeginImageContextWithOptions(waterImage.size, NO, 0);
        CGContextRef markerContext = UIGraphicsGetCurrentContext();

        if(opts.watermarkImage.alpha != 1) {
            CGContextBeginTransparencyLayer(markerContext, NULL);
            CGContextSetAlpha(markerContext, opts.watermarkImage.alpha);
            CGContextSetBlendMode(markerContext, kCGBlendModeMultiply);
        }
        
        CGFloat x = 0;
        CGFloat y = 0;
        
        if(opts.watermarkImage.rotate > 0) {
//            CGContextTranslateCTM(markerContext, 0, waterImage.size.height);
//            CGContextScaleCTM(markerContext, 1.0, -1.0);
            CGContextTranslateCTM(markerContext, waterImage.size.width / 2, waterImage.size.height / 2);
            CGContextRotateCTM(markerContext, - opts.watermarkImage.rotate * M_PI / 180);
            x = - waterImage.size.width / 2;
            y = - waterImage.size.height / 2;
        }
        CGContextDrawImage(markerContext, CGRectMake(x, y, waterImage.size.width, waterImage.size.height), waterImage.CGImage);
        if(opts.watermarkImage.alpha != 1) {
            CGContextEndTransparencyLayer(markerContext);
        }
        waterImage = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        CGContextDrawImage(context, rect, waterImage.CGImage);
    } else {
        CGContextSaveGState(context);
        CGContextDrawImage(context, rect, waterImage.CGImage);
        CGContextRestoreGState(context);
    }
    UIImage * newImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return newImage;
}

UIImage * transBase64(NSString* base64Str) {
    NSString *trimmedString = [base64Str stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    NSString *encodedString = [trimmedString stringByAddingPercentEncodingWithAllowedCharacters:[NSCharacterSet URLQueryAllowedCharacterSet]];
    NSURL *imgURL  = [NSURL URLWithString: encodedString];
    NSData *imageData = [NSData dataWithContentsOfURL:imgURL];
    UIImage *image = [UIImage imageWithData:imageData];
    return image;
}

RCT_EXPORT_METHOD(markWithText: (nonnull NSDictionary *) opts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    MarkTextOptions* markOpts = [MarkTextOptions checkParams:opts rejecter:reject];
    if([Utils isBase64:markOpts.backgroundImage.uri]) {
        UIImage *image = transBase64(markOpts.backgroundImage.uri);
        UIImage * scaledImage = markerImgWithText(image, markOpts);
        if (scaledImage == nil) {
            NSLog(@"Can't mark the image");
            reject(@"error",@"Can't mark the image.", nil);
            return;
        }
        NSLog(@" file from the path");
        
        NSString * res = saveImageForMarker(scaledImage, markOpts);
        resolve(res);
    } else {
        //这里之前是loadImageOrDataWithTag
        [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest: markOpts.backgroundImage.src] callback:^(NSError *error, UIImage *image) {
            if (error || image == nil) {
                image = [[UIImage alloc] initWithContentsOfFile: markOpts.backgroundImage.uri];
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
}


RCT_EXPORT_METHOD(markWithImage: (nonnull NSDictionary *) opts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    MarkImageOptions* markOpts = [MarkImageOptions checkParams:opts rejecter:reject];
    if([Utils isBase64:markOpts.backgroundImage.uri]) {
        UIImage *image = transBase64(markOpts.backgroundImage.uri);
        if([Utils isBase64:markOpts.watermarkImage.uri]) {
            UIImage *marker = transBase64(markOpts.watermarkImage.uri);
            UIImage * scaledImage = markeImageWithImage(image, marker, markOpts);
            if (scaledImage == nil) {
                NSLog(@"Can't mark the image");
                reject(@"error",@"Can't mark the image.", nil);
                return;
            }
            NSLog(@" file from the path");
            
            NSString* res = saveImageForMarker(scaledImage, markOpts);
            resolve(res);
        } else {
            [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest:markOpts.watermarkImage.src] callback:^(NSError *markerError, UIImage *marker) {
                if (markerError || marker == nil) {
                    marker = [[UIImage alloc] initWithContentsOfFile:markOpts.watermarkImage.uri];
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
                    reject(@"error",@"Can't mark the image.", markerError);
                    return;
                }
                NSLog(@" file from the path");
                
                NSString* res = saveImageForMarker(scaledImage, markOpts);
                resolve(res);
            }];
        }
    } else {
        //这里之前是loadImageOrDataWithTag
        [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest:markOpts.backgroundImage.src] callback:^(NSError *error, UIImage *image) {
            if (error || image == nil) {
                image = [[UIImage alloc] initWithContentsOfFile:markOpts.backgroundImage.uri];
                if (image == nil) {
                    NSLog(@"Can't retrieve the file from the path");
                    
                    reject(@"error", @"Can't retrieve the file from the path.", error);
                    return;
                }
            }
            
            
            if([Utils isBase64:markOpts.watermarkImage.uri]) {
                UIImage *marker = transBase64(markOpts.watermarkImage.uri);
                UIImage * scaledImage = markeImageWithImage(image, marker, markOpts);
                if (scaledImage == nil) {
                    NSLog(@"Can't mark the image");
                    reject(@"error",@"Can't mark the image.", nil);
                    return;
                }
                NSLog(@" file from the path");
                
                NSString* res = saveImageForMarker(scaledImage, markOpts);
                resolve(res);
            } else {
                [[self.bridge moduleForName:@"ImageLoader"] loadImageWithURLRequest:[RCTConvert NSURLRequest:markOpts.watermarkImage.src] callback:^(NSError *markerError, UIImage *marker) {
                    if (markerError || marker == nil) {
                        marker = [[UIImage alloc] initWithContentsOfFile:markOpts.watermarkImage.uri];
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
                        reject(@"error",@"Can't mark the image.", markerError);
                        return;
                    }
                    NSLog(@" file from the path");
                    
                    NSString* res = saveImageForMarker(scaledImage, markOpts);
                    resolve(res);
                }];
            }
        }];
    }
}

@end
