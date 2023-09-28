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
                    try await withUnsafeThrowingContinuation { continuation in
                        if Utils.isBase64(img.uri) {
                            if let image = UIImage.transBase64(img.uri) {
                                continuation.resume(returning: (index, image))
                            } else {
                                let error = NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])
                                continuation.resume(throwing: error)
                            }
                        } else {
                            let request = RCTConvert.nsurlRequest(img.src)
                            imageLoader.loadImage(with: request!) { error, loadedImage in
                                if let loadedImage = loadedImage {
                                    continuation.resume(returning: (index, loadedImage))
                                } else if let error = error {
                                    continuation.resume(throwing: error)
                                } else {
                                    let error = NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])
                                    continuation.resume(throwing: error)
                                }
                            }
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
        
    func markerImgWithText(_ image: UIImage, _ opts: MarkTextOptions) -> UIImage? {
       
        var bg = image;
        if (opts.backgroundImage.scale > 0) {
            bg = UIImage(cgImage: image.cgImage!, scale: 1 / opts.backgroundImage.scale, orientation: image.imageOrientation)
        }

        let w = bg.size.width
        let h = bg.size.height
        UIGraphicsBeginImageContextWithOptions(bg.size, false, 1 / opts.backgroundImage.scale)
        
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
            var font = textOpts.style!.font
            if textOpts.style!.italic && textOpts.style!.bold {
                let boldItalicFontDescriptor = textOpts.style!.font!.fontDescriptor.withSymbolicTraits([.traitBold, .traitItalic])
                font = UIFont(descriptor: boldItalicFontDescriptor!, size: font!.pointSize)
            } else if textOpts.style!.italic {
                let italicFontDescriptor = textOpts.style!.font!.fontDescriptor.withSymbolicTraits(.traitItalic)
                font = UIFont(descriptor: italicFontDescriptor!, size: font!.pointSize)
            } else if textOpts.style!.bold {
                let boldFontDescriptor = textOpts.style!.font!.fontDescriptor.withSymbolicTraits(.traitBold)
                font = UIFont(descriptor: boldFontDescriptor!, size: font!.pointSize)
            }
            
            var attributes: [NSAttributedString.Key: Any] = [
                .font: font as Any,   //设置字体
                .foregroundColor: textOpts.style!.color as Any,      //设置字体颜色
            ]
            
            if let shadow = textOpts.style!.shadow {
                attributes[.shadow] = shadow
            }
            if textOpts.style!.underline {
                attributes[.underlineStyle] = NSUnderlineStyle.single.rawValue
            }
            if textOpts.style!.strikeThrough {
                attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue
            }
            if let textAlign = textOpts.style!.textAlign {
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
            if textOpts.style!.skewX != 0 {
                attributes[.obliqueness] = textOpts.style!.skewX
            }
            
            let attributedText = NSAttributedString(string: textOpts.text, attributes: attributes)
            
            let maxSize = CGSize(width: w, height: h) // 最大宽度和高度
            let textRect = attributedText.boundingRect(with: maxSize, options: .usesLineFragmentOrigin, context: nil)
            let size = textRect.size
            
            let margin = CGFloat(20)
            var posX = margin
            var posY = margin
            if textOpts.position != .none {
                switch textOpts.position {
                    case .topLeft:
                        posX = margin
                        posY = margin
                    case .topCenter:
                        posX = CGFloat((w - size.width) / 2)
                    case .topRight:
                        posX = CGFloat(w - size.width - margin)
                    case .bottomLeft:
                        posY = CGFloat(h - size.height - margin)
                    case .bottomCenter:
                        posX = CGFloat((w - size.width) / 2)
                        posY = CGFloat(h - size.height - margin)
                    case .bottomRight:
                        posX = CGFloat(w - size.width - margin)
                        posY = CGFloat(h - size.height - margin)
                    case .center:
                        posX = CGFloat((w - size.width) / 2)
                        posY = CGFloat((h - size.height) / 2)
                    case .none:
                        posX = margin
                        posY = margin
                }
            } else {
                posX = Utils.parseSpreadValue(v: textOpts.X, relativeTo: CGFloat(w)) ?? margin
                posY = Utils.parseSpreadValue(v: textOpts.Y, relativeTo: CGFloat(h)) ?? margin
            }
            
            if textOpts.style!.rotate != 0 {
                context.saveGState()
                let rotation = CGAffineTransform(rotationAngle: CGFloat(textOpts.style!.rotate) * .pi / 180)
                let textRectWithPos = CGRect(x: CGFloat(posX), y: CGFloat(posY), width: size.width, height: size.height)
                context.translateBy(x: textRectWithPos.midX, y: textRectWithPos.midY)
                context.concatenate(rotation)
                context.translateBy(x: -( textRectWithPos.midX), y: -(textRectWithPos.midY))
            }
            
            if let textBackground = textOpts.style!.textBackground {
                let bgEdgeInsets = textOpts.style?.textBackground?.toEdgeInsets(width: CGFloat(w), height: CGFloat(h))
                context.setFillColor(textBackground.colorBg!.cgColor)
                let stretchX = (bgEdgeInsets?.left ?? 0) + (bgEdgeInsets?.right ?? 0);
                let stretchY = (bgEdgeInsets?.top ?? 0) + (bgEdgeInsets?.bottom ?? 0);
                var bgRect = CGRect(x: CGFloat(CGFloat(posX) - (bgEdgeInsets?.left ?? 0)), y: CGFloat(CGFloat(posY) - (bgEdgeInsets?.top ?? 0)), width: size.width + stretchX, height: size.height + stretchY)
                if textBackground.typeBg == "stretchX" {
                    bgRect = CGRect(x: 0, y: CGFloat(posY) - (bgEdgeInsets?.top ?? 0), width: CGFloat(w), height: size.height + stretchY)
                } else if textBackground.typeBg == "stretchY" {
                    bgRect = CGRect(x: CGFloat(CGFloat(posX) - (bgEdgeInsets?.left ?? 0)), y: 0, width: size.width + stretchX, height: CGFloat(h))
                }
                
                bgRect.inset(by: bgEdgeInsets!)
                
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
    
    func markeImage(with image: UIImage, waterImages: [UIImage], options: MarkImageOptions) -> UIImage? {
 
        var bg = image;
        if (options.backgroundImage.scale > 0) {
            bg = UIImage(cgImage: image.cgImage!, scale: 1 / options.backgroundImage.scale, orientation: image.imageOrientation)
        }
        
        let w = bg.size.width
        let h = bg.size.height
        UIGraphicsBeginImageContextWithOptions(bg.size, false, 1 / options.backgroundImage.scale)
        
        let canvasRect = CGRect(x: 0, y: 0, width: CGFloat(w), height: CGFloat(h))
        let transform = CGAffineTransform(translationX: 0, y: canvasRect.height)
            .scaledBy(x: 1, y: -1)
        var context: CGContext?
        if options.backgroundImage.alpha != 1.0 {
            UIGraphicsBeginImageContextWithOptions(image.size, false, 0)
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
            
            let diagonal = sqrt(pow(ww, 2) + pow(ww, 2)) // 计算对角线长度
            let size = CGSize(width: CGFloat(diagonal), height: CGFloat(diagonal))
            var rect: CGRect
            if watermarkOptions.position != .none {
                switch watermarkOptions.position {
                    case .topLeft:
                        rect = CGRect(origin: CGPoint(x: 20, y: 20), size: size)
                    case .topCenter:
                        rect = CGRect(origin: CGPoint(x: (w - size.width) / 2, y: 20), size: size)
                    case .topRight:
                        rect = CGRect(origin: CGPoint(x: w - size.width - 20, y: 20), size: size)
                    case .bottomLeft:
                        rect = CGRect(origin: CGPoint(x: 20, y: h - size.height - 20), size: size)
                    case .bottomCenter:
                        rect = CGRect(origin: CGPoint(x: (w - size.width) / 2, y: h - size.height - 20), size: size)
                    case .bottomRight:
                        rect = CGRect(origin: CGPoint(x: w - size.width - 20, y: h - size.height - 20), size: size)
                    case .center:
                        rect = CGRect(origin: CGPoint(x: (w - size.width) / 2, y: (h - size.height) / 2), size: size)
                    default:
                        rect = CGRect(origin: CGPoint(x: 20, y: 20), size: size)
                    }
            } else {
                rect = CGRect(x: Utils.parseSpreadValue(v: watermarkOptions.X, relativeTo: w) ?? 20, y: Utils.parseSpreadValue(v: watermarkOptions.Y, relativeTo: h) ?? 20, width: CGFloat(ww), height: CGFloat(wh))
            }
            
            UIGraphicsBeginImageContextWithOptions(CGSize(width: diagonal, height: diagonal), false, watermarkOptions.imageOption.scale)
            let markerContext = UIGraphicsGetCurrentContext()
            markerContext?.saveGState()

            if watermarkOptions.imageOption.alpha != 1.0 {
                markerContext?.beginTransparencyLayer(auxiliaryInfo: nil)
                markerContext?.setAlpha(watermarkOptions.imageOption.alpha)
                markerContext?.setBlendMode(.multiply)
                let markerImage = markerImg.rotatedImageWithTransform(watermarkOptions.imageOption.rotate)
                markerContext?.draw(markerImage.cgImage!, in: CGRect(origin: .zero, size: CGSize(width: diagonal, height: diagonal)))
                markerContext?.endTransparencyLayer()

            } else {
                let markerImage = markerImg.rotatedImageWithTransform(watermarkOptions.imageOption.rotate)
                markerContext?.draw(markerImage.cgImage!, in: CGRect(origin: .zero, size: CGSize(width: diagonal, height: diagonal)))
            }
            markerContext?.restoreGState()

            let waterImageRes = UIGraphicsGetImageFromCurrentImageContext()!
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
        let markOpts = MarkTextOptions.checkTextParams(opts, rejecter: rejecter)
        if markOpts === nil {
            rejecter(ErrorDomainEnum.PARAMS_INVALID.rawValue, "opts invalid", nil)
        }
        Task(priority: .userInitiated) {
            do {
                let images = try await loadImages(with: [(markOpts?.backgroundImage)!])
                let scaledImage = self.markerImgWithText(images[0], markOpts!)
                let res = self.saveImageForMarker(scaledImage!, with: markOpts!)
                resolver(res)
                print("Loaded images:", images)
            } catch {
                print("Failed to load images:", error)
            }
        }
    }
    
    @objc(markWithImage:resolver:rejecter:)
    func mark(withImage opts: [AnyHashable: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        let markOpts = MarkImageOptions.checkImageParams(opts, rejecter: rejecter)
        if markOpts === nil {
            rejecter(ErrorDomainEnum.PARAMS_INVALID.rawValue, "opts invalid", nil)
        }
        Task(priority: .userInitiated) {
            do {
                let waterImages = markOpts?.watermarkImages.map { $0.imageOption }
                var images = try await loadImages(with: [(markOpts?.backgroundImage)!] + waterImages!)
                let scaledImage = self.markeImage(with: images.remove(at: 0), waterImages: images, options: markOpts!)
                let res = self.saveImageForMarker(scaledImage!, with: markOpts!)
                resolver(res)
                print("Loaded images:", images)
            } catch {
                print("Failed to load images:", error)
            }
        }
    }
}
