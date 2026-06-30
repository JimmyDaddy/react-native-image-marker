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

class TextBackground: Padding {
    var typeBg: String?
    var colorBg: UIColor?
    var cornerRadius: CornerRadius?

    init?(textBackgroundStyle textBackground: [AnyHashable: Any]?) throws {
        guard let textBackground = textBackground, !Utils.isNULL(textBackground) else {
            return nil
        }
        try super.init(paddingData: textBackground)
        self.typeBg = textBackground["type"] as? String
        guard let color = textBackground["color"] as? String else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "text background color is required"])
        }
        self.colorBg = UIColor(hex: color) ?? UIColor.clear
        if textBackground.keys.contains("cornerRadius") {
            guard let cornerRadius = textBackground["cornerRadius"] as? [AnyHashable: Any] else {
                throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "cornerRadius is invalid"])
            }
            self.cornerRadius = try CornerRadius(dicOpts: cornerRadius)
        }
    }
}
