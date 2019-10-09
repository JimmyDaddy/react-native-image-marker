"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * @Author: JimmyDaddy
 * @Date: 2017-09-14 10:40:09
 * @Last Modified by: JimmyDaddy
 * @Last Modified time: 2019-10-09 16:59:00
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
        const { src, text, X, Y, color, fontName, fontSize, shadowStyle, textBackgroundStyle, scale, quality, position, filename, saveFormat, maxSize = 2048, } = option;
        if (!src) {
            throw new Error('please set image!');
        }
        let srcObj = resolveAssetSource(src);
        if (!srcObj) {
            srcObj = {
                uri: src,
                __packager_asset: false
            };
        }
        let mShadowStyle = shadowStyle || {};
        let mTextBackgroundStyle = textBackgroundStyle || {};
        if (!position) {
            return ImageMarker.addText(srcObj, text, X, Y, color, fontName, fontSize, mShadowStyle, mTextBackgroundStyle, scale, quality, filename, saveFormat, maxSize);
        }
        else {
            return ImageMarker.addTextByPostion(srcObj, text, position, color, fontName, fontSize, mShadowStyle, mTextBackgroundStyle, scale, quality, filename, saveFormat, maxSize);
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
                __packager_asset: false
            };
        }
        let markerObj = resolveAssetSource(markerSrc);
        if (!markerObj) {
            markerObj = {
                uri: markerSrc,
                __packager_asset: false
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUF3RTtBQUV4RSxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsNEJBQWEsQ0FBQTtBQUNyQyxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxvQkFBSyxDQUFBO0FBRXBDLElBQVksUUFRWDtBQVJELFdBQVksUUFBUTtJQUNsQiwrQkFBbUIsQ0FBQTtJQUNuQixtQ0FBdUIsQ0FBQTtJQUN2QixpQ0FBcUIsQ0FBQTtJQUNyQixxQ0FBeUIsQ0FBQTtJQUN6Qix5Q0FBNkIsQ0FBQTtJQUM3Qix1Q0FBMkIsQ0FBQTtJQUMzQiw2QkFBaUIsQ0FBQTtBQUNuQixDQUFDLEVBUlcsUUFBUSxHQUFSLGdCQUFRLEtBQVIsZ0JBQVEsUUFRbkI7QUFFRCxJQUFZLGtCQUdYO0FBSEQsV0FBWSxrQkFBa0I7SUFDNUIsMkNBQXFCLENBQUE7SUFDckIsMkNBQXFCLENBQUE7QUFDdkIsQ0FBQyxFQUhXLGtCQUFrQixHQUFsQiwwQkFBa0IsS0FBbEIsMEJBQWtCLFFBRzdCO0FBRUQsSUFBWSxXQUlYO0FBSkQsV0FBWSxXQUFXO0lBQ3JCLDBCQUFXLENBQUE7SUFDWCwwQkFBVyxDQUFBO0lBQ1gsZ0NBQWlCLENBQUE7QUFDbkIsQ0FBQyxFQUpXLFdBQVcsR0FBWCxtQkFBVyxLQUFYLG1CQUFXLFFBSXRCO0FBeURELE1BQXFCLE1BQU07SUFDekIsTUFBTSxDQUFDLFFBQVEsQ0FBRSxNQUFzQjtRQUNyQyxNQUFNLEVBQ0osR0FBRyxFQUNILElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxFQUNELEtBQUssRUFDTCxRQUFRLEVBQ1IsUUFBUSxFQUNSLFdBQVcsRUFDWCxtQkFBbUIsRUFDbkIsS0FBSyxFQUNMLE9BQU8sRUFDUCxRQUFRLEVBQ1IsUUFBUSxFQUNSLFVBQVUsRUFDVixPQUFPLEdBQUcsSUFBSSxHQUNmLEdBQUcs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