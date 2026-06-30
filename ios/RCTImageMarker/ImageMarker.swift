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
    
    func loadImages(with imageOptions: [ImageOptions]) async throws -> [UIImage] {
        let className = "RCTImageLoader"
        let classType: AnyClass? = NSClassFromString(className)
        guard let imageLoader = self.bridge.module(for: classType) as? RCTImageLoader else {
            throw NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to get ImageLoader module"])
        }
        let images = try await withThrowingTaskGroup(of: (Int, UIImage).self) { group in
            for (index, img) in imageOptions.enumerated() {
                group.addTask {
                    try await withUnsafeThrowingContinuation { continuation -> Void in
                        if Utils.isBase64(img.uri) {
                            if let image = UIImage.transBase64(img.uri) {
                                continuation.resume(returning: (index, image))
                            } else {
                                let error = NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])
                                continuation.resume(throwing: error)
                            }
                        } else {
                            guard let request = RCTConvert.nsurlRequest(img.src) else {
                                let error = NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to create URL request for image: \(img.uri)"])
                                continuation.resume(throwing: error)
                                return
                            }
                            imageLoader.loadImage(with: request, size: CGSizeMake(img.rnSrc.width, img.rnSrc.height), scale: img.rnSrc.scale, clipped: false, resizeMode: RCTResizeMode.cover) { progress, total in
                                print("Loading image: \(img.uri) progress: \(progress) total\(total)")
                            } partialLoad: { loadedImage in
                                //
                            } completionBlock: { error, loadedImage in
                                print("Loaded image: ", img.uri)

                                if let loadedImage = loadedImage {
                                    continuation.resume(returning: (index, loadedImage))
                                } else if let error = error {
                                    continuation.resume(throwing: error)
                                } else {
                                    let error = NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])
                                    continuation.resume(throwing: error)
                                }
                            }

//                            imageLoader.loadImage(with: request!) { error, loadedImage in
//                                if let loadedImage = loadedImage {
//                                    continuation.resume(returning: (index, loadedImage))
//                                } else if let error = error {
//                                    continuation.resume(throwing: error)
//                                } else {
//                                    let error = NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])
//                                    continuation.resume(throwing: error)
//                                }
//                            }
                        }
                    }
                }
            }
            var imagesWithIndex: [(Int, UIImage)] = []
            for try await image in group {
                imagesWithIndex.append(image)
            }
            let sortedImagesWithIndex = imagesWithIndex.sorted { $0.0 < $1.0 }
            let images = sortedImagesWithIndex.map { $0.1 }
            return images
        }
        return images
    }

    @objc
    public static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    public static func moduleName() -> String! {
        return "ImageMarker";
    }
    
    func saveImageForMarker(_ image: UIImage, with opts: Options) -> String? {
        let fullPath = generateCacheFilePathForMarker(Utils.getExt(opts.saveFormat), opts.filename)
        if let saveFormat = opts.saveFormat, saveFormat == "base64" {
            let base64String = image.pngData()?.base64EncodedString(options: .lineLength64Characters)
            return "data:image/png;base64,\(base64String ?? "")"
        }
        let data = Utils.isPng(opts.saveFormat) ? image.pngData() : image.jpegData(compressionQuality: CGFloat(opts.quality) / 100.0)
        let fileManager = FileManager.default
        fileManager.createFile(atPath: fullPath, contents: data, attributes: nil)
        return fullPath
    }
    
    func generateCacheFilePathForMarker(_ ext: String?, _ filename: String?) -> String {
        let paths = NSSearchPathForDirectoriesInDomains(.cachesDirectory, .userDomainMask, true)
        let cacheDirectory = paths[0]
        if let filename = filename, !filename.isEmpty {
            if let ext = ext, filename.hasSuffix(ext) {
                return (cacheDirectory as NSString).appendingPathComponent(filename)
            } else {
                let fullName = "\(filename)\(ext ?? "")"
                return (cacheDirectory as NSString).appendingPathComponent(fullName)
            }
        } else {
            let name = UUID().uuidString
            let fullName = "\(name)\(ext ?? "")"
            let fullPath = (cacheDirectory as NSString).appendingPathComponent(fullName)
            return fullPath
        }
    }

    private func markerOrigin(
        position: MarkerPositionEnum,
        offsetX: String?,
        offsetY: String?,
        canvasSize: CGSize,
        itemSize: CGSize
    ) -> CGPoint {
        let margin = CGFloat(20)
        if position == .none {
            return CGPoint(
                x: Utils.parseSpreadValue(v: offsetX, relativeTo: canvasSize.width) ?? margin,
                y: Utils.parseSpreadValue(v: offsetY, relativeTo: canvasSize.height) ?? margin
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

        if let parsedX = Utils.parseSpreadValue(v: offsetX, relativeTo: canvasSize.width) {
            switch position {
            case .topRight, .bottomRight:
                origin.x = canvasSize.width - itemSize.width - parsedX
            case .topCenter, .bottomCenter, .center:
                origin.x = (canvasSize.width - itemSize.width) / 2 + parsedX
            default:
                origin.x = parsedX
            }
        }
        if let parsedY = Utils.parseSpreadValue(v: offsetY, relativeTo: canvasSize.height) {
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
        
    func markImgWithText(_ image: UIImage, _ opts: MarkTextOptions) -> UIImage? {

        var bg = image;
        let w = bg.size.width
        let h = bg.size.height
        UIGraphicsBeginImageContextWithOptions(bg.size, false, opts.backgroundImage.scale)
        
        guard let context = UIGraphicsGetCurrentContext() else {
            return nil
        }
        let canvasRect = CGRect(x: 0, y: 0, width: w, height: h)

        context.saveGState()
        
        let transform = CGAffineTransform(translationX: 0, y: canvasRect.height)
            .scaledBy(x: 1, y: -1)
        context.concatenate(transform)
        if opts.backgroundImage.alpha != 1.0 {
            context.beginTransparencyLayer(auxiliaryInfo: nil)
            context.setAlpha(opts.backgroundImage.alpha)
            context.setBlendMode(.multiply)
            context.draw(bg.cgImage!, in: canvasRect)
            context.endTransparencyLayer()
            context.setBlendMode(.normal)
        } else {
            context.draw(bg.cgImage!, in: canvasRect)
        }
        context.restoreGState()

        
        for textOpts in opts.watermarkTexts {
            context.saveGState()
            var font = textOpts.style.resolvedFont(backgroundWidth: w)
            if textOpts.style.italic && textOpts.style.bold {
                let boldItalicFontDescriptor = font.fontDescriptor.withSymbolicTraits([.traitBold, .traitItalic])
                font = UIFont(descriptor: boldItalicFontDescriptor!, size: font.pointSize)
            } else if textOpts.style.italic {
                let italicFontDescriptor = font.fontDescriptor.withSymbolicTraits(.traitItalic)
                font = UIFont(descriptor: italicFontDescriptor!, size: font.pointSize)
            } else if textOpts.style.bold {
                let boldFontDescriptor = font.fontDescriptor.withSymbolicTraits(.traitBold)
                font = UIFont(descriptor: boldFontDescriptor!, size: font.pointSize)
            }
            
            var attributes: [NSAttributedString.Key: Any] = [
                .font: font as Any,   //设置字体
                .foregroundColor: textOpts.style.color as Any,      //设置字体颜色
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
            
            let attributedText = NSAttributedString(string: textOpts.text, attributes: attributes)
            
            let maxSize = CGSize(width: w, height: h) // 最大宽度和高度
            let textRect = attributedText.boundingRect(with: maxSize, options: .usesLineFragmentOrigin, context: nil)
            let size = textRect.size
            
            let origin = markerOrigin(
                position: textOpts.position,
                offsetX: textOpts.X,
                offsetY: textOpts.Y,
                canvasSize: CGSize(width: w, height: h),
                itemSize: size
            )
            let posX = origin.x
            let posY = origin.y
            
            if textOpts.style.rotate != 0 {
                context.saveGState()
                let rotation = CGAffineTransform(rotationAngle: CGFloat(textOpts.style.rotate) * .pi / 180)
                let textRectWithPos = CGRect(x: CGFloat(posX), y: CGFloat(posY), width: size.width, height: size.height)
                context.translateBy(x: textRectWithPos.midX, y: textRectWithPos.midY)
                context.concatenate(rotation)
                context.translateBy(x: -( textRectWithPos.midX), y: -(textRectWithPos.midY))
            }
            
            if let textBackground = textOpts.style.textBackground {
                let bgEdgeInsets = textBackground.toEdgeInsets(width: CGFloat(w), height: CGFloat(h))
                context.setFillColor(textBackground.colorBg!.cgColor)
                let stretchX = bgEdgeInsets.left + bgEdgeInsets.right;
                let stretchY = bgEdgeInsets.top + bgEdgeInsets.bottom;
                var bgRect = CGRect(x: CGFloat(CGFloat(posX) - bgEdgeInsets.left), y: CGFloat(CGFloat(posY) - bgEdgeInsets.top), width: size.width + stretchX, height: size.height + stretchY)
                if textBackground.typeBg == "stretchX" {
                    bgRect = CGRect(x: 0, y: CGFloat(posY) - bgEdgeInsets.top, width: CGFloat(w), height: size.height + stretchY)
                } else if textBackground.typeBg == "stretchY" {
                    bgRect = CGRect(x: CGFloat(CGFloat(posX) - bgEdgeInsets.left), y: 0, width: size.width + stretchX, height: CGFloat(h))
                }
                
                bgRect.inset(by: bgEdgeInsets)
                
                if !Utils.isNULL(textBackground.cornerRadius) {
                    let path = textBackground.cornerRadius!.radiusPath(rect: bgRect)
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
        
        var aimg = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        aimg = aimg?.rotatedImageWithTransform(opts.backgroundImage.rotate)
        return aimg
    }
    
    func markImage(with image: UIImage, waterImages: [UIImage], options: MarkImageOptions) -> UIImage? {

        let bg = image;
        let w = bg.size.width
        let h = bg.size.height
        UIGraphicsBeginImageContextWithOptions(bg.size, false, options.backgroundImage.scale)
        
        let canvasRect = CGRect(x: 0, y: 0, width: CGFloat(w), height: CGFloat(h))
        let transform = CGAffineTransform(translationX: 0, y: canvasRect.height)
            .scaledBy(x: 1, y: -1)
        var context: CGContext?
        if options.backgroundImage.alpha != 1.0 {
            UIGraphicsBeginImageContextWithOptions(image.size, false, options.backgroundImage.scale)
            context = UIGraphicsGetCurrentContext()
            context?.saveGState()
            context?.concatenate(transform)
            
            context?.beginTransparencyLayer(auxiliaryInfo: nil)
            context?.setAlpha(options.backgroundImage.alpha)
            context?.setBlendMode(.multiply)
        
            context?.draw(image.cgImage!, in: canvasRect)
            context?.endTransparencyLayer()
            context?.setBlendMode(.normal)
            context?.restoreGState()
        } else {
            context = UIGraphicsGetCurrentContext()
            context?.saveGState()
            context?.concatenate(transform)
            context?.draw(image.cgImage!, in: canvasRect)
            context?.restoreGState()
        }
        
        for (index, waterImage) in waterImages.enumerated() {
            context?.saveGState()
            let watermarkOptions = options.watermarkImages[index];
            var markerImg = waterImage;
            if (options.backgroundImage.scale > 0) {
                markerImg = UIImage(cgImage: waterImage.cgImage!, scale: 1 / watermarkOptions.imageOption.scale, orientation: waterImage.imageOrientation)
            }

            let ww = markerImg.size.width
            let wh = markerImg.size.height
            
            let diagonal = sqrt(pow(ww, 2) + pow(wh, 2)) // 计算对角线长度
            let size = CGSize(width: CGFloat(diagonal), height: CGFloat(diagonal))
            let origin = markerOrigin(
                position: watermarkOptions.position,
                offsetX: watermarkOptions.X,
                offsetY: watermarkOptions.Y,
                canvasSize: CGSize(width: w, height: h),
                itemSize: CGSize(width: ww, height: wh)
            )
            var rect = CGRect(origin: origin, size: size)
            
            UIGraphicsBeginImageContextWithOptions(CGSize(width: diagonal, height: diagonal), false, 1)
            let markerContext = UIGraphicsGetCurrentContext()
            markerContext?.saveGState()
            
            if watermarkOptions.imageOption.alpha != 1.0 {
                markerContext?.beginTransparencyLayer(auxiliaryInfo: nil)
                markerContext?.setAlpha(watermarkOptions.imageOption.alpha)
                markerContext?.setBlendMode(.multiply)
                let markerImage = markerImg.rotatedImageWithTransform(watermarkOptions.imageOption.rotate)
                let originPoint = CGPoint(x: 0, y: rect.height - markerImage.size.height)
                markerContext?.draw(markerImage.cgImage!, in: CGRect(origin: originPoint, size: CGSize(width: markerImage.size.width, height: markerImage.size.height)))
                markerContext?.endTransparencyLayer()

            } else {
                let markerImage = markerImg.rotatedImageWithTransform(watermarkOptions.imageOption.rotate)
                let originPoint = CGPoint(x: 0, y: rect.height - markerImage.size.height)
                markerContext?.draw(markerImage.cgImage!, in: CGRect(origin: originPoint, size: CGSize(width: markerImage.size.width, height: markerImage.size.height)))
            }
            markerContext?.restoreGState()

            let waterImageRes = UIGraphicsGetImageFromCurrentImageContext()!
//            if watermarkOptions.imageOption.scale > 0 {
//                rect = CGRect(
//                    x: rect.origin.x,
//                    y: rect.origin.y,
//                    width: rect.size.width * watermarkOptions.imageOption.scale,
//                    height: rect.size.height * watermarkOptions.imageOption.scale
//                )
//            }
            context?.draw(waterImageRes.cgImage!, in: rect)
            UIGraphicsEndImageContext()
            context?.restoreGState()
        }
        
        var newImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        newImage = newImage?.rotatedImageWithTransform(options.backgroundImage.rotate)
        return newImage
    }
    
    @objc(markWithText:resolver:rejecter:)
    func mark(withText opts: [AnyHashable: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        guard let markOpts = MarkTextOptions.checkTextParams(opts, rejecter: rejecter) else {
            return
        }
        Task(priority: .userInitiated) {
            do {
                let images = try await self.loadImages(with: [markOpts.backgroundImage])
                guard let scaledImage = self.markImgWithText(images[0], markOpts) else {
                    rejecter("error", "Failed to render watermarked image", nil)
                    return
                }
                let res = self.saveImageForMarker(scaledImage, with: markOpts)
                resolver(res)
                print("Loaded images: \(images)")
            } catch {
                print("Failed to load images, error: \(error).")
                rejecter("error", error.localizedDescription, error)
            }
        }
    }
    
    @objc(markWithImage:resolver:rejecter:)
    func mark(withImage opts: [AnyHashable: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        guard let markOpts = MarkImageOptions.checkImageParams(opts, rejecter: rejecter) else {
            return
        }
        Task(priority: .userInitiated) {
            do {
                let waterImages = markOpts.watermarkImages.map { $0.imageOption }
                var images = try await self.loadImages(with: [markOpts.backgroundImage] + waterImages)
                guard let scaledImage = self.markImage(with: images.remove(at: 0), waterImages: images, options: markOpts) else {
                    rejecter("error", "Failed to render watermarked image", nil)
                    return
                }
                let res = self.saveImageForMarker(scaledImage, with: markOpts)
                resolver(res)
                print("Loaded images: \(images), waterImages: \(waterImages)")
            } catch {
                print("Failed to load images, error: \(error).")
                rejecter("error", error.localizedDescription, error)
            }
        }
    }
}
