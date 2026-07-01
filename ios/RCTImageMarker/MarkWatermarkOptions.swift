//
//  MarkWatermarkOptions.swift
//  react-native-image-marker
//

import Foundation
import UIKit
import React

enum WatermarkLayerOptions {
    case text(TextOptions)
    case image(WatermarkImageOptions)

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let type = opts["type"] as? String else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "watermark layer type is required"])
        }
        switch type {
        case "text":
            self = .text(try TextOptions(dicOpts: opts))
        case "image":
            self = .image(try WatermarkImageOptions(dicOpts: opts))
        default:
            throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "watermark layer type is invalid"])
        }
    }
}

class MarkWatermarkOptions: Options {
    var watermarkLayers: [WatermarkLayerOptions] = []
    var imageLayers: [WatermarkImageOptions] {
        watermarkLayers.compactMap { layer in
            if case let .image(imageOptions) = layer {
                return imageOptions
            }
            return nil
        }
    }

    override init(dicOpts opts: [AnyHashable: Any]) throws {
        try super.init(dicOpts: opts)
        guard let watermarkOpts = opts["watermarks"] as? [[AnyHashable: Any]], watermarkOpts.count > 0 else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "watermarks is required"])
        }
        self.watermarkLayers = try watermarkOpts.map { try WatermarkLayerOptions(dicOpts: $0) }
    }

    static func checkWatermarkParams(_ opts: [AnyHashable: Any], rejecter reject: @escaping RCTPromiseRejectBlock) -> MarkWatermarkOptions? {
        do {
            return try MarkWatermarkOptions(dicOpts: opts)
        } catch let error as NSError {
            reject(error.domain, error.localizedDescription, nil)
            return nil
        }
    }
}
