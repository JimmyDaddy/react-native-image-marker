//
//  Options+ImageMarkOptions.h
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/22.
//

#import "Options.h"
#import "ImageOptions.h"

NS_ASSUME_NONNULL_BEGIN

@interface MarkImageOptions: Options

@property (nonatomic, copy) ImageOptions * watermarkImage;
@property (nonatomic, assign) CGFloat X;
@property (nonatomic, assign) CGFloat Y;
@property (nonatomic, assign) MarkerPosition position;

@end

NS_ASSUME_NONNULL_END
