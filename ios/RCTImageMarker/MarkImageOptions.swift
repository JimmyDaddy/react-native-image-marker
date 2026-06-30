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
    var watermarkImages: [WatermarkImageOptions] = []

    override init(dicOpts opts: [AnyHashable: Any]) throws {
        try super.init(dicOpts: opts)
        let watermarkImageOpts = opts["watermarkImage"]
        let watermarkImagesOpts = opts["watermarkImages"] as? [[AnyHashable: Any]] ?? []
        if Utils.isNULL(watermarkImageOpts) && watermarkImagesOpts.isEmpty  {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "marker image is required"])
        }
        if !watermarkImagesOpts.isEmpty {
            self.watermarkImages = try watermarkImagesOpts.map { try WatermarkImageOptions(dicOpts: $0) }
        }
        if (!Utils.isNULL(watermarkImageOpts)){
            guard let watermarkImageOpts = watermarkImageOpts as? [AnyHashable: Any] else {
                throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "watermarkImage is invalid"])
            }
            let singleImageOptions = try ImageOptions(dicOpts: watermarkImageOpts)
            var singleX = "20.0"
            var singleY = "20.0"
            var singlePosition: MarkerPositionEnum = .none
            let singleImagePositionOpts = opts["watermarkPositions"] as? [AnyHashable: Any]
            if let positionOpts = singleImagePositionOpts, !Utils.isNULL(singleImagePositionOpts) {
                singleX = Utils.handleDynamicToString(v: positionOpts["X"])
                singleY = Utils.handleDynamicToString(v: positionOpts["Y"])
                singlePosition = positionOpts["position"] != nil ? RCTConvert.MarkerPosition(positionOpts["position"]) : .none
            }
            let watermarkImageOptions = WatermarkImageOptions(watermarkImage: singleImageOptions, X: singleX, Y: singleY, position: singlePosition)
            self.watermarkImages.append(watermarkImageOptions)
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
