//
//  MarkTextOptions.swift
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//

import Foundation
import UIKit

class MarkTextOptions: Options {
    var watermarkTexts: [TextOptions] = []

    override init(dicOpts opts: [AnyHashable: Any]) throws {
        try super.init(dicOpts: opts)
        guard let watermarkTextsOpts = opts["watermarkTexts"] as? [[AnyHashable: Any]], watermarkTextsOpts.count > 0 else {
            throw NSError(domain: "PARAMS_REQUIRED", code: 0, userInfo: [NSLocalizedDescriptionKey: "text is required"])
        }
        self.watermarkTexts = try watermarkTextsOpts.map { try TextOptions(dicOpts: $0) }
    }

    static func checkTextParams(_ opts: [AnyHashable: Any], rejecter reject: @escaping RCTPromiseRejectBlock) -> MarkTextOptions? {
        do {
            return try MarkTextOptions(dicOpts: opts)
        } catch let error as NSError {
            reject(error.domain, error.localizedDescription, nil)
            return nil
        }
    }
}

