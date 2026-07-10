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
    var rnSrc: RNImageSRC

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let src = opts["src"] as? [AnyHashable: Any], !Utils.isNULL(src) else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "image is required"])
        }
        self.src = src
        self.rnSrc = RNImageSRC(dicOpts: src)
        guard let uri = src["uri"] as? String, !uri.isEmpty else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "image uri is required"])
        }
        self.uri = uri
        self.scale = (opts["scale"] as? NSNumber).map(CGFloat.init(truncating:)) ?? 1.0
        self.rotate = (opts["rotate"] as? NSNumber).map(CGFloat.init(truncating:)) ?? 0
        self.alpha = (opts["alpha"] as? NSNumber).map(CGFloat.init(truncating:)) ?? 1.0
        guard self.scale.isFinite, self.scale > 0 else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "image scale must be greater than zero"]
            )
        }
        guard self.rotate.isFinite else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "image rotation must be finite"]
            )
        }
    }
}
