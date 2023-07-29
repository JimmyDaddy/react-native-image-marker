//
//  UIColorHex.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/14.
//

extension UIColor {
    public convenience init?(hex: String) {
        let str: String? = hex
        if let str = str, str.isEmpty {
            return nil
        } else {
            let r, g, b, a: CGFloat
            
            if hex.hasPrefix("#") {
                let start = hex.index(hex.startIndex, offsetBy: 1)
                let hexColor = String(hex[start...])
                
                if hexColor.count == 8 || hexColor.count == 4 {
                    var newHexStr = ""
                    if hexColor.count == 4 {
                        for char in hexColor {
                            newHexStr += String(repeating: String(char), count: 2)
                        }
                    } else {
                        newHexStr = hexColor
                    }
                    let scanner = Scanner(string: newHexStr)
                    var hexNumber: UInt64 = 0
                    
                    if scanner.scanHexInt64(&hexNumber) {
                        r = CGFloat((hexNumber & 0xff000000) >> 24) / 255
                        g = CGFloat((hexNumber & 0x00ff0000) >> 16) / 255
                        b = CGFloat((hexNumber & 0x0000ff00) >> 8) / 255
                        a = CGFloat(hexNumber & 0x000000ff) / 255
                        
                        self.init(red: r, green: g, blue: b, alpha: a)
                        return
                    }
                } else if hexColor.count == 6 || hexColor.count == 3 {
                    var newHexStr = ""
                    if hexColor.count == 3 {
                        for char in hexColor {
                            newHexStr += String(repeating: String(char), count: 2)
                        }
                    } else {
                        newHexStr = hexColor
                    }
                    let scanner = Scanner(string: newHexStr)
                    var hexNumber: UInt64 = 0
                    
                    if scanner.scanHexInt64(&hexNumber) {
                        r = CGFloat((hexNumber & 0xff0000) >> 16) / 255
                        g = CGFloat((hexNumber & 0x00ff00) >> 8) / 255
                        b = CGFloat((hexNumber & 0x0000ff)) / 255
                        a = 1.0
                        self.init(red: r, green: g, blue: b, alpha: a)
                        return
                    }
                }
            }
            return nil
        }
    }
}
