//
//  NSObject+ImageOptions.h
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/25.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ImageOptions: NSObject
@property (nonatomic, copy) NSDictionary * src;
@property (nonatomic, copy) NSString * uri;
@property (nonatomic, assign) CGFloat scale;
@property (nonatomic, assign) CGFloat rotate;
@property (nonatomic, assign) CGFloat alpha;

-(id)initWithDicOpts: (NSDictionary *) opts;

@end

NS_ASSUME_NONNULL_END
