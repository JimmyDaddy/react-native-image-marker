//
//  TextStyle.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/24.
//

import Foundation
import UIKit
import React

class TextStyle: NSObject {
    var color: UIColor?
    var shadow: NSShadow?
    var textBackground: TextBackground?
    var font: UIFont?
    var skewX: CGFloat = 0.0
    var underline: Bool = false
    var strikeThrough: Bool = false
    var italic: Bool = false
    var bold: Bool = false
    var rotate: CGFloat = 0
    var textAlign: String?

    init(dicOpts opts: [AnyHashable: Any]) throws {
        self.color = UIColor(hex: opts["color"] as! String) ?? UIColor.clear
        if let shadowStyle = opts["shadowStyle"] as? [AnyHashable: Any] {
            self.shadow = Utils.getShadowStyle(shadowStyle)
        } else {
            self.shadow = nil
        }
        self.textBackground = try TextBackground(textBackgroundStyle: (opts["textBackgroundStyle"] as? [AnyHashable : Any]))
        let fontSize = opts["fontSize"] != nil ? RCTConvert.cgFloat(opts["fontSize"]) : 14.0
        self.font = UIFont(name: opts["fontName"] as? String ?? "", size: fontSize)
        if self.font == nil {
            self.font = UIFont.systemFont(ofSize: fontSize)
        }
        self.skewX = RCTConvert.cgFloat(opts["skewX"])
        self.underline = RCTConvert.bool(opts["underline"])
        self.strikeThrough = RCTConvert.bool(opts["strikeThrough"])
        self.italic = RCTConvert.bool(opts["italic"])
        self.bold = RCTConvert.bool(opts["bold"])
        self.rotate = RCTConvert.cgFloat(opts["rotate"])
        self.textAlign = opts["textAlign"] as? String

        super.init()
    }
}
