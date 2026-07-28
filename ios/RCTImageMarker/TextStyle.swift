//
//  TextStyle.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/24.
//

import Foundation
import UIKit
import React

struct TextStrokeStyle {
    let color: UIColor
    let width: CGFloat

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let colorValue = opts["color"] as? String,
              !colorValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              let color = UIColor(hex: colorValue) else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "stroke color is invalid"]
            )
        }
        let width = RCTConvert.cgFloat(opts["width"])
        guard width.isFinite, width >= 0 else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "stroke width must be a non-negative finite number"]
            )
        }
        self.color = color
        self.width = width
    }
}

class TextStyle: NSObject {
    var color: UIColor?
    var shadow: NSShadow?
    var textBackground: TextBackground?
    var strokeStyle: TextStrokeStyle?
    var fontName: String?
    var fontFallbacks: [String] = []
    var fontSize: CGFloat = 14.0
    var fontSizeRatio: CGFloat?
    var skewX: CGFloat = 0.0
    var underline: Bool = false
    var strikeThrough: Bool = false
    var italic: Bool = false
    var bold: Bool = false
    var rotate: CGFloat = 0
    var textAlign: String?

    init(dicOpts opts: [AnyHashable: Any]) throws {
        self.color = Utils.resolvedTextColor(opts["color"] as? String)
        if let shadowStyle = opts["shadowStyle"] as? [AnyHashable: Any] {
            self.shadow = try Utils.getShadowStyle(shadowStyle)
        } else {
            self.shadow = nil
        }
        self.textBackground = try TextBackground(textBackgroundStyle: (opts["textBackgroundStyle"] as? [AnyHashable : Any]))
        if let strokeStyle = opts["strokeStyle"] as? [AnyHashable: Any] {
            self.strokeStyle = try TextStrokeStyle(dicOpts: strokeStyle)
        } else {
            self.strokeStyle = nil
        }
        self.fontName = opts["fontName"] as? String
        if let rawFallbacks = opts["fontFallbacks"], !Utils.isNULL(rawFallbacks) {
            guard let fallbackNames = rawFallbacks as? [String],
                  fallbackNames.allSatisfy({
                      !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                  }) else {
                throw NSError(
                    domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                    code: 0,
                    userInfo: [NSLocalizedDescriptionKey: "fontFallbacks must contain non-empty font family names"]
                )
            }
            self.fontFallbacks = fallbackNames
        }
        self.fontSize = opts["fontSize"] != nil ? RCTConvert.cgFloat(opts["fontSize"]) : 14.0
        self.fontSizeRatio = opts["fontSizeRatio"] != nil ? RCTConvert.cgFloat(opts["fontSizeRatio"]) : nil
        self.skewX = RCTConvert.cgFloat(opts["skewX"])
        self.underline = RCTConvert.bool(opts["underline"])
        self.strikeThrough = RCTConvert.bool(opts["strikeThrough"])
        self.italic = RCTConvert.bool(opts["italic"])
        self.bold = RCTConvert.bool(opts["bold"])
        self.rotate = RCTConvert.cgFloat(opts["rotate"])
        self.textAlign = opts["textAlign"] as? String

        super.init()
    }

    func resolvedFont(backgroundWidth: CGFloat) -> UIFont {
        let resolvedSize = fontSizeRatio.map { backgroundWidth * $0 } ?? fontSize
        for name in [fontName].compactMap({ $0 }) + fontFallbacks {
            if let font = UIFont(name: name, size: resolvedSize) {
                return font
            }
        }
        return UIFont.systemFont(ofSize: resolvedSize)
    }
}
