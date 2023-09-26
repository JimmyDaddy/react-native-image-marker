//
//  Utils.swift
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

import Foundation
import UIKit
import React

class Utils: NSObject {
    static func getColor(_ hexColor: String) -> UIColor {
        var cString: String = hexColor.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()

        if cString.hasPrefix("0X") {
            cString = String(cString.dropFirst(2))
        }
        if cString.hasPrefix("#") {
            cString = String(cString.dropFirst())
        }

        if cString.count != 8 && cString.count != 6 && cString.count != 3 && cString.count != 4 {
            return UIColor.clear
        }

        var red: UInt32 = 0
        var green: UInt32 = 0
        var blue: UInt32 = 0
        var alpha: CGFloat = 1.0

        if cString.count == 8 {
            let aString = String(cString.suffix(2))
            if let a = UInt32(aString, radix: 16) {
                alpha = CGFloat(a) / 255.0
            }
            cString = String(cString.prefix(6))
        } else if cString.count == 4 {
            let aString = String(cString.suffix(1))
            if let a = UInt32(aString, radix: 16) {
                alpha = CGFloat(a) / 15.0
            }
            cString = String(cString.prefix(3))
        }

        let hex6 = cString.count == 6 ? true : false
        var range = NSRange(location: 0, length: hex6 ? 2 : 1)

        /* 调用下面的方法处理字符串 */
        let redStr = (cString as NSString).substring(with: range)
        red = stringToInt(redStr)

        range.location = hex6 ? 2 : 1
        let greenStr = (cString as NSString).substring(with: range)
        green = stringToInt(greenStr)

        range.location = hex6 ? 4 : 2
        let blueStr = (cString as NSString).substring(with: range)
        blue = stringToInt(blueStr)

        return UIColor(red: CGFloat(red) / 255.0, green: CGFloat(green) / 255.0, blue: CGFloat(blue) / 255.0, alpha: alpha)
    }

    static func stringToInt(_ string: String) -> UInt32 {
        if string.count == 1 {
            let hexChar = string[string.startIndex]
            var intCh: UInt32 = 0
            if hexChar >= "0" && hexChar <= "9" {
                intCh = (UInt32(hexChar.asciiValue!) - 48) * 16 /* 0 的Ascll - 48 */
            } else if hexChar >= "A" && hexChar <= "F" {
                intCh = (UInt32(hexChar.asciiValue!) - 55) * 16 /* A 的Ascll - 65 */
            } else {
                intCh = (UInt32(hexChar.asciiValue!) - 87) * 16 /* a 的Ascll - 97 */
            }
            return intCh * 2
        } else {
            let hexChar1 = string[string.startIndex]
            var intCh1: UInt32 = 0
            if hexChar1 >= "0" && hexChar1 <= "9" {
                intCh1 = (UInt32(hexChar1.asciiValue!) - 48) * 16 /* 0 的Ascll - 48 */
            } else if hexChar1 >= "A" && hexChar1 <= "F" {
                intCh1 = (UInt32(hexChar1.asciiValue!) - 55) * 16 /* A 的Ascll - 65 */
            } else {
                intCh1 = (UInt32(hexChar1.asciiValue!) - 87) * 16 /* a 的Ascll - 97 */
            }
            let hexChar2 = string[string.index(after: string.startIndex)]
            var intCh2: UInt32 = 0
            if hexChar2 >= "0" && hexChar2 <= "9" {
                intCh2 = UInt32(hexChar2.asciiValue!) - 48 /* 0 的Ascll - 48 */
            } else if hexChar1 >= "A" && hexChar1 <= "F" {
                intCh2 = UInt32(hexChar2.asciiValue!) - 55 /* A 的Ascll - 65 */
            } else {
                intCh2 = UInt32(hexChar2.asciiValue!) - 87 /* a 的Ascll - 97 */
            }
            return intCh1 + intCh2
        }
    }

    static func getShadowStyle(_ shadowStyle: [AnyHashable: Any]?) -> NSShadow? {
        if let shadowStyle = shadowStyle {
            let shadow = NSShadow()
            shadow.shadowBlurRadius = CGFloat(truncating: RCTConvert.nsNumber(shadowStyle["radius"]))
            shadow.shadowOffset = CGSize(width: CGFloat(truncating: RCTConvert.nsNumber(shadowStyle["dx"])), height: CGFloat(truncating: RCTConvert.nsNumber(shadowStyle["dy"])))
            let color = getColor(RCTConvert.nsString(shadowStyle["color"]))
            shadow.shadowColor = color != nil ? color : UIColor.gray
            return shadow
        } else {
            return nil
        }
    }

    static func isPng(_ saveFormat: String?) -> Bool {
        return saveFormat != nil && (saveFormat!.caseInsensitiveCompare("png") == .orderedSame)
    }

    static func getExt(_ saveFormat: String?) -> String {
        let ext = saveFormat != nil && (saveFormat!.caseInsensitiveCompare("png") == .orderedSame) ? ".png" : ".jpg"
        return ext
    }

    static func isBase64(_ uri: String?) -> Bool {
        return uri != nil ? uri!.hasPrefix("data:") : false
    }

    static func isNULL(_ obj: Any?) -> Bool {
        return obj == nil || obj is NSNull
    }
    
    static func checkSpreadValue(str: String?, maxLength: Int = 1) -> Bool {
        if str == nil { return false }
        let pattern = #"^((\d+|\d+%)\s?){1,\#(maxLength)}$"#
        if (str?.range(of: pattern, options: .regularExpression)) != nil {
            return true
        } else {
            return false
        }
    }

    static func parseSpreadValue(v: String?, relativeTo length: CGFloat) -> CGFloat? {
        if v == nil { return nil }
        if v?.hasSuffix(String(describing: "%")) ?? false {
            let percent = CGFloat(Double(v!.dropLast()) ?? 0) / 100
            return length * percent
        } else {
            return CGFloat(Double(v!) ?? 0)
        }
    }
}
