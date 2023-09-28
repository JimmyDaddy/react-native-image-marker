//
//  Radius.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/9/28.
//

import Foundation
import React

class Radius: NSObject {
    var x: String = "0"
    var y: String = "0"
    
    init(dicOpts opts: [AnyHashable: Any]) throws {
        self.x = Utils.handleDynamicToString(v: opts["x"])
        self.y = Utils.handleDynamicToString(v: opts["y"])
    }
    
    convenience override init() {
        self.init()
    }

    func radii(rect: CGRect) -> CGSize {
        let mxRadius = Utils.parseSpreadValue(v: self.x, relativeTo: rect.width)
        let myRadius = Utils.parseSpreadValue(v: self.y, relativeTo: rect.height)
        return CGSize(width: mxRadius ?? 0, height: myRadius ?? 0)
    }    
}
