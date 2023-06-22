//
//  Options+ImageMarkOptions.h
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/22.
//

#import "Options.h"

NS_ASSUME_NONNULL_BEGIN

@interface MarkImageOptions: Options

@property (nonatomic, copy) NSDictionary * markerSrc;
@property (nonatomic, copy) NSString * markerImageUri;
@property (nonatomic, assign) CGFloat markerScale;

@end

NS_ASSUME_NONNULL_END
