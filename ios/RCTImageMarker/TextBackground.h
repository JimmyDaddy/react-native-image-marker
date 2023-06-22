//
//  NSObject+TextBackground.h
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface TextBackground : NSObject
@property (nonatomic, copy) UIColor * colorBg;
@property (nonatomic, copy) NSString * typeBg;
@property (nonatomic, assign) float paddingX;
@property (nonatomic, assign) float paddingY;

-(id)initWithTextBackgroundStyle:(NSDictionary *) textBackground;

@end

NS_ASSUME_NONNULL_END
