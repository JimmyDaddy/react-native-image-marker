//
//  ImageOptions.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/25.
//

import Foundation
import UIKit

class ImageOptions: NSObject {
    var src: [AnyHashable: Any]
    var uri: String
    var scale: CGFloat = 1.0
    var rotate: CGFloat = 0
    var alpha: CGFloat = 1.0

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let src = opts["src"] as? [AnyHashable: Any], !Utils.isNULL(src) else {
            throw NSError(domain: "PARAMS_REQUIRED", code: 0, userInfo: [NSLocalizedDescriptionKey: "image is required"])
        }
        self.src = src
        self.uri = src["uri"] as! String
        self.scale = opts["scale"] as? CGFloat ?? 1.0
        self.rotate = opts["rotate"] as? CGFloat ?? 0
        self.alpha = opts["alpha"] as? CGFloat ?? 1.0
    }
}
