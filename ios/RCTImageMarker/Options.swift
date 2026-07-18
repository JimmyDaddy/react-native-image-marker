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
    var maxSize: Int = 2048
    var filename: String?
    var matteColor: UIColor = .white
    var rotationCanvasMode: ImageMarkerRotationCanvasMode = .expand

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let backgroundImageOpts = opts["backgroundImage"] as? [AnyHashable: Any], !Utils.isNULL(backgroundImageOpts) else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "backgroundImage is required"])
        }
        self.backgroundImage = try ImageOptions(dicOpts: backgroundImageOpts)
        if let rawQuality = opts["quality"], !Utils.isNULL(rawQuality) {
            guard let qualityNumber = rawQuality as? NSNumber,
                  CFGetTypeID(qualityNumber) != CFBooleanGetTypeID() else {
                throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "quality must be an integer between 0 and 100"])
            }
            let qualityValue = qualityNumber.doubleValue
            guard qualityValue.isFinite,
                  qualityValue.rounded(.towardZero) == qualityValue,
                  (0...100).contains(qualityValue) else {
                throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "quality must be an integer between 0 and 100"])
            }
            self.quality = Int(qualityValue)
        }
        self.saveFormat = opts["saveFormat"] as? String
        if let rawMaxSize = opts["maxSize"], !Utils.isNULL(rawMaxSize) {
            guard let maxSizeNumber = rawMaxSize as? NSNumber,
                  CFGetTypeID(maxSizeNumber) != CFBooleanGetTypeID() else {
                throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "maxSize must be a positive finite integer"])
            }
            let maxSizeValue = maxSizeNumber.doubleValue
            guard maxSizeValue.isFinite,
                  maxSizeValue.rounded(.towardZero) == maxSizeValue,
                  let parsedMaxSize = Int(exactly: maxSizeValue),
                  parsedMaxSize > 0 else {
                throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "maxSize must be a positive finite integer"])
            }
            self.maxSize = parsedMaxSize
        }
        self.filename = opts["filename"] as? String ?? opts["fileName"] as? String
        if let filename = self.filename, !Utils.isSafeOutputFilename(filename) {
            throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "filename must be a safe basename"])
        }

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
