//
//  RCTImageMarker.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/2.
//

import Foundation
import CoreText
import CoreGraphics
import UIKit
import React

@available(iOS 13.0, *)
@objc(ImageMarker)
public final class ImageMarker: NSObject, RCTBridgeModule {
    public var bridge: RCTBridge!
    private let operationLimiter = ImageMarkerAsyncLimiter(limit: 1)
    
    func loadImages(with imageOptions: [ImageOptions]) async throws -> [UIImage] {
        let className = "RCTImageLoader"
        let classType: AnyClass? = NSClassFromString(className)
        guard let bridge = self.bridge,
              let imageLoader = bridge.module(for: classType) as? RCTImageLoader else {
            throw NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to get ImageLoader module"])
        }
        return try await Utils.sequentialAsyncMap(imageOptions) { img in
            try await self.loadImage(img, using: imageLoader)
        }
    }

    private func loadImage(_ imageOptions: ImageOptions, using imageLoader: RCTImageLoader) async throws -> UIImage {
        if Utils.isBase64(imageOptions.uri) {
            try Task.checkCancellation()
            guard let image = UIImage.transBase64(imageOptions.uri) else {
                throw NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])
            }
            try Task.checkCancellation()
            return image.normalizedForImageMarker()
        }

        guard let request = RCTConvert.nsurlRequest(imageOptions.src) else {
            throw NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to create URL request for image: \(imageOptions.uri)"])
        }
        let loadedImage: UIImage = try await ImageMarkerCancellableContinuation.run { completion in
            return imageLoader.loadImage(
                with: request,
                size: CGSizeMake(imageOptions.rnSrc.width, imageOptions.rnSrc.height),
                scale: imageOptions.rnSrc.scale,
                clipped: false,
                resizeMode: RCTResizeMode.cover
            ) { _, _ in
                // Progress is intentionally ignored.
            } partialLoad: { _ in
                // Partial images are intentionally ignored.
            } completionBlock: { error, image in
                if let image {
                    completion(.success(image))
                } else if let error {
                    completion(.failure(error))
                } else {
                    completion(.failure(NSError(
                        domain: ErrorDomainEnum.BASE.rawValue,
                        code: 3,
                        userInfo: [NSLocalizedDescriptionKey: "Failed to load image"]
                    )))
                }
            }
        }
        try Task.checkCancellation()
        return loadedImage.normalizedForImageMarker()
    }

    @objc
    public static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    public static func moduleName() -> String! {
        return "ImageMarker"
    }
    
    private func markerError(_ message: String) -> NSError {
        return NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }

    func saveImageForMarker(_ image: UIImage, with opts: Options) throws -> String {
        let fullPath = try generateCacheFilePathForMarker(Utils.getExt(opts.saveFormat), opts.filename)
        if let saveFormat = opts.saveFormat, saveFormat == "base64" {
            guard let imageData = image.pngData() else {
                throw markerError("Failed to encode image as PNG")
            }
            return "data:image/png;base64,\(imageData.base64EncodedString(options: .lineLength64Characters))"
        }
        guard let data = ImageMarkerRenderer.encodedData(
            for: image,
            asPNG: Utils.isPng(opts.saveFormat),
            jpegQuality: CGFloat(opts.quality) / 100.0,
            matteColor: opts.matteColor
        ) else {
            throw markerError("Failed to encode image")
        }
        try data.write(to: URL(fileURLWithPath: fullPath), options: .atomic)
        return fullPath
    }
    
    func generateCacheFilePathForMarker(_ ext: String?, _ filename: String?) throws -> String {
        let paths = NSSearchPathForDirectoriesInDomains(.cachesDirectory, .userDomainMask, true)
        let cacheDirectory = paths[0]
        if let filename = filename,
           !filename.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            guard Utils.isSafeOutputFilename(filename) else {
                throw NSError(
                    domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                    code: 0,
                    userInfo: [NSLocalizedDescriptionKey: "filename must be a safe basename"]
                )
            }
            let fullName = Utils.canonicalOutputFilename(filename, ext: ext ?? "")
            return (cacheDirectory as NSString).appendingPathComponent(fullName)
        } else {
            let name = UUID().uuidString
            let fullName = "\(name)\(ext ?? "")"
            let fullPath = (cacheDirectory as NSString).appendingPathComponent(fullName)
            return fullPath
        }
    }

    private func fontWithTraits(_ font: UIFont, bold: Bool, italic: Bool) -> UIFont {
        guard bold || italic else {
            return font
        }

        var traits = font.fontDescriptor.symbolicTraits
        if bold {
            traits.insert(.traitBold)
        }
        if italic {
            traits.insert(.traitItalic)
        }

        guard let descriptor = font.fontDescriptor.withSymbolicTraits(traits) else {
            return font
        }

        return UIFont(descriptor: descriptor, size: font.pointSize)
    }

    private func drawTextWatermark(
        _ textOpts: TextOptions,
        in context: CGContext,
        canvasSize: CGSize
    ) throws {
        let w = canvasSize.width
        let h = canvasSize.height
        let font = fontWithTraits(
            textOpts.style.resolvedFont(backgroundWidth: w),
            bold: textOpts.style.bold,
            italic: textOpts.style.italic
        )

        var attributes: [NSAttributedString.Key: Any] = [
            .font: font as Any,
            .foregroundColor: textOpts.style.color as Any,
        ]

        if let shadow = textOpts.style.shadow {
            attributes[.shadow] = shadow
        }
        if textOpts.style.underline {
            attributes[.underlineStyle] = NSUnderlineStyle.single.rawValue
        }
        if textOpts.style.strikeThrough {
            attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue
        }
        if let textAlign = textOpts.style.textAlign {
            let paragraphStyle = NSMutableParagraphStyle()
            switch textAlign {
            case "right":
                paragraphStyle.alignment = .right
            case "center":
                paragraphStyle.alignment = .center
            default:
                paragraphStyle.alignment = .left
            }
            attributes[.paragraphStyle] = paragraphStyle
        }
        if textOpts.style.skewX != 0 {
            attributes[.obliqueness] = textOpts.style.skewX
        }
        let strokeWidth = textOpts.style.strokeStyle?.width ?? 0
        let outlineInset = strokeWidth / 2
        if let strokeStyle = textOpts.style.strokeStyle, strokeWidth > 0 {
            attributes[.strokeColor] = strokeStyle.color
            attributes[.strokeWidth] = -(strokeWidth / max(font.pointSize, 1) * 100)
        }

        let attributedText = NSAttributedString(string: textOpts.text, attributes: attributes)
        let textRect = attributedText.boundingRect(with: canvasSize, options: .usesLineFragmentOrigin, context: nil)
        let size = textRect.size
        let visualSize = CGSize(
            width: size.width + strokeWidth,
            height: size.height + strokeWidth
        )
        let origins: [CGPoint]
        if let layout = textOpts.layout, layout.isTile {
            let rotatedSize = ImageMarkerRenderer.rotatedBoundingSize(
                visualSize,
                rotation: textOpts.style.rotate
            )
            let visibleOrigins = try layout.placements(
                canvasSize: canvasSize,
                itemSize: rotatedSize
            )
            let insetX = (rotatedSize.width - visualSize.width) / 2
            let insetY = (rotatedSize.height - visualSize.height) / 2
            origins = visibleOrigins.map {
                CGPoint(x: $0.x + insetX, y: $0.y + insetY)
            }
        } else {
            let renderPosition = ImageMarkerRenderPosition(rawValue: textOpts.position.rawValue as String) ?? .none
            origins = [ImageMarkerRenderer.markerOrigin(
                position: renderPosition,
                offsetX: textOpts.X,
                offsetY: textOpts.Y,
                canvasSize: canvasSize,
                itemSize: visualSize,
                edgeInset: textOpts.edgeInset
            )]
        }

        for origin in origins {
            context.saveGState()
            let posX = origin.x + outlineInset
            let posY = origin.y + outlineInset

            if textOpts.style.rotate != 0 {
                let rotation = CGAffineTransform(rotationAngle: CGFloat(textOpts.style.rotate) * .pi / 180)
                let textRectWithPos = CGRect(origin: origin, size: visualSize)
                context.translateBy(x: textRectWithPos.midX, y: textRectWithPos.midY)
                context.concatenate(rotation)
                context.translateBy(x: -(textRectWithPos.midX), y: -(textRectWithPos.midY))
            }

            if let textBackground = textOpts.style.textBackground {
                let bgEdgeInsets = textBackground.toEdgeInsets(width: w, height: h)
                context.setFillColor((textBackground.colorBg ?? UIColor.clear).cgColor)
                let stretchX = bgEdgeInsets.left + bgEdgeInsets.right
                let stretchY = bgEdgeInsets.top + bgEdgeInsets.bottom
                var bgRect = CGRect(
                    x: posX - outlineInset - bgEdgeInsets.left,
                    y: posY - outlineInset - bgEdgeInsets.top,
                    width: size.width + strokeWidth + stretchX,
                    height: size.height + strokeWidth + stretchY
                )
                if textBackground.typeBg == "stretchX" {
                    bgRect = CGRect(
                        x: 0,
                        y: posY - outlineInset - bgEdgeInsets.top,
                        width: w,
                        height: size.height + strokeWidth + stretchY
                    )
                } else if textBackground.typeBg == "stretchY" {
                    bgRect = CGRect(
                        x: posX - outlineInset - bgEdgeInsets.left,
                        y: 0,
                        width: size.width + strokeWidth + stretchX,
                        height: h
                    )
                }

                bgRect.inset(by: bgEdgeInsets)

                if let cornerRadius = textBackground.cornerRadius {
                    let path = cornerRadius.radiusPath(rect: bgRect)
                    context.addPath(path.cgPath)
                    context.fillPath()
                } else {
                    context.fill(bgRect)
                }
            }

            let rect = CGRect(origin: CGPoint(x: posX, y: posY), size: size)
            attributedText.draw(in: rect)
            context.restoreGState()
        }
    }

    func markImgWithText(_ image: UIImage, _ opts: MarkTextOptions) throws -> UIImage? {
        return try ImageMarkerRenderer.renderCanvas(
            background: image,
            backgroundScale: opts.backgroundImage.scale,
            backgroundRotate: opts.backgroundImage.rotate,
            backgroundAlpha: opts.backgroundImage.alpha,
            rotationCanvasMode: opts.rotationCanvasMode
        ) { context, canvasSize in
            for textOpts in opts.watermarkTexts {
                try drawTextWatermark(textOpts, in: context, canvasSize: canvasSize)
            }
        }
    }
    
    func markImage(with image: UIImage, waterImages: [UIImage], options: MarkImageOptions) throws -> UIImage? {
        let watermarks = waterImages.enumerated().compactMap { index, waterImage -> ImageMarkerImageWatermark? in
            guard options.watermarkImages.indices.contains(index) else {
                return nil
            }

            let watermarkOptions = options.watermarkImages[index]
            let position = ImageMarkerRenderPosition(rawValue: watermarkOptions.position.rawValue as String) ?? .none
            return ImageMarkerImageWatermark(
                image: waterImage,
                position: position,
                offsetX: watermarkOptions.X,
                offsetY: watermarkOptions.Y,
                scale: watermarkOptions.imageOption.scale,
                rotate: watermarkOptions.imageOption.rotate,
                alpha: watermarkOptions.imageOption.alpha,
                edgeInset: watermarkOptions.edgeInset,
                trimTransparentPadding: watermarkOptions.trimTransparentPadding,
                layout: watermarkOptions.layout
            )
        }

        return try ImageMarkerRenderer.renderImageWatermarks(
            background: image,
            watermarks: watermarks,
            backgroundScale: options.backgroundImage.scale,
            backgroundRotate: options.backgroundImage.rotate,
            backgroundAlpha: options.backgroundImage.alpha,
            rotationCanvasMode: options.rotationCanvasMode
        )
    }

    func markWatermarks(with image: UIImage, waterImages: [UIImage], options: MarkWatermarkOptions) throws -> UIImage? {
        return try ImageMarkerRenderer.renderCanvas(
            background: image,
            backgroundScale: options.backgroundImage.scale,
            backgroundRotate: options.backgroundImage.rotate,
            backgroundAlpha: options.backgroundImage.alpha,
            rotationCanvasMode: options.rotationCanvasMode
        ) { context, canvasSize in
            var imageIndex = 0
            for layer in options.watermarkLayers {
                switch layer {
                case let .text(textOptions):
                    try drawTextWatermark(textOptions, in: context, canvasSize: canvasSize)
                case let .image(imageOptions):
                    guard waterImages.indices.contains(imageIndex) else {
                        continue
                    }
                    let position = ImageMarkerRenderPosition(rawValue: imageOptions.position.rawValue as String) ?? .none
                    let watermark = ImageMarkerImageWatermark(
                        image: waterImages[imageIndex],
                        position: position,
                        offsetX: imageOptions.X,
                        offsetY: imageOptions.Y,
                        scale: imageOptions.imageOption.scale,
                        rotate: imageOptions.imageOption.rotate,
                        alpha: imageOptions.imageOption.alpha,
                        edgeInset: imageOptions.edgeInset,
                        trimTransparentPadding: imageOptions.trimTransparentPadding,
                        layout: imageOptions.layout
                    )
                    try ImageMarkerRenderer.drawImageWatermark(context: context, canvasSize: canvasSize, watermark: watermark)
                    imageIndex += 1
                }
            }
        }
    }
    
    @objc(markWithText:resolve:reject:)
    func mark(withText opts: [AnyHashable: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
        guard let markOpts = MarkTextOptions.checkTextParams(opts, rejecter: reject) else {
            return
        }
        Task(priority: .userInitiated) {
            do {
                let result = try await self.operationLimiter.withPermit {
                    var images = try await self.loadImages(with: [markOpts.backgroundImage])
                    let renderedImage = try Utils.renderAndReleaseSources(&images) { sources in
                        try self.markImgWithText(sources[0], markOpts)
                    }
                    guard let renderedImage else {
                        throw self.markerError("Failed to render watermarked image")
                    }
                    try Task.checkCancellation()
                    return try self.saveImageForMarker(renderedImage, with: markOpts)
                }
                resolve(result)
            } catch {
                reject("error", error.localizedDescription, error)
            }
        }
    }
    
    @objc(markWithImage:resolve:reject:)
    func mark(withImage opts: [AnyHashable: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
        guard let markOpts = MarkImageOptions.checkImageParams(opts, rejecter: reject) else {
            return
        }
        Task(priority: .userInitiated) {
            do {
                let result = try await self.operationLimiter.withPermit {
                    let waterImages = markOpts.watermarkImages.map { $0.imageOption }
                    var images = try await self.loadImages(with: [markOpts.backgroundImage] + waterImages)
                    let renderedImage = try Utils.renderAndReleaseSources(&images) { sources in
                        try self.markImage(
                            with: sources[0],
                            waterImages: Array(sources.dropFirst()),
                            options: markOpts
                        )
                    }
                    guard let renderedImage else {
                        throw self.markerError("Failed to render watermarked image")
                    }
                    try Task.checkCancellation()
                    return try self.saveImageForMarker(renderedImage, with: markOpts)
                }
                resolve(result)
            } catch {
                reject("error", error.localizedDescription, error)
            }
        }
    }

    @objc(markWithWatermarks:resolve:reject:)
    func mark(withWatermarks opts: [AnyHashable: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
        guard let markOpts = MarkWatermarkOptions.checkWatermarkParams(opts, rejecter: reject) else {
            return
        }
        Task(priority: .userInitiated) {
            do {
                let result = try await self.operationLimiter.withPermit {
                    let waterImages = markOpts.imageLayers.map { $0.imageOption }
                    var images = try await self.loadImages(with: [markOpts.backgroundImage] + waterImages)
                    let renderedImage = try Utils.renderAndReleaseSources(&images) { sources in
                        try self.markWatermarks(
                            with: sources[0],
                            waterImages: Array(sources.dropFirst()),
                            options: markOpts
                        )
                    }
                    guard let renderedImage else {
                        throw self.markerError("Failed to render watermarked image")
                    }
                    try Task.checkCancellation()
                    return try self.saveImageForMarker(renderedImage, with: markOpts)
                }
                resolve(result)
            } catch {
                reject("error", error.localizedDescription, error)
            }
        }
    }
}
