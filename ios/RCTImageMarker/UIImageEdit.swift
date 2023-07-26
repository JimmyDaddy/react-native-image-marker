//
//  UIImage.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/13.
//

import UIKit

extension UIImage {
    func rotatedImageWithTransformAndCorp(_ rotate: CGFloat, croppedToRect rect: CGRect) -> UIImage {
        let rotation = CGAffineTransform(rotationAngle: rotate * .pi / 180)
        let rotatedImage = rotatedImageWithTransform(rotation)
        
        let scale = rotatedImage.scale
        let cropRect = rect.applying(CGAffineTransform(scaleX: scale, y: scale))
        
        let croppedImage = rotatedImage.cgImage?.cropping(to: cropRect)
        let image = UIImage(cgImage: croppedImage!, scale: self.scale, orientation: rotatedImage.imageOrientation)
        return image
    }
    
    func rotatedImageWithTransform(_ rotate: CGFloat) -> UIImage {
        if rotate == 0 || rotate.isNaN {
            return self;
        }
        let rotation = CGAffineTransform(rotationAngle: rotate * .pi / 180)
        let rotatedImage = rotatedImageWithTransform(rotation)
        return rotatedImage
    }
    
    fileprivate func rotatedImageWithTransform(_ transform: CGAffineTransform) -> UIImage {
        // draw image with transparent background
        let rotatedSize = CGRect(origin: .zero, size: size).applying(transform).integral.size
        let renderer = UIGraphicsImageRenderer(size: rotatedSize, format: UIGraphicsImageRendererFormat())
        let image = renderer.image { context in
            context.cgContext.setFillColor(UIColor.clear.cgColor)
            context.cgContext.fill(CGRect(origin: .zero, size: rotatedSize))
            context.cgContext.setFillColor(UIColor.clear.cgColor)
            context.cgContext.translateBy(x: rotatedSize.width / 2, y: rotatedSize.height / 2)
            context.cgContext.concatenate(transform)
            draw(in: CGRect(x: -size.width / 2, y: -size.height / 2, width: size.width, height: size.height))
        }
        return image
    }
    
    static func transBase64(_ base64Str: String) -> UIImage? {
        let trimmedString = base64Str.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let encodedString = trimmedString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
            let imgURL = URL(string: encodedString),
            let imageData = try? Data(contentsOf: imgURL),
            let image = UIImage(data: imageData) else {
            return nil
        }
        return image
    }
}
