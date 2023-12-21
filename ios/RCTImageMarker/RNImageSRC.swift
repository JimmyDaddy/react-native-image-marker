//
//  RNImageSRC.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/12/21.
//

import Foundation

struct RNImageSRC {
    var width: CGFloat = 0
    var height: CGFloat = 0
    var scale: CGFloat = 1
    var uri: String = ""

    init(dicOpts opts: [AnyHashable: Any]?) {
        width = opts?["width"] as? CGFloat ?? 0
        height = opts?["height"] as? CGFloat ?? 0
        scale = opts?["scale"] as? CGFloat ?? 1
        uri = opts?["uri"] as? String ?? ""
    }
}
