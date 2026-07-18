//
//  WatermarkImageOptions.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/31.
//

import Foundation
import UIKit
import React

class WatermarkImageOptions: NSObject {
    var imageOption: ImageOptions
    var X: String?
    var Y: String?
    var edgeInset: String?
    var position: MarkerPositionEnum = .none
    var trimTransparentPadding: Bool = false
    var layout: ImageMarkerWatermarkLayout?

    init(dicOpts opts: [AnyHashable: Any]) throws {
        self.imageOption = try ImageOptions(dicOpts: opts)
        self.trimTransparentPadding = opts["trimTransparentPadding"] as? Bool ?? false
        let positionOpts = opts["position"] as? [AnyHashable: Any]
        if let positionOpts = positionOpts, !Utils.isNULL(positionOpts) {
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
    }

    init(watermarkImage: ImageOptions, X: String?, Y: String?, edgeInset: String?, position: MarkerPositionEnum, trimTransparentPadding: Bool = false, layout: ImageMarkerWatermarkLayout? = nil) {
        self.imageOption = watermarkImage
        self.X = X
        self.Y = Y
        self.edgeInset = edgeInset
        self.position = position
        self.trimTransparentPadding = trimTransparentPadding
        self.layout = layout
    }

    static func checkWatermarkImageParams(_ opts: [AnyHashable: Any], rejecter reject: @escaping RCTPromiseRejectBlock) -> WatermarkImageOptions? {
        do {
            return try WatermarkImageOptions(dicOpts: opts)
        } catch let error as NSError {
            reject(error.domain, error.localizedDescription, nil)
            return nil
        }
    }
}
