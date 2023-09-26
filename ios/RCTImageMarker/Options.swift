//
//  Options.swift
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//

import Foundation
import UIKit

class Options: NSObject {
    var backgroundImage: ImageOptions
    var quality: Int = 100
    var saveFormat: String?
    var maxSize: Int?
    var filename: String?

    init(dicOpts opts: [AnyHashable: Any]) throws {
        guard let backgroundImageOpts = opts["backgroundImage"] as? [AnyHashable: Any], !Utils.isNULL(backgroundImageOpts) else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue, code: 0, userInfo: [NSLocalizedDescriptionKey: "backgroundImage is required"])
        }
        self.backgroundImage = try ImageOptions(dicOpts: backgroundImageOpts)
        self.quality = opts["quality"] as? Int ?? 100
        self.saveFormat = opts["saveFormat"] as? String
        self.maxSize = opts["maxSize"] as? Int
        self.filename = opts["fileName"] as? String
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
