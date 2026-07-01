//
//  UIImage.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/13.
//

import UIKit

enum ImageMarkerRenderPosition: String {
    case topLeft
    case topCenter
    case topRight
    case bottomLeft
    case bottomCenter
    case bottomRight
    case center
    case none
}

struct ImageMarkerImageWatermark {
    let image: UIImage
    let position: ImageMarkerRenderPosition
    let offsetX: String?
    let offsetY: String?
    let scale: CGFloat
    let rotate: CGFloat
    let alpha: CGFloat
}

enum ImageMarkerRenderer {
    static func parseSpreadValue(_ value: String?, relativeTo length: CGFloat) -> CGFloat? {
        guard let value else { return nil }
        if value.hasSuffix("%") {
            let percent = CGFloat(Double(value.dropLast()) ?? 0) / 100
            return length * percent
        }
        return CGFloat(Double(value) ?? 0)
    }

    static func markerOrigin(
        position: ImageMarkerRenderPosition,
        offsetX: String?,
        offsetY: String?,
        canvasSize: CGSize,
        itemSize: CGSize
    ) -> CGPoint {
        let margin = CGFloat(20)
        if position == .none {
            return CGPoint(
                x: parseSpreadValue(offsetX, relativeTo: canvasSize.width) ?? margin,
                y: parseSpreadValue(offsetY, relativeTo: canvasSize.height) ?? margin
            )
        }

        var origin: CGPoint
        switch position {
        case .topLeft:
            origin = CGPoint(x: margin, y: margin)
        case .topCenter:
            origin = CGPoint(x: (canvasSize.width - itemSize.width) / 2, y: margin)
        case .topRight:
            origin = CGPoint(x: canvasSize.width - itemSize.width - margin, y: margin)
        case .bottomLeft:
            origin = CGPoint(x: margin, y: canvasSize.height - itemSize.height - margin)
        case .bottomCenter:
            origin = CGPoint(x: (canvasSize.width - itemSize.width) / 2, y: canvasSize.height - itemSize.height - margin)
        case .bottomRight:
            origin = CGPoint(x: canvasSize.width - itemSize.width - margin, y: canvasSize.height - itemSize.height - margin)
        case .center:
            origin = CGPoint(x: (canvasSize.width - itemSize.width) / 2, y: (canvasSize.height - itemSize.height) / 2)
        case .none:
            origin = CGPoint(x: margin, y: margin)
        }

        if let parsedX = parseSpreadValue(offsetX, relativeTo: canvasSize.width) {
            switch position {
            case .topRight, .bottomRight:
                origin.x = canvasSize.width - itemSize.width - parsedX
            case .topCenter, .bottomCenter, .center:
                origin.x = (canvasSize.width - itemSize.width) / 2 + parsedX
            default:
                origin.x = parsedX
            }
        }
        if let parsedY = parseSpreadValue(offsetY, relativeTo: canvasSize.height) {
            switch position {
            case .bottomLeft, .bottomCenter, .bottomRight:
                origin.y = canvasSize.height - itemSize.height - parsedY
            case .center:
                origin.y = (canvasSize.height - itemSize.height) / 2 + parsedY
            default:
                origin.y = parsedY
            }
        }
        return origin
    }

    static func renderImageWatermarks(
        background image: UIImage,
        watermarks: [ImageMarkerImageWatermark],
        backgroundScale: CGFloat,
        backgroundRotate: CGFloat,
        backgroundAlpha: CGFloat
    ) -> UIImage? {
        let canvasSize = image.size
        UIGraphicsBeginImageContextWithOptions(canvasSize, false, backgroundScale)
        defer {
            UIGraphicsEndImageContext()
        }

        guard let context = UIGraphicsGetCurrentContext(), let backgroundImage = image.cgImage else {
            return nil
        }

        let canvasRect = CGRect(origin: .zero, size: canvasSize)
        let transform = CGAffineTransform(translationX: 0, y: canvasRect.height)
            .scaledBy(x: 1, y: -1)

        context.saveGState()
        context.concatenate(transform)
        if backgroundAlpha != 1.0 {
            context.beginTransparencyLayer(auxiliaryInfo: nil)
            context.setAlpha(backgroundAlpha)
            context.setBlendMode(.multiply)
            context.draw(backgroundImage, in: canvasRect)
            context.endTransparencyLayer()
            context.setBlendMode(.normal)
        } else {
            context.draw(backgroundImage, in: canvasRect)
        }
        context.restoreGState()

        for watermark in watermarks {
            drawImageWatermark(context: context, canvasSize: canvasSize, watermark: watermark)
        }

        return UIGraphicsGetImageFromCurrentImageContext()?.rotatedImageWithTransform(backgroundRotate)
    }

    static func drawImageWatermark(
        context: CGContext,
        canvasSize: CGSize,
        watermark: ImageMarkerImageWatermark
    ) {
        guard let watermarkImage = watermark.image.cgImage else {
            return
        }

        context.saveGState()
        context.interpolationQuality = .none
        let scale = watermark.scale > 0 ? watermark.scale : 1
        let markerSize = CGSize(
            width: watermark.image.size.width * scale,
            height: watermark.image.size.height * scale
        )
        let origin = markerOrigin(
            position: watermark.position,
            offsetX: watermark.offsetX,
            offsetY: watermark.offsetY,
            canvasSize: canvasSize,
            itemSize: markerSize
        )
        let markerRect = CGRect(origin: origin, size: markerSize)
        let drawMarker = {
            context.saveGState()
            context.translateBy(x: markerRect.midX, y: markerRect.midY)
            if watermark.rotate != 0 {
                context.rotate(by: watermark.rotate * .pi / 180)
            }
            context.draw(
                watermarkImage,
                in: CGRect(
                    x: -markerSize.width / 2,
                    y: -markerSize.height / 2,
                    width: markerSize.width,
                    height: markerSize.height
                )
            )
            context.restoreGState()
        }

        if watermark.alpha != 1.0 {
            context.beginTransparencyLayer(auxiliaryInfo: nil)
            context.setAlpha(watermark.alpha)
            context.setBlendMode(.multiply)
            drawMarker()
            context.endTransparencyLayer()
        } else {
            drawMarker()
        }
        context.restoreGState()
    }
}

extension UIImage {
    func normalizedForImageMarker() -> UIImage {
        guard imageOrientation != .up else {
            return self
        }

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = scale
        format.opaque = false
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        return renderer.image { _ in
            draw(in: CGRect(origin: .zero, size: size))
        }
    }

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
