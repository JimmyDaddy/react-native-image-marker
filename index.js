"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageFormat = exports.TextBackgroundType = exports.Position = void 0;
/*
 * @Author: JimmyDaddy
 * @Date: 2017-09-14 10:40:09
 * @Last Modified by: JimmyDaddy
 * @Last Modified time: 2021-04-24 18:07:18
 * @Description
 */
const react_native_1 = require("react-native");
const { ImageMarker } = react_native_1.NativeModules;
const { resolveAssetSource } = react_native_1.Image;
var Position;
(function (Position) {
    Position["topLeft"] = "topLeft";
    Position["topCenter"] = "topCenter";
    Position["topRight"] = "topRight";
    Position["bottomLeft"] = "bottomLeft";
    Position["bottomCenter"] = "bottomCenter";
    Position["bottomRight"] = "bottomRight";
    Position["center"] = "center";
})(Position = exports.Position || (exports.Position = {}));
var TextBackgroundType;
(function (TextBackgroundType) {
    TextBackgroundType["stretchX"] = "stretchX";
    TextBackgroundType["stretchY"] = "stretchY";
})(TextBackgroundType = exports.TextBackgroundType || (exports.TextBackgroundType = {}));
var ImageFormat;
(function (ImageFormat) {
    ImageFormat["png"] = "png";
    ImageFormat["jpg"] = "jpg";
    ImageFormat["base64"] = "base64";
})(ImageFormat = exports.ImageFormat || (exports.ImageFormat = {}));
class Marker {
    static markText(option) {
        const { src, text, X, Y, offsetX = 0, offsetY = 0, color, fontName, fontSize, shadowStyle, textBackgroundStyle, scale, quality, position, filename, saveFormat, maxSize = 2048, } = option;
        if (!src) {
            throw new Error('please set image!');
        }
        let srcObj = resolveAssetSource(src);
        if (!srcObj) {
            srcObj = {
                uri: src,
                __packager_asset: false,
            };
        }
        let mShadowStyle = shadowStyle || {};
        let mTextBackgroundStyle = textBackgroundStyle || {};
        if (!position) {
            return ImageMarker.addText(srcObj, text, X, Y, offsetX, offsetY, color, fontName, fontSize, mShadowStyle, mTextBackgroundStyle, scale, quality, filename, saveFormat, maxSize);
        }
        else {
            return ImageMarker.addTextByPosition(srcObj, text, position, offsetX, offsetY, color, fontName, fontSize, mShadowStyle, mTextBackgroundStyle, scale, quality, filename, saveFormat, maxSize);
        }
    }
    static markImage(option) {
        const { src, markerSrc, X, Y, markerScale, scale, quality, position, filename, saveFormat, maxSize = 2048, } = option;
        if (!src) {
            throw new Error('please set image!');
        }
        if (!markerSrc) {
            throw new Error('please set mark image!');
        }
        let srcObj = resolveAssetSource(src);
        if (!srcObj) {
            srcObj = {
                uri: src,
                __packager_asset: false,
            };
        }
        let markerObj = resolveAssetSource(markerSrc);
        if (!markerObj) {
            markerObj = {
                uri: markerSrc,
                __packager_asset: false,
            };
        }
        if (!position) {
            return ImageMarker.markWithImage(srcObj, markerObj, X, Y, scale, markerScale, quality, filename, saveFormat, maxSize);
        }
        else {
            return ImageMarker.markWithImageByPosition(srcObj, markerObj, position, scale, markerScale, quality, filename, saveFormat, maxSize);
        }
    }
}
exports.default = Marker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBb0Q7QUFFcEQsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLDRCQUFhLENBQUM7QUFDdEMsTUFBTSxFQUFFLGtCQUFrQixFQUFFLEdBQUcsb0JBQUssQ0FBQztBQUVyQyxJQUFZLFFBUVg7QUFSRCxXQUFZLFFBQVE7SUFDbEIsK0JBQW1CLENBQUE7SUFDbkIsbUNBQXVCLENBQUE7SUFDdkIsaUNBQXFCLENBQUE7SUFDckIscUNBQXlCLENBQUE7SUFDekIseUNBQTZCLENBQUE7SUFDN0IsdUNBQTJCLENBQUE7SUFDM0IsNkJBQWlCLENBQUE7QUFDbkIsQ0FBQyxFQVJXLFFBQVEsR0FBUixnQkFBUSxLQUFSLGdCQUFRLFFBUW5CO0FBRUQsSUFBWSxrQkFHWDtBQUhELFdBQVksa0JBQWtCO0lBQzVCLDJDQUFxQixDQUFBO0lBQ3JCLDJDQUFxQixDQUFBO0FBQ3ZCLENBQUMsRUFIVyxrQkFBa0IsR0FBbEIsMEJBQWtCLEtBQWxCLDBCQUFrQixRQUc3QjtBQUVELElBQVksV0FJWDtBQUpELFdBQVksV0FBVztJQUNyQiwwQkFBVyxDQUFBO0lBQ1gsMEJBQVcsQ0FBQTtJQUNYLGdDQUFpQixDQUFBO0FBQ25CLENBQUMsRUFKVyxXQUFXLEdBQVgsbUJBQVcsS0FBWCxtQkFBVyxRQUl0QjtBQThERCxNQUFxQixNQUFNO0lBQ3pCLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBc0I7UUFDcEMsTUFBTSxFQUNKLEdBQUcsRUFDSCxJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsRUFDRCxPQUFPLEdBQUcsQ0FBQyxFQUNYLE9BQU8sR0FBRyxDQUFDLEVBQ1gsS0FBSyxFQUNMLFFBQVEsRUFDUixRQUFRLEVBQ1IsV0FBVyxFQUNYLG1CQUFtQixFQUNuQixLQUFLLEVBQ0wsT0FBTyxFQUNQLFFBQVEsRUFDUixRQUFRLEVBQ1IsVUFBVSxFQUNWLE9BQU8sR0FBRyxJQUFJLEdBQ2YsR0FBRyxNQUFNLENBQUM7UUFFWCxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1NBQ3RDO1FBRUQsSUFBSSxNQUFNLEdBQVEsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRztnQkFDUCxHQUFHLEVBQUUsR0FBRztnQkFDUixnQkFBZ0IsRUFBRSxLQUFLO2FBQ3hCLENBQUM7U0FDSDtRQUVELElBQUksWUFBWSxHQUFHLFdBQVcsSUFBSSxFQUFFLENBQUM7UUFDckMsSUFBSSxvQkFBb0IsR0FBRyxtQkFBbUIsSUFBSSxFQUFFLENBQUM7UUFFckQsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNiLE9BQU8sV0FBVyxDQUFDLE9BQU8sQ0FDeEIsTUFBTSxFQUNOLElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxFQUNELE9BQU8sRUFDUCxPQUFPLEVBQ1AsS0FBSyxFQUNMLFFBQVEsRUFDUixRQUFRLEVBQ1IsWUFBWSxFQUNaLG9CQUFvQixFQUNwQixLQUFLLEVBQ0wsT0FBTyxFQUNQLFFBQVEsRUFDUixVQUFVLEVBQ1YsT0FBTyxDQUNSLENBQUM7U0FDSDthQUFNO1lBQ0wsT0FBTyxXQUFXLENBQUMsaUJBQWlCLENBQ2xDLE1BQU0sRUFDTixJQUFJLEVBQ0osUUFBUSxFQUNSLE9BQU8sRUFDUCxPQUFPLEVBQ1AsS0FBSyxFQUNMLFFBQVEsRUFDUixRQUFRLEVBQ1IsWUFBWSxFQUNaLG9CQUFvQixFQUNwQixLQUFLLEVBQ0wsT0FBTyxFQUNQLFFBQVEsRUFDUixVQUFVLEVBQ1YsT0FBTyxDQUNSLENBQUM7U0FDSDtJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQXVCO1FBQ3RDLE1BQU0sRUFDSixHQUFHLEVBQ0gsU0FBUyxFQUNULENBQUMsRUFDRCxDQUFDLEVBQ0QsV0FBVyxFQUNYLEtBQUssRUFDTCxPQUFPLEVBQ1AsUUFBUSxFQUNSLFFBQVEsRUFDUixVQUFVLEVBQ1YsT0FBTyxHQUFHLElBQUksR0FDZixHQUFHLE1BQU0sQ0FBQztRQUVYLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDUixNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7U0FDdEM7UUFDRCxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1NBQzNDO1FBRUQsSUFBSSxNQUFNLEdBQVEsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRztnQkFDUCxHQUFHLEVBQUUsR0FBRztnQkFDUixnQkFBZ0IsRUFBRSxLQUFLO2FBQ3hCLENBQUM7U0FDSDtRQUVELElBQUksU0FBUyxHQUFRLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDZCxTQUFTLEdBQUc7Z0JBQ1YsR0FBRyxFQUFFLFNBQVM7Z0JBQ2QsZ0JBQWdCLEVBQUUsS0FBSzthQUN4QixDQUFDO1NBQ0g7UUFFRCxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2IsT0FBTyxXQUFXLENBQUMsYUFBYSxDQUM5QixNQUFNLEVBQ04sU0FBUyxFQUNULENBQUMsRUFDRCxDQUFDLEVBQ0QsS0FBSyxFQUNMLFdBQVcsRUFDWCxPQUFPLEVBQ1AsUUFBUSxFQUNSLFVBQVUsRUFDVixPQUFPLENBQ1IsQ0FBQztTQUNIO2FBQU07WUFDTCxPQUFPLFdBQVcsQ0FBQyx1QkFBdUIsQ0FDeEMsTUFBTSxFQUNOLFNBQVMsRUFDVCxRQUFRLEVBQ1IsS0FBSyxFQUNMLFdBQVcsRUFDWCxPQUFPLEVBQ1AsUUFBUSxFQUNSLFVBQVUsRUFDVixPQUFPLENBQ1IsQ0FBQztTQUNIO0lBQ0gsQ0FBQztDQUNGO0FBOUlELHlCQThJQyJ9