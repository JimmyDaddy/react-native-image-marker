//
//  UIImage.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/13.
//

import UIKit

enum ImageMarkerRotationCanvasMode: String {
    case expand
    case crop
}

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
    let edgeInset: String?
    let trimTransparentPadding: Bool

    init(
        image: UIImage,
        position: ImageMarkerRenderPosition,
        offsetX: String?,
        offsetY: String?,
        scale: CGFloat,
        rotate: CGFloat,
        alpha: CGFloat,
        edgeInset: String? = nil,
        trimTransparentPadding: Bool = false
    ) {
        self.image = image
        self.position = position
        self.offsetX = offsetX
        self.offsetY = offsetY
        self.scale = scale
        self.rotate = rotate
        self.alpha = alpha
        self.edgeInset = edgeInset
        self.trimTransparentPadding = trimTransparentPadding
    }
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
        itemSize: CGSize,
        edgeInset: String? = nil
    ) -> CGPoint {
        if position == .none {
            let fallbackX = max(parseSpreadValue(edgeInset, relativeTo: canvasSize.width) ?? 20, 0)
            let fallbackY = max(parseSpreadValue(edgeInset, relativeTo: canvasSize.height) ?? 20, 0)
            return CGPoint(
                x: parseSpreadValue(offsetX, relativeTo: canvasSize.width) ?? fallbackX,
                y: parseSpreadValue(offsetY, relativeTo: canvasSize.height) ?? fallbackY
            )
        }

        let insetX = max(parseSpreadValue(edgeInset, relativeTo: canvasSize.width) ?? 20, 0)
        let insetY = max(parseSpreadValue(edgeInset, relativeTo: canvasSize.height) ?? 20, 0)
        var origin: CGPoint
        switch position {
        case .topLeft:
            origin = CGPoint(x: insetX, y: insetY)
        case .topCenter:
            origin = CGPoint(x: (canvasSize.width - itemSize.width) / 2, y: insetY)
        case .topRight:
            origin = CGPoint(x: canvasSize.width - itemSize.width - insetX, y: insetY)
        case .bottomLeft:
            origin = CGPoint(x: insetX, y: canvasSize.height - itemSize.height - insetY)
        case .bottomCenter:
            origin = CGPoint(x: (canvasSize.width - itemSize.width) / 2, y: canvasSize.height - itemSize.height - insetY)
        case .bottomRight:
            origin = CGPoint(x: canvasSize.width - itemSize.width - insetX, y: canvasSize.height - itemSize.height - insetY)
        case .center:
            origin = CGPoint(x: (canvasSize.width - itemSize.width) / 2, y: (canvasSize.height - itemSize.height) / 2)
        case .none:
            origin = .zero
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

    private static func normalizedRotation(_ degrees: CGFloat) -> CGFloat {
        guard degrees.isFinite else {
            return 0
        }
        let normalized = degrees.truncatingRemainder(dividingBy: 360)
        if abs(normalized) < 0.000_001 {
            return 0
        }
        return normalized * .pi / 180
    }

    static func rotatedBoundingSize(_ size: CGSize, rotation: CGFloat) -> CGSize {
        let radians = normalizedRotation(rotation)
        guard radians != 0 else {
            return size
        }
        let cosine = abs(cos(radians))
        let sine = abs(sin(radians))
        return CGSize(
            width: size.width * cosine + size.height * sine,
            height: size.width * sine + size.height * cosine
        )
    }

    private static func pixelAlignedCeil(_ value: CGFloat, scale: CGFloat) -> CGFloat {
        let scaledValue = value * scale
        let nearestPixel = scaledValue.rounded()
        if abs(scaledValue - nearestPixel) < 0.000_001 {
            return nearestPixel / scale
        }
        return ceil(scaledValue) / scale
    }

    static func outputSize(
        canvasSize: CGSize,
        rotation: CGFloat,
        mode: ImageMarkerRotationCanvasMode,
        scale: CGFloat
    ) -> CGSize {
        guard mode == .expand else {
            return canvasSize
        }

        let radians = normalizedRotation(rotation)
        guard radians != 0 else {
            return canvasSize
        }

        let renderScale = scale > 0 ? scale : 1
        let cosine = abs(cos(radians))
        let sine = abs(sin(radians))
        return CGSize(
            width: pixelAlignedCeil(canvasSize.width * cosine + canvasSize.height * sine, scale: renderScale),
            height: pixelAlignedCeil(canvasSize.width * sine + canvasSize.height * cosine, scale: renderScale)
        )
    }

    static func scaledCanvasSize(_ size: CGSize, backgroundScale: CGFloat) -> CGSize {
        let scale = backgroundScale.isFinite && backgroundScale > 0 ? backgroundScale : 1
        return CGSize(
            width: max((size.width * scale).rounded(.toNearestOrAwayFromZero), 1),
            height: max((size.height * scale).rounded(.toNearestOrAwayFromZero), 1)
        )
    }

    static func renderCanvas(
        background image: UIImage,
        backgroundScale: CGFloat,
        backgroundRotate: CGFloat,
        backgroundAlpha: CGFloat,
        rotationCanvasMode: ImageMarkerRotationCanvasMode,
        drawLayers: (CGContext, CGSize) -> Void
    ) -> UIImage? {
        // Background scale changes the actual composition canvas, matching Android's
        // logical bitmap size. UIImage.scale describes pixel density, so both @1x and Retina
        // sources must use image.size here. Layer coordinates, font sizes and watermark sizes
        // remain expressed in logical output units and are not implicitly scaled.
        let canvasSize = scaledCanvasSize(image.size, backgroundScale: backgroundScale)
        let renderedSize = outputSize(
            canvasSize: canvasSize,
            rotation: backgroundRotate,
            mode: rotationCanvasMode,
            scale: 1
        )
        UIGraphicsBeginImageContextWithOptions(renderedSize, false, 1)
        defer {
            UIGraphicsEndImageContext()
        }

        guard let context = UIGraphicsGetCurrentContext(), let backgroundImage = image.cgImage else {
            return nil
        }

        context.saveGState()
        let radians = normalizedRotation(backgroundRotate)
        if radians != 0 {
            context.translateBy(x: renderedSize.width / 2, y: renderedSize.height / 2)
            context.rotate(by: radians)
            context.translateBy(x: -canvasSize.width / 2, y: -canvasSize.height / 2)
        }

        drawBackground(
            context: context,
            image: backgroundImage,
            rect: CGRect(origin: .zero, size: canvasSize),
            alpha: backgroundAlpha
        )
        drawLayers(context, canvasSize)
        context.restoreGState()

        return UIGraphicsGetImageFromCurrentImageContext()
    }

    static func renderImageWatermarks(
        background image: UIImage,
        watermarks: [ImageMarkerImageWatermark],
        backgroundScale: CGFloat,
        backgroundRotate: CGFloat,
        backgroundAlpha: CGFloat,
        rotationCanvasMode: ImageMarkerRotationCanvasMode = .expand
    ) -> UIImage? {
        return renderCanvas(
            background: image,
            backgroundScale: backgroundScale,
            backgroundRotate: backgroundRotate,
            backgroundAlpha: backgroundAlpha,
            rotationCanvasMode: rotationCanvasMode
        ) { context, canvasSize in
            for watermark in watermarks {
                drawImageWatermark(context: context, canvasSize: canvasSize, watermark: watermark)
            }
        }
    }

    static func drawBackground(
        context: CGContext,
        image: CGImage,
        rect: CGRect,
        alpha: CGFloat
    ) {
        let transform = CGAffineTransform(translationX: 0, y: rect.height)
            .scaledBy(x: 1, y: -1)

        context.saveGState()
        context.concatenate(transform)
        if alpha != 1.0 {
            context.beginTransparencyLayer(auxiliaryInfo: nil)
            context.setAlpha(alpha)
            context.setBlendMode(.multiply)
            context.draw(image, in: rect)
            context.endTransparencyLayer()
            context.setBlendMode(.normal)
        } else {
            context.draw(image, in: rect)
        }
        context.restoreGState()
    }

    static func drawImageWatermark(
        context: CGContext,
        canvasSize: CGSize,
        watermark: ImageMarkerImageWatermark
    ) {
        let sourceImage = watermark.trimTransparentPadding
            ? watermark.image.trimmingTransparentPadding()
            : watermark.image
        guard let watermarkImage = sourceImage.cgImage else {
            return
        }

        context.saveGState()
        context.interpolationQuality = .none
        let scale = watermark.scale > 0 ? watermark.scale : 1
        let markerSize = CGSize(
            width: sourceImage.size.width * scale,
            height: sourceImage.size.height * scale
        )
        let rotatedSize = rotatedBoundingSize(markerSize, rotation: watermark.rotate)
        let rotatedOrigin = markerOrigin(
            position: watermark.position,
            offsetX: watermark.offsetX,
            offsetY: watermark.offsetY,
            canvasSize: canvasSize,
            itemSize: rotatedSize,
            edgeInset: watermark.edgeInset
        )
        let markerCenter = CGPoint(
            x: rotatedOrigin.x + rotatedSize.width / 2,
            y: rotatedOrigin.y + rotatedSize.height / 2
        )
        let drawMarker = {
            context.saveGState()
            context.translateBy(x: markerCenter.x, y: markerCenter.y)
            if watermark.rotate != 0 {
                context.rotate(by: watermark.rotate * .pi / 180)
            }
            // UIGraphics contexts use a top-left origin while CGContext.draw(_:in:)
            // interprets CGImage pixels in Quartz coordinates. Flip only the image's
            // local coordinate system so its orientation is preserved after scaling
            // and rotation without allocating an intermediate UIImage.
            context.scaleBy(x: 1, y: -1)
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

    static func encodedData(
        for image: UIImage,
        asPNG: Bool,
        jpegQuality: CGFloat,
        matteColor: UIColor
    ) -> Data? {
        if asPNG {
            return image.pngData()
        }
        let quality = min(max(jpegQuality, 0), 1)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = image.scale
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: image.size, format: format)
        return renderer.jpegData(withCompressionQuality: quality) { context in
            matteColor.withAlphaComponent(1).setFill()
            context.fill(CGRect(origin: .zero, size: image.size))
            image.draw(in: CGRect(origin: .zero, size: image.size))
        }
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

    func trimmingTransparentPadding(alphaThreshold: UInt8 = 0) -> UIImage {
        let sourceImage = normalizedForImageMarker()
        guard let cgImage = sourceImage.cgImage else {
            return sourceImage
        }

        let width = cgImage.width
        let height = cgImage.height
        guard width > 0, height > 0 else {
            return sourceImage
        }

        let bytesPerPixel = 4
        let bytesPerRow = width * bytesPerPixel
        let rowsPerTile = min(height, 256)
        var rgbaBytes = [UInt8](repeating: 0, count: rowsPerTile * bytesPerRow)
        var minX = width
        var minY = height
        var maxX = -1
        var maxY = -1
        for tileStart in stride(from: 0, to: height, by: rowsPerTile) {
            let tileHeight = min(rowsPerTile, height - tileStart)
            let didDraw = rgbaBytes.withUnsafeMutableBytes { buffer -> Bool in
                buffer.initializeMemory(as: UInt8.self, repeating: 0)
                guard let tileImage = cgImage.cropping(
                    to: CGRect(x: 0, y: tileStart, width: width, height: tileHeight)
                ) else {
                    return false
                }
                guard let context = CGContext(
                    data: buffer.baseAddress,
                    width: width,
                    height: tileHeight,
                    bitsPerComponent: 8,
                    bytesPerRow: bytesPerRow,
                    space: CGColorSpaceCreateDeviceRGB(),
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
                ) else {
                    return false
                }
                context.draw(
                    tileImage,
                    in: CGRect(x: 0, y: 0, width: width, height: tileHeight)
                )
                return true
            }
            guard didDraw else {
                return sourceImage
            }

            for tileY in 0..<tileHeight {
                let y = tileStart + tileY
                for x in 0..<width where rgbaBytes[tileY * bytesPerRow + x * bytesPerPixel + 3] > alphaThreshold {
                    minX = min(minX, x)
                    minY = min(minY, y)
                    maxX = max(maxX, x)
                    maxY = max(maxY, y)
                }
            }
        }

        guard maxX >= minX, maxY >= minY else {
            return sourceImage
        }
        if minX == 0, minY == 0, maxX == width - 1, maxY == height - 1 {
            return sourceImage
        }

        let cropRect = CGRect(
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        )
        guard let croppedImage = cgImage.cropping(to: cropRect) else {
            return sourceImage
        }
        return UIImage(cgImage: croppedImage, scale: sourceImage.scale, orientation: .up)
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
