//
//  Padding.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/8/9.
//

import Foundation

class Padding {
    var paddingTop: String = "0"
    var paddingLeft: String = "0"
    var paddingBottom: String = "0"
    var paddingRight: String = "0"
    
    init(paddingData: [AnyHashable: Any]) throws {
        var topValue: String = "0"
        var leftValue: String = "0"
        var bottomValue: String = "0"
        var rightValue: String = "0"
        
        for (key, paddingValue) in paddingData {
            switch key {
            case "padding" as String:
                if var paddingValue = paddingValue as? String {
                    paddingValue = paddingValue.trimmingCharacters(in: .whitespaces)
                    if !Utils.checkSpreadValue(str: paddingValue, maxLength: 4) {
                        throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "padding is invalid"])
                    }
                    let values = paddingValue.components(separatedBy: " ")
                    if values.count == 1 {
                        topValue = values[0]
                        leftValue = values[0]
                        bottomValue = values[0]
                        rightValue = values[0]
                    } else if values.count == 2 {
                        topValue = values[0]
                        leftValue = values[1]
                        bottomValue = values[0]
                        rightValue = values[1]
                    } else if values.count == 3 {
                        topValue = values[0]
                        leftValue = values[1]
                        bottomValue = values[2]
                        rightValue = values[1]
                    } else if values.count == 4 {
                        topValue = values[0]
                        leftValue = values[1]
                        bottomValue = values[2]
                        rightValue = values[3]
                    }
                    break
                } else if let paddingValue = paddingValue as? CGFloat {
                    topValue = String(format: "%f", paddingValue)
                    leftValue = String(format: "%f", paddingValue)
                    bottomValue = String(format: "%f", paddingValue)
                    rightValue = String(format: "%f", paddingValue)
                }
            case "paddingLeft" as String:
                if let paddingValue = paddingValue as? String {
                    if !Utils.checkSpreadValue(str: paddingValue, maxLength: 1) {
                        throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "padding is invalid"])
                    }
                    leftValue = paddingValue;
                } else if let paddingValue = paddingValue as? CGFloat {
                    leftValue = String(format: "%f", paddingValue)
                }
            case "paddingRight" as String:
                if let paddingValue = paddingValue as? String {
                    if !Utils.checkSpreadValue(str: paddingValue, maxLength: 1) {
                        throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "padding is invalid"])
                    }
                    rightValue = paddingValue;
                } else if let paddingValue = paddingValue as? CGFloat {
                    rightValue = String(format: "%f", paddingValue)
                }
            case "paddingTop" as String:
                if let paddingValue = paddingValue as? String {
                    if !Utils.checkSpreadValue(str: paddingValue, maxLength: 1) {
                        throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "padding is invalid"])
                    }
                    topValue = paddingValue;
                } else if let paddingValue = paddingValue as? CGFloat {
                    topValue = String(format: "%f", paddingValue)
                }
            case "paddingBottom" as String:
                if let paddingValue = paddingValue as? String {
                    if !Utils.checkSpreadValue(str: paddingValue, maxLength: 1) {
                        throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "padding is invalid"])
                    }
                    bottomValue = paddingValue;
                } else if let paddingValue = paddingValue as? CGFloat {
                    bottomValue = String(format: "%f", paddingValue)
                }
            case "paddingHorizontal" as String, "paddingX" as String:
                if let paddingValue = paddingValue as? String {
                    if !Utils.checkSpreadValue(str: paddingValue, maxLength: 1) {
                        throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "padding is invalid"])
                    }
                    rightValue = paddingValue;
                    leftValue = paddingValue;
                } else if let paddingValue = paddingValue as? CGFloat {
                    leftValue = String(format: "%f", paddingValue)
                    rightValue = String(format: "%f", paddingValue)
                }
            case "paddingVertical" as String, "paddingY" as String:
                if let paddingValue = paddingValue as? String {
                    if !Utils.checkSpreadValue(str: paddingValue, maxLength: 1) {
                        throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "padding is invalid"])
                    }
                    topValue = paddingValue;
                    bottomValue = paddingValue;
                } else if let paddingValue = paddingValue as? CGFloat {
                    topValue = String(format: "%f", paddingValue)
                    bottomValue = String(format: "%f", paddingValue)
                }
            default:
                break
            }
        }
        
        self.paddingTop = topValue
        self.paddingLeft = leftValue
        self.paddingBottom = bottomValue
        self.paddingRight = rightValue
    }
    
    func toEdgeInsets(width: CGFloat, height: CGFloat) -> UIEdgeInsets {
        let topValue = Utils.parseSpreadValue(v: self.paddingTop, relativeTo: height) ?? 0
        let leftValue = Utils.parseSpreadValue(v: self.paddingLeft, relativeTo: width) ?? 0
        let bottomValue = Utils.parseSpreadValue(v: self.paddingBottom, relativeTo: height) ?? 0
        let rightValue = Utils.parseSpreadValue(v: self.paddingRight, relativeTo: width) ?? 0
        return UIEdgeInsets(top: topValue, left: leftValue, bottom: bottomValue, right: rightValue)
    }
}
