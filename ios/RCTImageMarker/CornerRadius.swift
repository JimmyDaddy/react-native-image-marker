//
//  CornerRadius.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/9/28.
//

import Foundation
import React

class CornerRadius: NSObject {
    var topLeft: Radius?
    var topRight: Radius?
    var bottomLeft: Radius?
    var bottomRight: Radius?
    var all: Radius?

    init(dicOpts opts: [AnyHashable: Any]) throws {

        for (key, cornerRadius) in opts {
            switch key {
            case "topLeft" as String:
                if Utils.isNULL(cornerRadius) { break; }
                self.topLeft = try Radius(dicOpts: cornerRadius as! [AnyHashable : Any])
            case "topRight" as String:
                if Utils.isNULL(cornerRadius) { break; }
                self.topRight = try Radius(dicOpts: cornerRadius as! [AnyHashable : Any])
            case "bottomLeft" as String:
                if Utils.isNULL(cornerRadius) { break; }
                self.bottomLeft = try Radius(dicOpts: cornerRadius as! [AnyHashable : Any])
            case "bottomRight" as String:
                if Utils.isNULL(cornerRadius) { break; }
                self.bottomRight = try Radius(dicOpts: cornerRadius as! [AnyHashable : Any])
            default:
                if Utils.isNULL(cornerRadius) { break; }
                all = try Radius(dicOpts: cornerRadius as! [AnyHashable : Any])
            }
        }
    }

    func radiusPath(rect: CGRect) -> UIBezierPath {
        let path = UIBezierPath()
        let cornerRadii = self.all?.radii(rect: rect) ?? CGSize(width: 0, height: 0)
        let topLeftRadii = (self.topLeft != nil) ? self.topLeft!.radii(rect: rect) : cornerRadii
        let topRightRadii = (self.topRight != nil) ? self.topRight!.radii(rect: rect) : cornerRadii
        let bottomRightRadii = (self.bottomRight != nil) ? self.bottomRight!.radii(rect: rect) : cornerRadii
        let bottomLeftRadii = (self.bottomLeft != nil) ? self.bottomLeft!.radii(rect: rect) : cornerRadii

        let topLeft = CGPoint(x: rect.minX, y: rect.minY + topLeftRadii.height / 4)
        let topRight = CGPoint(x: rect.maxX, y: rect.minY + topRightRadii.height / 4)
        let bottomRight = CGPoint(x: rect.maxX, y: rect.maxY - bottomRightRadii.height / 4)
        let bottomLeft = CGPoint(x: rect.minX, y: rect.maxY - bottomLeftRadii.height / 4)
        path.move(to: CGPoint(x: rect.minX, y: rect.minY + topLeftRadii.height))
        path.addQuadCurve(to: CGPoint(x: rect.minX + topLeftRadii.width, y: rect.minY), controlPoint: topLeft)
        path.addLine(to: CGPoint(x: rect.maxX - topRightRadii.width, y: rect.minY))
        path.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY + topRightRadii.height), controlPoint: topRight)
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - bottomRightRadii.height))
        path.addQuadCurve(to: CGPoint(x: rect.maxX - bottomRightRadii.width, y: rect.maxY), controlPoint: bottomRight)
        path.addLine(to: CGPoint(x: rect.minX + bottomLeftRadii.width, y: rect.maxY))
        path.addQuadCurve(to: CGPoint(x: rect.minX, y: rect.maxY - bottomLeftRadii.height), controlPoint: bottomLeft)
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + topLeftRadii.height))
        path.close()
        return path
    }
}
