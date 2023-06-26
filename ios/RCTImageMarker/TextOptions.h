//
//  NSObject+TextOptions.h
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/24.
//

#import <Foundation/Foundation.h>
#import "RCTConvert+ImageMarker.h"
#import "TextStyle.h"

NS_ASSUME_NONNULL_BEGIN

@interface TextOptions: NSObject
@property (nonatomic, copy) NSString * text;
@property (nonatomic, assign) CGFloat X;
@property (nonatomic, assign) CGFloat Y;
@property (nonatomic, assign) MarkerPosition position;
@property (nonatomic, copy) TextStyle* style;

-(id)initWithDicOpts: (NSDictionary *) opts;

@end

NS_ASSUME_NONNULL_END
