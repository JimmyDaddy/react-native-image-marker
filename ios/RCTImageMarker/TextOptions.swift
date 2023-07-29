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
    var X: CGFloat = 20.0
    var Y: CGFloat = 20.0
    var position: MarkerPositionEnum = .none
    var text: String
    var style: TextStyle?

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let text = opts["text"] as? String else {
            throw NSError(domain: "PARAMS_REQUIRED", code: 0, userInfo: [NSLocalizedDescriptionKey: "text is required"])
        }

        if let positionOpts = opts["positionOptions"] as? [AnyHashable: Any] {
            self.X = RCTConvert.cgFloat(positionOpts["X"])
            self.Y = RCTConvert.cgFloat(positionOpts["Y"])
            self.position = positionOpts["position"] != nil ? RCTConvert.MarkerPosition(positionOpts["position"]) : .none
        }

        self.text = text
        self.style = try? TextStyle(dicOpts: (opts["style"] as? [AnyHashable: Any])!)
    }
}
