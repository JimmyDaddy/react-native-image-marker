//
//  TextBackground.swift
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

import Foundation
import UIKit
import React

class TextBackground: NSObject {
    var typeBg: String?
    var paddingX: CGFloat = 0.0
    var paddingY: CGFloat = 0.0
    var colorBg: UIColor?

    init?(textBackgroundStyle textBackground: [AnyHashable: Any]?) {
        guard let textBackground = textBackground, !Utils.isNULL(textBackground) else {
            return nil
        }
        self.typeBg = textBackground["type"] as? String
        self.paddingX = RCTConvert.cgFloat(textBackground["paddingX"])
        self.paddingY = RCTConvert.cgFloat(textBackground["paddingY"])
        self.colorBg = UIColor(hex: textBackground["color"] as! String) ?? UIColor.clear
    }
}
