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
    var position: MarkerPositionEnum = .none

    init(dicOpts opts: [AnyHashable: Any]) throws {
        self.imageOption = try ImageOptions(dicOpts: opts)
        let positionOpts = opts["position"] as? [AnyHashable: Any]
        if let positionOpts = positionOpts, !Utils.isNULL(positionOpts) {
            self.X = Utils.handleDynamicToString(v: positionOpts["X"])
            self.Y = Utils.handleDynamicToString(v: positionOpts["Y"])
            self.position = positionOpts["position"] != nil ? RCTConvert.MarkerPosition(positionOpts["position"]) : .none
        }
    }

    init(watermarkImage: ImageOptions, X: String?, Y: String?, position: MarkerPositionEnum) {
        self.imageOption = watermarkImage;
        self.X = X;
        self.Y = Y;
        self.position = position;
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
