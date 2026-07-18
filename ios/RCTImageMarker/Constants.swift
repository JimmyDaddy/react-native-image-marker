//
//  Constants.swift
//  react-native-image-marker
//

import CoreGraphics
import Foundation
//  Created by Jimmydaddy on 2023/8/10.
//

enum ErrorDomainEnum: String {
    case PARAMS_REQUIRED = "com.jimmydaddy.imagemarker.PARAMS_REQUIRED"
    case PARAMS_INVALID = "com.jimmydaddy.imagemarker.PARAMS_INVALID"
    case BASE = "com.jimmydaddy.imagemarker"
}

enum ImageMarkerBlendMode: String {
    case normal
    case multiply
    case screen
    case overlay
    case darken
    case lighten

    var cgBlendMode: CGBlendMode {
        switch self {
        case .normal: return .normal
        case .multiply: return .multiply
        case .screen: return .screen
        case .overlay: return .overlay
        case .darken: return .darken
        case .lighten: return .lighten
        }
    }

    static func resolve(_ value: Any?, fieldName: String = "blendMode") throws -> CGBlendMode {
        guard let value, !Utils.isNULL(value) else {
            return CGBlendMode.normal
        }
        guard let rawValue = value as? String,
              let mode = ImageMarkerBlendMode(rawValue: rawValue) else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "\(fieldName) is not supported: \(String(describing: value))"]
            )
        }
        return mode.cgBlendMode
    }
}
