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
    var edgeInset: String?
    var position: MarkerPositionEnum = .none
    var text: String
    var alpha: CGFloat = 1.0
    var style: TextStyle
    var layout: ImageMarkerWatermarkLayout?

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let text = opts["text"] as? String else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "text is required"])
        }

        let positionOpts = opts["position"] as? [AnyHashable: Any]
        if let positionOpts {
            self.X = Utils.isNULL(positionOpts["X"]) ? nil : Utils.handleDynamicToString(v: positionOpts["X"])
            self.Y = Utils.isNULL(positionOpts["Y"]) ? nil : Utils.handleDynamicToString(v: positionOpts["Y"])
            self.edgeInset = Utils.isNULL(positionOpts["edgeInset"]) ? nil : Utils.handleDynamicToString(v: positionOpts["edgeInset"])
            self.position = positionOpts["position"] != nil ? RCTConvert.MarkerPosition(positionOpts["position"]) : .none
        }

        if let layoutOpts = opts["layout"] as? [AnyHashable: Any] {
            self.layout = try ImageMarkerWatermarkLayout(dicOpts: layoutOpts)
        }
        if layout?.isTile == true, positionOpts != nil {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "layout cannot be combined with position"]
            )
        }

        self.text = text
        let styleOpts = opts["style"] as? [AnyHashable: Any] ?? [:]
        self.style = try TextStyle(dicOpts: styleOpts)
        self.alpha = try Utils.resolvedAlpha(opts["alpha"], fieldName: "text")
    }
}
