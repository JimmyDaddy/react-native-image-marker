//
//  RCTConvert+ImageMarker.swift
//  RCTImageMarker
//
//  Created by Jimmy on 16/7/19.
//

import Foundation
import UIKit
import React

extension RCTConvert {
    static func MarkerPosition(_ value: Any?) -> MarkerPositionEnum {
        let MyEnumMap: [String: MarkerPositionEnum] = [
            "topLeft": MarkerPositionEnum.topLeft,
            "topRight": MarkerPositionEnum.topRight,
            "topCenter": MarkerPositionEnum.topCenter,
            "center": MarkerPositionEnum.center,
            "bottomCenter": MarkerPositionEnum.bottomCenter,
            "bottomLeft": MarkerPositionEnum.bottomLeft,
            "bottomRight": MarkerPositionEnum.bottomRight,
        ]
        guard let value = value as? String, let mv = MyEnumMap[value] else {
            return MarkerPositionEnum.none
        }
        return mv
    }

    static func UIRectCorner(_ value: [Any] = []) -> UIRectCorner {
        let MyEnumMap: [String: UIRectCorner] = [
            "topLeft": .topLeft,
            "topRight": .topRight,
            "bottomLeft": .bottomLeft,
            "bottomRight": .bottomRight,
            "all": .allCorners,
        ]
        if value.isEmpty { return [.allCorners] }
        var corners: UIRectCorner = []
        for item in value {
            if let corner = item as? String, let rectCorner = MyEnumMap[corner] {
                corners.insert(rectCorner)
            }
        }
        if corners.isEmpty { return [.allCorners] }
        return corners
    }
}
