//
//  UIColorHex.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/14.
//

import UIKit

extension UIColor {
    public convenience init?(hex: String) {
        guard hex.hasPrefix("#") else {
            return nil
        }
        let value = String(hex.dropFirst())
        let hexadecimalDigits = CharacterSet(charactersIn: "0123456789abcdefABCDEF")
        guard [3, 4, 6, 8].contains(value.count),
              value.unicodeScalars.allSatisfy(hexadecimalDigits.contains) else {
            return nil
        }

        let expanded = value.count <= 4
            ? value.map { "\($0)\($0)" }.joined()
            : value
        let rgba = expanded.count == 6 ? "\(expanded)FF" : expanded
        guard let number = UInt64(rgba, radix: 16) else {
            return nil
        }

        self.init(
            red: CGFloat((number & 0xff000000) >> 24) / 255,
            green: CGFloat((number & 0x00ff0000) >> 16) / 255,
            blue: CGFloat((number & 0x0000ff00) >> 8) / 255,
            alpha: CGFloat(number & 0x000000ff) / 255
        )
    }
}
