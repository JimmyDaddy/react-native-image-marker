//
//  Options.swift
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//

import Foundation
import UIKit
import React

class Options: NSObject {
    var backgroundImage: ImageOptions
    var quality: Int = 100
    var saveFormat: String?
    var maxSize: Int?
    var filename: String?
    var matteColor: UIColor = .white
    var rotationCanvasMode: ImageMarkerRotationCanvasMode = .expand

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let backgroundImageOpts = opts["backgroundImage"] as? [AnyHashable: Any], !Utils.isNULL(backgroundImageOpts) else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "backgroundImage is required"])
        }
        self.backgroundImage = try ImageOptions(dicOpts: backgroundImageOpts)
        self.quality = opts["quality"] as? Int ?? 100
        self.saveFormat = opts["saveFormat"] as? String
        self.maxSize = opts["maxSize"] as? Int
        self.filename = opts["filename"] as? String ?? opts["fileName"] as? String

        if let matteColorValue = opts["matteColor"] as? String {
            guard let matteColor = UIColor(hex: matteColorValue) else {
                throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "matteColor is invalid"])
            }
            self.matteColor = matteColor.withAlphaComponent(1)
        }

        if let rotationCanvasModeValue = opts["rotationCanvasMode"] as? String {
            guard let rotationCanvasMode = ImageMarkerRotationCanvasMode(rawValue: rotationCanvasModeValue) else {
                throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "rotationCanvasMode is invalid"])
            }
            self.rotationCanvasMode = rotationCanvasMode
        }
    }

    static func checkParams(_ opts: [AnyHashable: Any], rejecter reject: @escaping RCTPromiseRejectBlock) -> Options? {
        do {
            return try Options(dicOpts: opts)
        } catch let error as NSError {
            reject(error.domain, error.localizedDescription, nil)
            return nil
        }
    }
}
