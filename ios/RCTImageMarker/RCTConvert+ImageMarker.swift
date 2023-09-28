//
//  RCTConvert+ImageMarker.swift
//  RCTImageMarker
//
//  Created by Jimmy on 16/7/19.
//

import Foundation
import UIKit
import CoreFoundation
import React

extension RCTConvert {
    static func CGSize(_ json: Any, offset: Int) -> CGSize {
        let arr = self.nsArray(json)
        if arr!.count < offset + 2 {
            NSLog("Too few elements in array (expected at least %zd): %@", 2 + offset, arr!)
            return CoreFoundation.CGSize.zero
        }
        return CoreFoundation.CGSize(width: self.cgFloat(arr![offset]), height: self.cgFloat(arr![offset + 1]))
    }

    static func CGPoint(_ json: Any, offset: Int) -> CGPoint {
        let arr = self.nsArray(json)
        if arr!.count < offset + 2 {
            NSLog("Too few elements in array (expected at least %zd): %@", 2 + offset, arr!)
            return CoreFoundation.CGPoint.zero
        }
        return CoreFoundation.CGPoint(x: self.cgFloat(arr?[offset]), y: self.cgFloat(arr![offset + 1]))
    }

    static func CGRect(_ json: Any, offset: Int) -> CGRect {
        let arr = self.nsArray(json)
        if arr!.count < offset + 4 {
            NSLog("Too few elements in array (expected at least %zd): %@", 4 + offset, arr!)
            return CoreFoundation.CGRect.zero
        }
        return CoreFoundation.CGRect(x: self.cgFloat(arr![offset]), y: self.cgFloat(arr![offset + 1]), width: self.cgFloat(arr![offset + 2]), height: self.cgFloat(arr![offset + 3]))
    }

    static func CGColor(_ json: Any, offset: Int) -> CGColor? {
        let arr = self.nsArray(json)
        if arr!.count < offset + 4 {
            NSLog("Too few elements in array (expected at least %zd): %@", 4 + offset, arr!)
            return nil
        }
        return self.cgColor(arr?[offset..<4])
    }

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
            return MarkerPositionEnum.topLeft
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
