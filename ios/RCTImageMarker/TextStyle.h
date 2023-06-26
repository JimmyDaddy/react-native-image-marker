//
//  NSObject+TextStyle.h
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/24.
//

#import <Foundation/Foundation.h>
#import "TextBackground.h"

NS_ASSUME_NONNULL_BEGIN

@interface TextStyle: NSObject
@property (nonatomic, copy) UIColor * color;
@property (nonatomic, copy) UIFont * font;
@property (nonatomic, copy) NSShadow * shadow;
@property (nonatomic, copy) TextBackground* textBackground;
@property (nonatomic, assign) bool underline;
@property (nonatomic, assign) CGFloat skewX;
@property (nonatomic, assign) bool strikeThrough;
@property (nonatomic, assign) bool italic;
@property (nonatomic, assign) bool bold;
@property (nonatomic, assign) NSInteger rotate;
@property (nonatomic, copy) NSString * textAlign;

-(id)initWithDicOpts: (NSDictionary *) opts;

@end

NS_ASSUME_NONNULL_END
