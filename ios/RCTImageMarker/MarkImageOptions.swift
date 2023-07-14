//
//  MarkImageOptions.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/6/22.
//

import Foundation
import UIKit
import React

class MarkImageOptions: Options {
    var watermarkImage: ImageOptions
    var X: CGFloat = 20.0
    var Y: CGFloat = 20.0
    var position: MarkerPositionEnum = .none

    override init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let watermarkImageOpts = opts["watermarkImage"] as? [AnyHashable: Any], !Utils.isNULL(watermarkImageOpts) else {
            throw NSError(domain: "PARAMS_REQUIRED", code: 0, userInfo: [NSLocalizedDescriptionKey: "marker image is required"])
        }
        self.watermarkImage = try ImageOptions(dicOpts: watermarkImageOpts)
        try super.init(dicOpts: opts)
        let positionOpts = opts["watermarkPositions"] as? [AnyHashable: Any]
        if let positionOpts = positionOpts, !Utils.isNULL(positionOpts) {
            self.X = CGFloat(RCTConvert.cgFloat(positionOpts["X"]))
            self.Y = CGFloat(RCTConvert.cgFloat(positionOpts["Y"]))
            self.position = positionOpts["position"] != nil ? RCTConvert.MarkerPosition(positionOpts["position"]) : .none
        }
    }

    static func checkImageParams(_ opts: [AnyHashable: Any], rejecter reject: @escaping RCTPromiseRejectBlock) -> MarkImageOptions? {
        do {
            return try MarkImageOptions(dicOpts: opts)
        } catch let error as NSError {
            reject(error.domain, error.localizedDescription, nil)
            return nil
        }
    }
}
