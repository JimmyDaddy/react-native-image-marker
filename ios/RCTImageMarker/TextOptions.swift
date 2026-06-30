//
//  TextOptions.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/24.
//

import Foundation
import UIKit
import React

class TextOptions: NSObject {
    var X: String?
    var Y: String?
    var position: MarkerPositionEnum = .none
    var text: String
    var style: TextStyle

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let text = opts["text"] as? String else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "text is required"])
        }

        if let positionOpts = opts["position"] as? [AnyHashable: Any] {
            self.X = Utils.isNULL(positionOpts["X"]) ? nil : Utils.handleDynamicToString(v: positionOpts["X"])
            self.Y = Utils.isNULL(positionOpts["Y"]) ? nil : Utils.handleDynamicToString(v: positionOpts["Y"])
            self.position = positionOpts["position"] != nil ? RCTConvert.MarkerPosition(positionOpts["position"]) : .none
        }

        self.text = text
        let styleOpts = opts["style"] as? [AnyHashable: Any] ?? [:]
        self.style = try TextStyle(dicOpts: styleOpts)
    }
}
